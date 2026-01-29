import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:uuid/uuid.dart';
import 'package:echomatch/models/room.dart';
import 'package:echomatch/services/auth_service.dart';
import 'package:echomatch/services/room_service.dart';
import 'package:echomatch/services/question_service.dart';
import 'package:echomatch/theme.dart';
import 'package:echomatch/nav.dart';
import 'package:provider/provider.dart';
import 'package:echomatch/widgets/city_picker_sheet.dart';
import 'package:echomatch/models/question.dart';
import 'package:location_picker_flutter_map/location_picker_flutter_map.dart';
import 'dart:math' as math;

class CreateRoomScreen extends StatefulWidget {
  final String? roomId; // when provided, screen runs in edit mode

  const CreateRoomScreen({super.key, this.roomId});

  @override
  State<CreateRoomScreen> createState() => _CreateRoomScreenState();
}

class _CreateRoomScreenState extends State<CreateRoomScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _addressController = TextEditingController();
  final _roomService = RoomService();
  late final AuthService _authService;
  String? _selectedCity;
  final List<Question> _selectedQuestions = [];

  int _maxParticipants = 10;
  DateTime _scheduledStart = DateTime.now().add(const Duration(hours: 1));
  DateTime? _scheduledEnd;
  bool _isLoading = false;
  bool _isEditing = false;
  Room? _editingRoom;
  Future<void> _openVenuePicker() async {
    debugPrint('[CreateRoom] Open venue picker');
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      builder: (ctx) {
        return SizedBox(
          height: MediaQuery.of(ctx).size.height * 0.75,
          child: FlutterLocationPicker(
            initZoom: 11,
            minZoomLevel: 5,
            maxZoomLevel: 18,
            trackMyPosition: false,
            showSearchBar: true,
            urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            userAgent: 'EchoMatch/1.0 (Dreamflow Flutter)',
            onPicked: (pickedData) {
              try {
                final address = pickedData.address;
                debugPrint('[CreateRoom] Picked address: $address');
                if (mounted) setState(() => _addressController.text = address);
              } catch (e) {
                debugPrint('[CreateRoom] onPicked error: $e');
              } finally {
                Navigator.of(ctx).pop();
              }
            },
          ),
        );
      },
    );
  }

  // Helper to surface errors and always reset loading
  void _fail(String message) {
    debugPrint('[CreateRoom] fail: $message');
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
    setState(() => _isLoading = false);
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    _authService = context.read<AuthService>();
    // Ensure auth state is loaded from disk if needed
    _authService.initialize();
    // Pre-fill city with user's profile city if available
    final city = _authService.currentUser?.city;
    _selectedCity = city;
    _recomputeSuggestedEnd();
    if (widget.roomId != null) {
      _isEditing = true;
      _prefillForEdit();
    }
  }

  int _recommendedQuestions(int participants) => math.max(10, participants);

  int _minDurationMinutes(int participants, int questionCount) => math.max(30, questionCount * 3);

  void _recomputeSuggestedEnd() {
    final questions = _selectedQuestions.length;
    final recommendedMin = _minDurationMinutes(_maxParticipants, math.max(questions, _recommendedQuestions(_maxParticipants)));
    final current = _scheduledEnd;
    final currentMinutes = current == null ? 0 : current.difference(_scheduledStart).inMinutes;
    if (current == null || currentMinutes < recommendedMin) {
      setState(() => _scheduledEnd = _scheduledStart.add(Duration(minutes: recommendedMin)));
    }
  }

  Future<void> _handleCreateRoom() async {
    debugPrint('[CreateRoom] Create pressed');
    if (!_formKey.currentState!.validate()) {
      debugPrint('[CreateRoom] form invalid');
      return;
    }

    setState(() => _isLoading = true);

    final user = _authService.currentUser;
    if (user == null) {
      debugPrint('[CreateRoom] no user, redirecting to login');
      context.go('/login');
      if (mounted) setState(() => _isLoading = false);
      return;
    }

    try {
      if (_selectedCity == null || _selectedCity!.trim().isEmpty) {
        return _fail('Please select a city for this room');
      }

      if (_selectedQuestions.isEmpty) {
        return _fail('Add at least one question to the room');
      }

      // Enforce even participant count
      if (_maxParticipants.isOdd) {
        return _fail('Participants must be an even number.');
      }

      // Venue address (picked via OSM location picker)
      final rawAddress = _addressController.text.trim();
      if (rawAddress.isEmpty) return _fail('Please choose the venue location');

      // Duration and questions minimums
      final minQuestions = _recommendedQuestions(_maxParticipants);
      final chosenQuestions = _selectedQuestions.length;
      if (chosenQuestions < minQuestions) {
        return _fail('Please add at least $minQuestions questions for $_maxParticipants participants.');
      }

      final end = _scheduledEnd ?? _scheduledStart.add(const Duration(minutes: 30));
      final diffMinutes = end.difference(_scheduledStart).inMinutes;
      final minDuration = _minDurationMinutes(_maxParticipants, chosenQuestions);
      if (diffMinutes < minDuration) {
        return _fail('Game must be at least $minDuration minutes long for $_maxParticipants participants.');
      }

      final now = DateTime.now();
      final room = Room(
        id: const Uuid().v4(),
        hostId: user.id,
        city: _selectedCity!,
        title: _titleController.text.trim(),
        description: _descriptionController.text.trim(),
        maxParticipants: _maxParticipants,
        scheduledStart: _scheduledStart,
        scheduledEnd: end,
        createdAt: now,
        updatedAt: now,
        questionIds: _selectedQuestions.map((q) => q.id).toList(),
        venueAddress: rawAddress,
        requiresGenderParity: true,
      );

      debugPrint('[CreateRoom] creating room ${room.id}');
      await _roomService.createRoom(room);

      if (!mounted) return;
      debugPrint('[CreateRoom] navigate to /room/${room.id}');
      context.go('/room/${room.id}');
    } catch (e) {
      debugPrint('[CreateRoom] unexpected error: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to create room. Please try again.')));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _editSchedule() async {
    debugPrint('[CreateRoom] Edit schedule pressed');
    // Compute safe date bounds and clamp initial date to avoid assertion when editing past rooms
    final now = DateTime.now();
    final firstDate = DateTime(now.year, now.month, now.day);
    final lastDate = firstDate.add(const Duration(days: 30));
    DateTime initialDate = _scheduledStart;
    if (initialDate.isBefore(firstDate)) initialDate = firstDate;
    if (initialDate.isAfter(lastDate)) initialDate = lastDate;
    // Pick start date
    final pickedDate = await showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: firstDate,
      lastDate: lastDate,
      initialEntryMode: DatePickerEntryMode.calendarOnly,
      useRootNavigator: true,
      barrierDismissible: true,
    );
    if (pickedDate == null || !mounted) return;

    debugPrint('[CreateRoom] Start date picked: $pickedDate');

    // Pick start time
    final pickedStartTime = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_scheduledStart),
      initialEntryMode: TimePickerEntryMode.input,
      useRootNavigator: true,
    );
    if (pickedStartTime == null || !mounted) return;

    debugPrint('[CreateRoom] Start time picked: ${pickedStartTime.format(context)}');

    final newStart = DateTime(
      pickedDate.year,
      pickedDate.month,
      pickedDate.day,
      pickedStartTime.hour,
      pickedStartTime.minute,
    );

    // Pick end time (same day for simplicity)
    final initialEnd = _scheduledEnd ?? newStart.add(const Duration(minutes: 60));
    TimeOfDay initialEndTime = TimeOfDay.fromDateTime(initialEnd);
    DateTime? newEnd;
    while (true) {
      final pickedEndTime = await showTimePicker(
        context: context,
        initialTime: initialEndTime,
        initialEntryMode: TimePickerEntryMode.input,
        useRootNavigator: true,
      );
      if (pickedEndTime == null || !mounted) return;

      debugPrint('[CreateRoom] End time picked: ${pickedEndTime.format(context)}');

      newEnd = DateTime(
        newStart.year,
        newStart.month,
        newStart.day,
        pickedEndTime.hour,
        pickedEndTime.minute,
      );

      if (!newEnd.isAfter(newStart)) {
        // Disallow selecting an end time earlier than (or equal to) the start
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('End time must be after start time.')));
        // Suggest a valid default next time
        initialEndTime = TimeOfDay.fromDateTime(newStart.add(const Duration(minutes: 30)));
        continue;
      }
      break;
    }

    // Ensure end also meets minimum recommended duration
    final minDur = _minDurationMinutes(_maxParticipants, math.max(_selectedQuestions.length, _recommendedQuestions(_maxParticipants)));
    if (newEnd!.difference(newStart).inMinutes < minDur) {
      debugPrint('[CreateRoom] Adjusting end to meet minimum duration of $minDur minutes');
      newEnd = newStart.add(Duration(minutes: minDur));
    }

    setState(() {
      _scheduledStart = newStart;
      _scheduledEnd = newEnd;
    });
  }

  Future<void> _openCityPicker() async {
    final picked = await CityPickerSheet.show(context, initialQuery: _selectedCity);
    if (picked != null && mounted) setState(() => _selectedCity = picked);
  }

  Future<void> _openQuestionPicker() async {
    final all = await QuestionService().getAllQuestions();
    final selectedIds = _selectedQuestions.map((q) => q.id).toSet();

    // Use a bottom sheet with local state to manage selection
    final result = await showModalBottomSheet<List<String>>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      useSafeArea: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      builder: (ctx) {
        final tempSelected = Set<String>.from(selectedIds);
        return StatefulBuilder(
          builder: (ctx, setLocal) {
            return Padding(
              padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(ctx).bottom),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Padding(
                    padding: AppSpacing.paddingMd,
                    child: Row(
                      children: [
                        Expanded(child: Text('Add Questions', style: Theme.of(ctx).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700))),
                        Text('${tempSelected.length} selected'),
                      ],
                    ),
                  ),
                  const Divider(height: 1),
                  Flexible(
                    child: ListView.separated(
                      shrinkWrap: true,
                      itemBuilder: (_, i) {
                        final q = all[i];
                        final checked = tempSelected.contains(q.id);
                        return CheckboxListTile(
                          value: checked,
                          onChanged: (v) => setLocal(() {
                            if (v == true) {
                              tempSelected.add(q.id);
                            } else {
                              tempSelected.remove(q.id);
                            }
                          }),
                          title: Text(q.questionText, maxLines: 2, overflow: TextOverflow.ellipsis),
                          subtitle: Text('${q.category} • ${q.difficulty.name}'),
                        );
                      },
                      separatorBuilder: (_, __) => const Divider(height: 1),
                      itemCount: all.length,
                    ),
                  ),
                  Padding(
                    padding: AppSpacing.paddingMd,
                    child: Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () => Navigator.of(ctx).pop(),
                            icon: const Icon(Icons.close),
                            label: const Text('Cancel'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: FilledButton.icon(
                            onPressed: () => Navigator.of(ctx).pop(tempSelected.toList()),
                            icon: const Icon(Icons.check),
                            label: const Text('Done'),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );

    if (result != null && mounted) {
      final map = {for (final q in (await QuestionService().getAllQuestions())) q.id: q};
      setState(() {
        _selectedQuestions
          ..clear()
          ..addAll(result.map((id) => map[id]).whereType<Question>());
      });
      _recomputeSuggestedEnd();
    }
  }

  Future<void> _prefillForEdit() async {
    setState(() => _isLoading = true);
    try {
      final room = await _roomService.getRoomById(widget.roomId!);
      if (room == null) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Room not found.')));
        context.pop();
        return;
      }
      _editingRoom = room;
      _titleController.text = room.title;
      _descriptionController.text = room.description;
      _selectedCity = room.city;
      _maxParticipants = room.maxParticipants;
      _scheduledStart = room.scheduledStart;
      _scheduledEnd = room.scheduledEnd;
      _addressController.text = room.venueAddress ?? '';
      // Load questions
      final qService = QuestionService();
      final questions = <Question>[];
      for (final id in room.questionIds) {
        final q = await qService.getQuestionById(id);
        if (q != null) questions.add(q);
      }
      _selectedQuestions
        ..clear()
        ..addAll(questions);
    } catch (e) {
      debugPrint('[EditRoom] prefill failed: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _handleSaveChanges() async {
    debugPrint('[EditRoom] Save pressed');
    if (!_formKey.currentState!.validate() || _editingRoom == null) return;

    setState(() => _isLoading = true);
    try {
      if (_selectedCity == null || _selectedCity!.trim().isEmpty) {
        return _fail('Please select a city for this room');
      }

      if (_selectedQuestions.isEmpty) {
        return _fail('Add at least one question to the room');
      }

      if (_maxParticipants.isOdd) {
        return _fail('Participants must be an even number.');
      }

      final rawAddress = _addressController.text.trim();
      if (rawAddress.isEmpty) return _fail('Please choose the venue location');

      final minQuestions = _recommendedQuestions(_maxParticipants);
      final chosenQuestions = _selectedQuestions.length;
      if (chosenQuestions < minQuestions) {
        return _fail('Please add at least $minQuestions questions for $_maxParticipants participants.');
      }

      final end = _scheduledEnd ?? _scheduledStart.add(const Duration(minutes: 30));
      final diffMinutes = end.difference(_scheduledStart).inMinutes;
      final minDuration = _minDurationMinutes(_maxParticipants, chosenQuestions);
      if (diffMinutes < minDuration) {
        return _fail('Game must be at least $minDuration minutes long for $_maxParticipants participants.');
      }

      final now = DateTime.now();
      final updated = _editingRoom!.copyWith(
        city: _selectedCity,
        title: _titleController.text.trim(),
        description: _descriptionController.text.trim(),
        maxParticipants: _maxParticipants,
        scheduledStart: _scheduledStart,
        scheduledEnd: end,
        updatedAt: now,
        questionIds: _selectedQuestions.map((q) => q.id).toList(),
        venueAddress: rawAddress,
      );

      debugPrint('[EditRoom] updating room ${updated.id}');
      await _roomService.updateRoom(updated);
      if (!mounted) return;
      context.go('/room/${updated.id}');
    } catch (e) {
      debugPrint('[EditRoom] unexpected error: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to save changes. Please try again.')));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_isEditing ? 'Edit Game Room' : 'Create Game Room'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () {
            final router = GoRouter.of(context);
            if (router.canPop()) {
              context.pop();
              return;
            }
            // Fallbacks when there is no back entry (e.g., navigated here via context.go)
            if (_isEditing && _editingRoom != null) {
              context.go('${AppRoutes.roomDetail}/${_editingRoom!.id}');
            } else {
              context.go(AppRoutes.home);
            }
          },
        ),
      ),
      body: SingleChildScrollView(
        padding: AppSpacing.paddingLg,
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('🎮 Host Your Game', style: context.textStyles.headlineMedium?.bold),
              const SizedBox(height: 8),
              Text('Create a trivia room and invite players from your city', style: context.textStyles.bodyMedium?.withColor(Theme.of(context).colorScheme.onSurfaceVariant)),
              const SizedBox(height: 32),
              TextFormField(
                controller: _titleController,
                decoration: const InputDecoration(labelText: 'Room Title', prefixIcon: Icon(Icons.title), border: OutlineInputBorder()),
                validator: (value) => value == null || value.isEmpty ? 'Please enter a title' : null,
              ),
              const SizedBox(height: 20),
              TextFormField(
                controller: _descriptionController,
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'Description', prefixIcon: Icon(Icons.description), border: OutlineInputBorder()),
                validator: (value) => value == null || value.isEmpty ? 'Please enter a description' : null,
              ),
              const SizedBox(height: 20),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Icon(Icons.location_city_outlined, color: Theme.of(context).colorScheme.primary),
                title: const Text('Room City'),
                subtitle: Text(_selectedCity ?? 'Select a city'),
                trailing: TextButton.icon(onPressed: _openCityPicker, icon: const Icon(Icons.edit_location_alt), label: Text(_selectedCity == null ? 'Choose' : 'Change')),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _addressController,
                readOnly: true,
                onTap: _openVenuePicker,
                decoration: InputDecoration(
                  labelText: 'Venue location',
                  prefixIcon: const Icon(Icons.place_outlined),
                  border: const OutlineInputBorder(),
                  hintText: 'Pick location on map',
                  suffixIcon: IconButton(
                    tooltip: 'Pick on map',
                    icon: const Icon(Icons.map_outlined),
                    onPressed: _openVenuePicker,
                  ),
                ),
                validator: (value) => value == null || value.trim().isEmpty ? 'Please pick the venue location' : null,
              ),
              const SizedBox(height: 20),
              Text('Maximum Participants (even only, requires gender parity)', style: context.textStyles.titleSmall?.semiBold),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: Slider(
                      value: _maxParticipants.toDouble(),
                      min: 4,
                      max: 20,
                      divisions: 8, // step of 2 via snapping logic
                      label: '$_maxParticipants',
                      onChanged: (value) {
                        var v = value.round();
                        if (v.isOdd) v = v + 1 > 20 ? v - 1 : v + 1;
                        setState(() => _maxParticipants = v.clamp(4, 20));
                        _recomputeSuggestedEnd();
                      },
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: Theme.of(context).colorScheme.primaryContainer, borderRadius: BorderRadius.circular(8)),
                    child: Text('$_maxParticipants', style: context.textStyles.titleMedium?.bold),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Builder(builder: (_) {
                final recQ = _recommendedQuestions(_maxParticipants);
                final minDur = _minDurationMinutes(_maxParticipants, math.max(_selectedQuestions.length, recQ));
                return Text('Suggested: $recQ+ questions • ≥ $minDur min', style: context.textStyles.labelSmall?.withColor(Theme.of(context).colorScheme.onSurfaceVariant));
              }),
              const SizedBox(height: 20),
              // Consolidated schedule section: pick start and adjust duration (end auto-calculated)
              Card(
                color: Theme.of(context).colorScheme.surfaceContainerHighest,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(children: [
                        const Icon(Icons.schedule),
                        const SizedBox(width: 8),
                        Text('Schedule', style: context.textStyles.titleMedium?.semiBold),
                        const Spacer(),
                        IconButton(
                          tooltip: 'Edit schedule',
                          onPressed: _editSchedule,
                          icon: const Icon(Icons.edit_outlined),
                        ),
                      ]),
                      const SizedBox(height: 12),
                      Text(
                        '${_scheduledStart.month}/${_scheduledStart.day}/${_scheduledStart.year} • ${TimeOfDay.fromDateTime(_scheduledStart).format(context)}',
                        style: context.textStyles.bodyMedium,
                      ),
                      const SizedBox(height: 6),
                      if (_scheduledEnd != null)
                        Text(
                          'Ends • ${TimeOfDay.fromDateTime(_scheduledEnd!).format(context)}',
                          style: context.textStyles.labelSmall?.withColor(Theme.of(context).colorScheme.onSurfaceVariant),
                        ),
                      // Duration slider removed; end time is edited directly via the edit icon.
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Text('Questions (${_selectedQuestions.length})', style: context.textStyles.titleSmall?.semiBold),
              const SizedBox(height: 8),
              if (_selectedQuestions.isEmpty)
                Card(
                  color: Theme.of(context).colorScheme.surfaceContainerHighest,
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(children: [
                      const Icon(Icons.help_outline),
                      const SizedBox(width: 12),
                      Expanded(child: Text('No questions added yet. Tap below to add from our library.')),
                    ]),
                  ),
                )
              else
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _selectedQuestions
                      .map((q) => Chip(
                            label: Text(q.questionText, overflow: TextOverflow.ellipsis),
                            onDeleted: () => setState(() => _selectedQuestions.remove(q)),
                          ))
                      .toList(),
                ),
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerRight,
                child: ElevatedButton.icon(
                  onPressed: _openQuestionPicker,
                  icon: const Icon(Icons.add),
                  label: const Text('Add Question'),
                ),
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: _isLoading ? null : (_isEditing ? _handleSaveChanges : _handleCreateRoom),
                child: _isLoading
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : Text(_isEditing ? 'Save Changes' : 'Create Room'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
