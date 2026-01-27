import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:uuid/uuid.dart';
import 'package:echomatch/models/room.dart';
import 'package:echomatch/models/room_participant.dart';
import 'package:echomatch/models/user.dart';
import 'package:echomatch/services/auth_service.dart';
import 'package:echomatch/services/room_service.dart';
import 'package:echomatch/services/room_participant_service.dart';
import 'package:echomatch/services/user_service.dart';
import 'package:echomatch/services/game_service.dart';
import 'package:echomatch/theme.dart';
import 'package:provider/provider.dart';

class RoomDetailScreen extends StatefulWidget {
  final String roomId;

  const RoomDetailScreen({super.key, required this.roomId});

  @override
  State<RoomDetailScreen> createState() => _RoomDetailScreenState();
}

class _RoomDetailScreenState extends State<RoomDetailScreen> {
  late final AuthService _authService;
  final _roomService = RoomService();
  final _participantService = RoomParticipantService();
  final _userService = UserService();
  late final GameService _gameService;

  Room? _room;
  User? _host;
  RoomParticipant? _myParticipation;
  List<User> _participants = [];
  List<RoomParticipant> _pendingRequests = [];
  bool _isLoading = true;

  String _formatCityShort(String raw) {
    try {
      final parts = raw.split(',').map((p) => p.trim()).where((p) => p.isNotEmpty).toList();
      if (parts.isEmpty) return raw;
      final city = parts.first;

      const Map<String, String> stateAbbr = {
        // US states + DC + PR
        'alabama': 'AL','alaska': 'AK','arizona': 'AZ','arkansas': 'AR','california': 'CA','colorado': 'CO','connecticut': 'CT','delaware': 'DE','florida': 'FL','georgia': 'GA','hawaii': 'HI','idaho': 'ID','illinois': 'IL','indiana': 'IN','iowa': 'IA','kansas': 'KS','kentucky': 'KY','louisiana': 'LA','maine': 'ME','maryland': 'MD','massachusetts': 'MA','michigan': 'MI','minnesota': 'MN','mississippi': 'MS','missouri': 'MO','montana': 'MT','nebraska': 'NE','nevada': 'NV','new hampshire': 'NH','new jersey': 'NJ','new mexico': 'NM','new york': 'NY','north carolina': 'NC','north dakota': 'ND','ohio': 'OH','oklahoma': 'OK','oregon': 'OR','pennsylvania': 'PA','rhode island': 'RI','south carolina': 'SC','south dakota': 'SD','tennessee': 'TN','texas': 'TX','utah': 'UT','vermont': 'VT','virginia': 'VA','washington': 'WA','west virginia': 'WV','wisconsin': 'WI','wyoming': 'WY','district of columbia': 'DC','washington, d.c.': 'DC','puerto rico': 'PR',
        // Canada provinces/territories
        'alberta': 'AB','british columbia': 'BC','manitoba': 'MB','new brunswick': 'NB','newfoundland and labrador': 'NL','nova scotia': 'NS','northwest territories': 'NT','nunavut': 'NU','ontario': 'ON','prince edward island': 'PE','quebec': 'QC','saskatchewan': 'SK','yukon': 'YT',
      };

      String? code;
      for (var i = 1; i < parts.length; i++) {
        final part = parts[i];
        // Already a 2-letter region code
        if (RegExp(r'^[A-Z]{2}$').hasMatch(part)) { code = part; break; }
        final lower = part.toLowerCase();
        if (stateAbbr.containsKey(lower)) { code = stateAbbr[lower]; break; }
        final trimmedCounty = lower.replaceAll(RegExp(r'\s+county$'), '').trim();
        if (stateAbbr.containsKey(trimmedCounty)) { code = stateAbbr[trimmedCounty]; break; }
      }

      return code != null ? '$city, $code' : city;
    } catch (_) {
      return raw;
    }
  }

