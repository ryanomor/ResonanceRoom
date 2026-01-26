import 'package:echomatch/models/app_notification.dart';
import 'package:echomatch/models/room.dart';
import 'package:echomatch/models/room_participant.dart';
import 'package:echomatch/models/user.dart' as app_user;
import 'package:echomatch/services/room_participant_service.dart';
import 'package:echomatch/services/room_service.dart';
import 'package:flutter/foundation.dart';

class NotificationService {
  final _participantService = RoomParticipantService();
  final _roomService = RoomService();

  static const Duration newWindow = Duration(hours: 24);
  static const Duration startingSoonWindow = Duration(hours: 2);

  Future<List<AppNotification>> fetchNotificationsForUser(app_user.User user) async {
    try {
      final now = DateTime.now();
      final cutoff = now.subtract(newWindow);
      final notifs = <AppNotification>[];

      // 1) Join request updates (approved/rejected within last 24h)
      final participants = await _participantService.getParticipantsByUser(user.id);
      for (final p in participants) {
        final isDecision = p.status == ParticipantStatus.approved || p.status == ParticipantStatus.rejected || p.status == ParticipantStatus.paid || p.status == ParticipantStatus.inGame;
        final decisionAt = p.updatedAt;
        if (isDecision && decisionAt.isAfter(cutoff)) {
          final title = p.status == ParticipantStatus.rejected
              ? 'Join request rejected'
              : (p.status == ParticipantStatus.approved ? 'Join request approved' : 'You\'re in the game');
          final stableId = 'join:${p.id}:${p.status.name}:${decisionAt.millisecondsSinceEpoch}';
          notifs.add(AppNotification(
            id: stableId,
            type: AppNotificationType.joinRequestUpdate,
            title: title,
            message: 'Room ${p.roomId}',
            createdAt: decisionAt,
            updatedAt: decisionAt,
          ));
        }
      }

      // 2) Game starting soon for approved/paid/inGame
      final soonCutoff = now.add(startingSoonWindow);
      final relevant = participants.where((p) => p.status == ParticipantStatus.approved || p.status == ParticipantStatus.paid || p.status == ParticipantStatus.inGame);
      for (final p in relevant) {
        final room = await _roomService.getRoomById(p.roomId);
        if (room == null) continue;
        if (room.scheduledStart.isAfter(now) && room.scheduledStart.isBefore(soonCutoff)) {
          final stableId = 'start_soon:${room.id}:${room.scheduledStart.millisecondsSinceEpoch}';
          notifs.add(AppNotification(
            id: stableId,
            type: AppNotificationType.gameStartingSoon,
            title: 'Game starting soon',
            message: '${room.title} in ${room.city} starts at ${room.scheduledStart.toLocal()}',
            createdAt: now,
            updatedAt: now,
          ));
        }
      }

      // 3) New game in favorited cities (created in last 24h)
      if (user.favoriteCities.isNotEmpty) {
        final rooms = await _roomService.getAllRooms();
        final favKeys = user.favoriteCities.map((c) => c.split(',').first.trim().toLowerCase()).toSet();
        for (final r in rooms) {
          final key = r.city.split(',').first.trim().toLowerCase();
          if (favKeys.contains(key) && r.createdAt.isAfter(cutoff)) {
            final stableId = 'new_city_game:${r.id}';
            notifs.add(AppNotification(
              id: stableId,
              type: AppNotificationType.newCityGame,
              title: 'New game in ${r.city}',
              message: r.title,
              createdAt: r.createdAt,
              updatedAt: r.updatedAt,
            ));
          }
        }
      }

      // Filter out dismissed notifications for this user
      final dismissed = user.dismissedNotificationIds.toSet();
      final filtered = notifs.where((n) => !dismissed.contains(n.id)).toList();

      // Sort newest first
      filtered.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      return filtered;
    } catch (e) {
      debugPrint('fetchNotificationsForUser error: $e');
      return [];
    }
  }

  Future<int> countNewNotifications(app_user.User user) async {
    final list = await fetchNotificationsForUser(user);
    final seenAt = user.lastNotificationsSeenAt ?? DateTime.fromMillisecondsSinceEpoch(0);
    return list.where((n) => n.createdAt.isAfter(seenAt)).length;
  }
}
