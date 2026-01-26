import 'package:echomatch/models/app_notification.dart';
import 'package:echomatch/services/auth_service.dart';
import 'package:echomatch/services/notification_service.dart';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:provider/provider.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<AppNotification> _items = const [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final auth = context.read<AuthService>();
    final user = auth.currentUser;
    if (user == null) {
      setState(() {
        _items = const [];
        _loading = false;
      });
      return;
    }
    try {
      // Mark seen first so the badge clears immediately after entering this screen.
      await auth.markNotificationsSeenNow();
      final items = await NotificationService().fetchNotificationsForUser(auth.currentUser!);
      if (!mounted) return;
      setState(() {
        _items = items;
        _loading = false;
      });
    } catch (e) {
      debugPrint('Notifications load failed: $e');
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  Future<void> _dismiss(AppNotification n) async {
    try {
      await context.read<AuthService>().dismissNotification(n.id);
      if (!mounted) return;
      setState(() => _items = _items.where((x) => x.id != n.id).toList());
    } catch (e) {
      debugPrint('Dismiss notification failed: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final user = auth.currentUser;

    return Scaffold(
      appBar: AppBar(title: const Text('Notifications')),
      body: user == null
          ? const Center(child: Text('Sign in to view notifications'))
          : _loading
              ? const Center(child: CircularProgressIndicator())
              : _items.isEmpty
                  ? const Center(child: Text("You're all caught up!"))
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemBuilder: (context, index) {
                        final n = _items[index];
                        final icon = _iconForType(n.type);
                        return ListTile(
                          leading: CircleAvatar(child: Icon(icon)),
                          title: Text(n.title, maxLines: 1, overflow: TextOverflow.ellipsis),
                          subtitle: n.message != null ? Text(n.message!, maxLines: 2, overflow: TextOverflow.ellipsis) : null,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          trailing: IconButton(
                            icon: const Icon(Icons.close, color: Colors.red),
                            tooltip: 'Dismiss',
                            onPressed: () => _dismiss(n),
                          ),
                        );
                      },
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemCount: _items.length,
                    ),
    );
  }

  IconData _iconForType(AppNotificationType t) {
    switch (t) {
      case AppNotificationType.gameStartingSoon:
        return Icons.timer_outlined;
      case AppNotificationType.joinRequestUpdate:
        return Icons.how_to_reg_outlined;
      case AppNotificationType.newCityGame:
        return Icons.location_city_outlined;
    }
  }
}