  @override
  void initState() {
    super.initState();
    _authService = context.read<AuthService>();
    _gameService = context.read<GameService>();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final room = await _roomService.getRoomById(widget.roomId);
      final host = room != null ? await _userService.getUserById(room.hostId) : null;
      final currentUser = _authService.currentUser;

      RoomParticipant? myParticipation;
      final participantUsers = <User>[];
      var pendingRequests = <RoomParticipant>[];

      if (room != null) {
        if (currentUser != null) {
          final approvedParticipants = await _participantService.getApprovedParticipants(room.id);
          for (final p in approvedParticipants) {
            final user = await _userService.getUserById(p.userId);
            if (user != null) participantUsers.add(user);
          }
          myParticipation = await _participantService.getParticipant(room.id, currentUser.id);
          if (room.hostId == currentUser.id) {
            pendingRequests = await _participantService.getPendingRequests(room.id);
          }
        }
      }

      if (!mounted) return;
      setState(() {
        _room = room;
        _host = host;
        _myParticipation = myParticipation;
        _participants = participantUsers;
        _pendingRequests = pendingRequests;
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('Failed to load room details: $e');
      if (!mounted) return;
      setState(() => _isLoading = false);
    }
  }

  Future<void> _requestJoin() async {
    if (_room == null || _authService.currentUser == null) return;

    final now = DateTime.now();
    final participant = RoomParticipant(
      id: const Uuid().v4(),
      roomId: _room!.id,
      userId: _authService.currentUser!.id,
      role: ParticipantRole.player,
      requestedAt: now,
      createdAt: now,
      updatedAt: now,
    );

    await _participantService.createParticipant(participant);
    
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Join request sent!')));
      _loadData();
    }
  }

  Future<void> _approveRequest(RoomParticipant participant) async {
    final updated = participant.copyWith(status: ParticipantStatus.approved, approvedAt: DateTime.now(), updatedAt: DateTime.now());
    await _participantService.updateParticipant(updated);
    _loadData();
  }

  Future<void> _confirmPayment() async {
    if (_myParticipation == null) return;

    final updated = _myParticipation!.copyWith(status: ParticipantStatus.paid, paidAt: DateTime.now(), updatedAt: DateTime.now());
    await _participantService.updateParticipant(updated);

    final currentCount = _participants.length + 1;
    final updatedRoom = _room!.copyWith(currentParticipants: currentCount, updatedAt: DateTime.now());
    await _roomService.updateRoom(updatedRoom);

    _loadData();
  }

  Future<void> _startGame() async {
    if (_room == null) return;

    final updatedRoom = _room!.copyWith(status: RoomStatus.inProgress, actualStart: DateTime.now(), updatedAt: DateTime.now());
    await _roomService.updateRoom(updatedRoom);

    await _gameService.createGameSession(_room!.id, 5);

    if (mounted) context.go('/game/${_room!.id}');
  }

