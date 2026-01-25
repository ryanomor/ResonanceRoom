import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:echomatch/models/room.dart';
import 'package:echomatch/models/user.dart';
import 'package:echomatch/services/auth_service.dart';
import 'package:echomatch/services/room_service.dart';
import 'package:echomatch/services/user_service.dart';
import 'package:echomatch/services/match_service.dart';
import 'package:echomatch/theme.dart';
import 'package:intl/intl.dart';
import 'package:echomatch/widgets/city_picker_sheet.dart';
import 'package:echomatch/utils/demo_seed.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _roomService = RoomService();
  final _matchService = MatchService();

  final List<String> _recentCities = [
    'New York',
    'Los Angeles',
    'Chicago',
    'Houston',
    'Miami'
  ];
  String _selectedCity = 'New York';
  List<Room> _rooms = [];
  int _matchCount = 0;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _initialize();
  }

  Future<void> _initialize() async {
    final auth = context.read<AuthService>();
    await auth.initialize();
    if (!mounted) return;

    if (auth.currentUser == null) {
      context.go('/login');
      return;
    }

    setState(() {
      _selectedCity = auth.currentUser!.city;
      _isLoading = true;
    });
    await _loadData();
  }

  Future<void> _seedDemo() async {
    setState(() => _isLoading = true);
    try {
      await DemoSeeder().seedNYC();
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Seeded demo data for NYC')));
    } catch (e) {
      debugPrint('Seeding failed: $e');
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Seeding failed')));
    } finally {
      await _loadData();
    }
  }

  Future<void> _loadData() async {
    final auth = context.read<AuthService>();
    final user = auth.currentUser;
    if (user == null) return;

    setState(() => _isLoading = true);
    final rooms = await _roomService.getRoomsByCity(_selectedCity);
    final matches = await _matchService.getUserMatches(user.id);
    if (!mounted) return;
    setState(() {
      _rooms = rooms;
      _matchCount = matches.length;
      _isLoading = false;
    });
  }

  Future<void> _pickCity() async {
    final selected = await CityPickerSheet.show(context,
        initialQuery: _selectedCity.split(',').first.trim());
    if (!mounted || selected == null) return;

    setState(() {
      _selectedCity = selected;
      final base = selected.split(',').first.trim();
      _recentCities.removeWhere((c) => c.toLowerCase() == base.toLowerCase());
      _recentCities.insert(0, base);
      if (_recentCities.length > 8) _recentCities.removeLast();
    });
    await _loadData();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    if (auth.currentUser == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('Resonance', style: context.textStyles.titleLarge?.bold),
        actions: [
          PopupMenuButton<String>(
            onSelected: (value) {
              if (value == 'seed') _seedDemo();
            },
            itemBuilder: (context) => const [
              PopupMenuItem<String>(
                  value: 'seed', child: Text('Seed Demo Data (NYC)')),
            ],
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadData,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: AppSpacing.paddingMd,
              color: Theme.of(context).colorScheme.primaryContainer,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Hi, ${auth.currentUser!.username}! 👋',
                      style: context.textStyles.headlineSmall?.bold),
                  const SizedBox(height: 8),
                  Text('Play a game, find your next match!',
                      style: context.textStyles.bodyMedium),
                ],
              ),
            ),
            Padding(
              padding: AppSpacing.paddingMd,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.location_city, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                          child: Text('City',
                              style: context.textStyles.titleMedium?.semiBold)),
                      TextButton.icon(
                        onPressed: _pickCity,
                        icon: const Icon(Icons.search),
                        label: const Text('Search'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(_selectedCity.split(',').first.trim(),
                      style: context.textStyles.bodyMedium?.withColor(
                          Theme.of(context).colorScheme.onSurfaceVariant),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 12),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: _recentCities
                          .map((city) => Padding(
                                padding: const EdgeInsets.only(right: 8),
                                child: ChoiceChip(
                                  label: Padding(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 12, vertical: 4),
                                    child: Text(city,
                                        overflow: TextOverflow.ellipsis),
                                  ),
                                  selected: _selectedCity
                                          .split(',')
                                          .first
                                          .trim()
                                          .toLowerCase() ==
                                      city.toLowerCase(),
                                  onSelected: (selected) {
                                    if (selected) {
                                      setState(() => _selectedCity = city);
                                      _loadData();
                                    }
                                  },
                                ),
                              ))
                          .toList(),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _rooms.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.event_busy,
                                  size: 64, color: Colors.grey),
                              const SizedBox(height: 16),
                              Text(
                                  'No rooms available in ${_selectedCity.split(',').first.trim()}',
                                  style: context.textStyles.titleMedium),
                              const SizedBox(height: 24),
                              ElevatedButton.icon(
                                onPressed: () => context.push('/create-room'),
                                icon: const Icon(Icons.add),
                                label: const Text('Create Room'),
                              ),
                            ],
                          ),
                        )
                      : ListView.builder(
                          padding: AppSpacing.paddingMd,
                          itemCount: _rooms.length,
                          itemBuilder: (context, index) => RoomCard(
                              room: _rooms[index],
                              onTap: () async {
                                await context.push('/room/${_rooms[index].id}');
                                _loadData();
                              }),
                        ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          await context.push('/create-room');
          _loadData();
        },
        icon: const Icon(Icons.add),
        label: const Text('Host Game'),
      ),
    );
  }
}

class RoomCard extends StatefulWidget {
  final Room room;
  final VoidCallback onTap;

  const RoomCard({super.key, required this.room, required this.onTap});

  @override
  State<RoomCard> createState() => _RoomCardState();
}

class _RoomCardState extends State<RoomCard> {
  User? _host;

  @override
  void initState() {
    super.initState();
    _loadHost();
  }

  Future<void> _loadHost() async {
    final host = await UserService().getUserById(widget.room.hostId);
    if (mounted) setState(() => _host = host);
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: InkWell(
        onTap: widget.onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: AppSpacing.paddingMd,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.primaryContainer,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(Icons.emoji_events,
                        color: Theme.of(context).colorScheme.primary),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(widget.room.title,
                            style: context.textStyles.titleMedium?.semiBold,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis),
                        const SizedBox(height: 4),
                        Text('Hosted by ${_host?.username ?? 'Loading...'}',
                            style: context.textStyles.bodySmall?.withColor(
                                Theme.of(context)
                                    .colorScheme
                                    .onSurfaceVariant)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(widget.room.description,
                  style: context.textStyles.bodyMedium,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _InfoChip(
                      icon: Icons.people,
                      label:
                          '${widget.room.currentParticipants}/${widget.room.maxParticipants}'),
                  _InfoChip(
                      icon: Icons.schedule,
                      label: DateFormat('MMM d, h:mm a')
                          .format(widget.room.scheduledStart)),
                  if (widget.room.entryFee > 0)
                    _InfoChip(
                        icon: Icons.attach_money,
                        label: '\$${widget.room.entryFee.toStringAsFixed(2)}'),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String label;

  const _InfoChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon,
              size: 16, color: Theme.of(context).colorScheme.onSurfaceVariant),
          const SizedBox(width: 4),
          Text(label, style: context.textStyles.bodySmall),
        ],
      ),
    );
  }
}
