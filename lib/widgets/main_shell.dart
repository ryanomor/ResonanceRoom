import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:echomatch/services/auth_service.dart';
import 'package:echomatch/services/match_service.dart';
import 'package:echomatch/services/chat_service.dart';
import 'package:echomatch/services/notification_service.dart';
import 'package:echomatch/models/match.dart';

/// MainShell renders a persistent bottom NavigationBar and the routed child.
class MainShell extends StatelessWidget {
  final Widget child;
  const MainShell({super.key, required this.child});

  int _indexForLocation(String location) {
    // Normalize query params/fragments
    if (location.contains('?')) location = location.split('?').first;
    if (location.contains('#')) location = location.split('#').first;

    if (location.startsWith('/matches') || location.startsWith('/chat')) return 1;
    if (location.startsWith('/notifications')) return 2;
    if (location.startsWith('/profile')) return 3;

    // Default bucket for home and flows: home, room, game, create-room
    return 0;
  }

  void _onDestinationSelected(BuildContext context, int index) {
    switch (index) {
      case 0:
        context.go('/home');
        break;
      case 1:
        context.go('/matches');
        break;
      case 2:
        context.go('/notifications');
        break;
      case 3:
        context.go('/profile');
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).uri.toString();
    final selectedIndex = _indexForLocation(location);

    return Scaffold(
      body: SafeArea(top: false, child: child),
      bottomNavigationBar: NavigationBar(
        selectedIndex: selectedIndex,
        onDestinationSelected: (i) => _onDestinationSelected(context, i),
        destinations: [
          const NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
          NavigationDestination(
            icon: _MatchesIconWithBadge(),
            selectedIcon: _MatchesIconWithBadge(selected: true),
            label: 'Matches',
          ),
          NavigationDestination(
            icon: _NotificationsIconWithBadge(),
            selectedIcon: _NotificationsIconWithBadge(selected: true),
            label: 'Notifications',
          ),
          const NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }
}

class _DotBadge extends StatelessWidget {
  final Widget child;
  final bool show;
  const _DotBadge({required this.child, required this.show});

  @override
  Widget build(BuildContext context) {
    if (!show) return child;
    return Stack(clipBehavior: Clip.none, children: [
      child,
      Positioned(
        right: -2,
        top: -2,
        child: Container(width: 8, height: 8, decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle)),
      ),
    ]);
  }
}

class _MatchesIconWithBadge extends StatelessWidget {
  final bool selected;
  const _MatchesIconWithBadge({this.selected = false});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final user = auth.currentUser;
    return FutureBuilder<bool>(
      future: _hasMatchesBadge(context, user?.id),
      builder: (context, snapshot) {
        final show = snapshot.data == true;
        final icon = selected ? const Icon(Icons.favorite) : const Icon(Icons.favorite_outline);
        return _DotBadge(child: icon, show: show);
      },
    );
  }

  Future<bool> _hasMatchesBadge(BuildContext context, String? userId) async {
    if (userId == null) return false;
    try {
      final matchService = context.read<MatchService>();
      final chatService = context.read<ChatService>();
      final matches = await matchService.getUserMatches(userId);
      final hasNewMatch = matches.any((m) => m.status == MatchStatus.active && m.firstChatAt == null);
      if (hasNewMatch) return true;
      for (final m in matches) {
        final unread = await chatService.getUnreadCount(m.id, userId);
        if (unread > 0) return true;
      }
      return false;
    } catch (e) {
      debugPrint('hasMatchesBadge error: $e');
      return false;
    }
  }
}

class _NotificationsIconWithBadge extends StatelessWidget {
  final bool selected;
  const _NotificationsIconWithBadge({this.selected = false});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final user = auth.currentUser;
    return FutureBuilder<int>(
      future: user == null ? Future.value(0) : NotificationService().countNewNotifications(user),
      builder: (context, snapshot) {
        final show = (snapshot.data ?? 0) > 0;
        final icon = selected ? const Icon(Icons.notifications) : const Icon(Icons.notifications_none_outlined);
        return _DotBadge(child: icon, show: show);
      },
    );
  }
}