  Future<void> _startTestRun() async {
    if (_room == null) return;
    // Do not change room status; create a test session with fewer questions
    await _gameService.createGameSession(_room!.id, 3, isTest: true);
    if (mounted) context.go('/game/${_room!.id}');
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(appBar: AppBar(), body: const Center(child: CircularProgressIndicator()));
    }
    if (_room == null) {
      return Scaffold(
        appBar: AppBar(),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.meeting_room, size: 48, color: Colors.grey),
              const SizedBox(height: 12),
              Text('Room not found', style: context.textStyles.titleMedium),
              const SizedBox(height: 8),
              TextButton.icon(onPressed: () => context.pop(), icon: const Icon(Icons.arrow_back), label: const Text('Back')),
            ],
          ),
        ),
      );
    }

    final isHost = _authService.currentUser?.id == _room!.hostId;
    final canStart = isHost && _room!.status == RoomStatus.waiting;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Room Details'),
        actions: [
          if (isHost) ...[
            IconButton(
              tooltip: 'Edit room',
              icon: const Icon(Icons.edit),
              onPressed: () => _onEditRoom(),
            ),
            IconButton(
              tooltip: 'Delete room',
              icon: const Icon(Icons.delete_outline),
              onPressed: () => _onDeleteRoom(),
            ),
          ],
        ],
      ),
      body: SingleChildScrollView(
        padding: AppSpacing.paddingLg,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(_room!.title, style: context.textStyles.headlineMedium?.bold),
            const SizedBox(height: 8),
            Text(_room!.description, style: context.textStyles.bodyLarge),
            const SizedBox(height: 24),
            _InfoTile(icon: Icons.person, label: 'Host', value: _host?.username ?? 'Unknown'),
            _InfoTile(icon: Icons.location_city, label: 'City', value: _formatCityShort(_room!.city)),
            _InfoTile(icon: Icons.people, label: 'Participants', value: '${_participants.length}/${_room!.maxParticipants}'),
            const SizedBox(height: 24),
            if (_participants.isNotEmpty) ...[
              Text('Participants', style: context.textStyles.titleMedium?.semiBold),
              const SizedBox(height: 12),
              ..._participants.map((user) => ListTile(
                leading: CircleAvatar(child: Text(user.username.isNotEmpty ? user.username[0] : '?')),
                title: Text(user.username),
                subtitle: Text('@${user.username}'),
              )),
              const SizedBox(height: 24),
            ],
            if (isHost && _pendingRequests.isNotEmpty) ...[
              Text('Pending Requests', style: context.textStyles.titleMedium?.semiBold),
              const SizedBox(height: 12),
              ..._pendingRequests.map((request) => FutureBuilder<User?>(
                future: _userService.getUserById(request.userId),
                builder: (context, snapshot) {
                  final user = snapshot.data;
                  return ListTile(
                    leading: CircleAvatar(child: Text(user?.username.isNotEmpty == true ? user!.username[0] : '?')),
                    title: Text(user?.username ?? 'Loading...'),
                    trailing: ElevatedButton(onPressed: () => _approveRequest(request), child: const Text('Approve')),
                  );
                },
              )),
              const SizedBox(height: 24),
            ],
            if (!isHost && _myParticipation == null)
              ElevatedButton.icon(onPressed: _requestJoin, icon: const Icon(Icons.send), label: const Text('Request to Join')),
            if (!isHost && _myParticipation?.status == ParticipantStatus.pending)
              const Card(child: Padding(padding: EdgeInsets.all(16), child: Text('⏳ Waiting for host approval...'))),
            if (!isHost && _myParticipation?.status == ParticipantStatus.approved)
              ElevatedButton.icon(onPressed: _confirmPayment, icon: const Icon(Icons.check), label: const Text('Confirm Spot')),
            if (!isHost && _myParticipation?.status == ParticipantStatus.paid && _room!.status == RoomStatus.waiting)
              const Card(child: Padding(padding: EdgeInsets.all(16), child: Text('✅ You are in! Waiting for host to start...'))),
            if (!isHost && _myParticipation?.status == ParticipantStatus.paid && _room!.status == RoomStatus.inProgress)
              ElevatedButton.icon(onPressed: () => context.go('/game/${_room!.id}'), icon: const Icon(Icons.play_arrow), label: const Text('Join Game')),
            if (isHost && _room!.status == RoomStatus.inProgress)
              ElevatedButton.icon(onPressed: () => context.go('/game/${_room!.id}'), icon: const Icon(Icons.play_arrow), label: const Text('Enter Game')),
            if (canStart)
              ElevatedButton.icon(onPressed: _startGame, icon: const Icon(Icons.play_arrow), label: const Text('Start Game')),
            if (isHost && _room!.status == RoomStatus.waiting) ...[
              const SizedBox(height: 8),
              OutlinedButton.icon(onPressed: _startTestRun, icon: const Icon(Icons.science), label: const Text('Test Run')),
            ],
            if (isHost) ...[
              const SizedBox(height: 12),
              Row(children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _onEditRoom,
                    icon: const Icon(Icons.edit),
                    label: const Text('Edit'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton.icon(
                    style: FilledButton.styleFrom(backgroundColor: Theme.of(context).colorScheme.error),
                    onPressed: _onDeleteRoom,
                    icon: const Icon(Icons.delete_outline, color: Colors.white),
                    label: const Text('Delete'),
                  ),
                ),
              ]),
            ],
          ],
        ),
      ),
    );
  }

  void _onEditRoom() {
    if (_room == null) return;
    context.go('/edit-room/${_room!.id}');
  }

  Future<void> _onDeleteRoom() async {
    if (_room == null) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete room?'),
        content: const Text('This action cannot be undone. All join requests will be cleared.'),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Cancel')),
          FilledButton.icon(onPressed: () => Navigator.of(ctx).pop(true), icon: const Icon(Icons.delete_outline), label: const Text('Delete')),
        ],
      ),
    );
    if (confirmed != true) return;

    try {
      await _participantService.deleteParticipantsForRoom(_room!.id);
      await _roomService.deleteRoom(_room!.id);
      if (!mounted) return;
      context.go('/home');
    } catch (e) {
      debugPrint('Failed to delete room: $e');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to delete room. Please try again.')));
    }
  }
}

class _InfoTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _InfoTile({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, color: Theme.of(context).colorScheme.primary),
          const SizedBox(width: 12),
          Text('$label:', style: context.textStyles.bodyMedium?.semiBold),
          const SizedBox(width: 8),
          Expanded(child: Text(value, style: context.textStyles.bodyMedium, maxLines: 1, overflow: TextOverflow.ellipsis)),
        ],
      ),
    );
  }
}
