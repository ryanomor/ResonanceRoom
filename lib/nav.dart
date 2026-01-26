import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:echomatch/screens/auth/login_screen.dart';
import 'package:echomatch/screens/auth/signup_screen.dart';
import 'package:echomatch/screens/home/home_screen.dart';
import 'package:echomatch/screens/room/create_room_screen.dart';
import 'package:echomatch/screens/room/room_detail_screen.dart';
import 'package:echomatch/screens/game/game_screen.dart';
import 'package:echomatch/screens/matches/matches_screen.dart';
import 'package:echomatch/screens/profile/profile_screen.dart';
import 'package:echomatch/screens/chat/chat_screen.dart';
import 'package:echomatch/screens/notifications/notifications_screen.dart';
import 'package:echomatch/widgets/main_shell.dart';

class AppRouter {
  static final GoRouter router = GoRouter(
    initialLocation: AppRoutes.login,
    routes: [
      GoRoute(
        path: AppRoutes.login,
        name: 'login',
        pageBuilder: (context, state) => const NoTransitionPage(child: LoginScreen()),
      ),
      GoRoute(
        path: AppRoutes.signup,
        name: 'signup',
        pageBuilder: (context, state) => const NoTransitionPage(child: SignUpScreen()),
      ),
      ShellRoute(
        builder: (context, state, child) => MainShell(child: child),
        routes: [
          GoRoute(
            path: AppRoutes.home,
            name: 'home',
            pageBuilder: (context, state) => const NoTransitionPage(child: HomeScreen()),
          ),
          GoRoute(
            path: AppRoutes.createRoom,
            name: 'create-room',
            pageBuilder: (context, state) => const NoTransitionPage(child: CreateRoomScreen()),
          ),
          GoRoute(
            path: '${AppRoutes.editRoom}/:roomId',
            name: 'edit-room',
            pageBuilder: (context, state) {
              final roomId = state.pathParameters['roomId']!;
              return NoTransitionPage(child: CreateRoomScreen(roomId: roomId));
            },
          ),
          GoRoute(
            path: '${AppRoutes.roomDetail}/:roomId',
            name: 'room-detail',
            pageBuilder: (context, state) {
              final roomId = state.pathParameters['roomId']!;
              return NoTransitionPage(child: RoomDetailScreen(roomId: roomId));
            },
          ),
          GoRoute(
            path: '${AppRoutes.game}/:roomId',
            name: 'game',
            pageBuilder: (context, state) {
              final roomId = state.pathParameters['roomId']!;
              return NoTransitionPage(child: GameScreen(roomId: roomId));
            },
          ),
          GoRoute(
            path: AppRoutes.matches,
            name: 'matches',
            pageBuilder: (context, state) => const NoTransitionPage(child: MatchesScreen()),
          ),
          GoRoute(
            path: AppRoutes.notifications,
            name: 'notifications',
            pageBuilder: (context, state) => const NoTransitionPage(child: NotificationsScreen()),
          ),
          GoRoute(
            path: AppRoutes.profile,
            name: 'profile',
            pageBuilder: (context, state) => const NoTransitionPage(child: ProfileScreen()),
          ),
          GoRoute(
            path: '${AppRoutes.chat}/:matchId',
            name: 'chat',
            pageBuilder: (context, state) {
              final matchId = state.pathParameters['matchId']!;
              return NoTransitionPage(child: ChatScreen(matchId: matchId));
            },
          ),
        ],
      ),
    ],
  );
}

class AppRoutes {
  static const String login = '/login';
  static const String signup = '/signup';
  static const String home = '/home';
  static const String createRoom = '/create-room';
  static const String editRoom = '/edit-room';
  static const String roomDetail = '/room';
  static const String game = '/game';
  static const String matches = '/matches';
  static const String notifications = '/notifications';
  static const String profile = '/profile';
  static const String chat = '/chat';
}
