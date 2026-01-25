import 'package:flutter/foundation.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:uuid/uuid.dart';
import 'package:echomatch/models/chat_message.dart';

class ChatService extends ChangeNotifier {
  final _db = FirebaseFirestore.instance;

  Future<List<ChatMessage>> getMessagesForMatch(String matchId) async {
    try {
      final snap = await _db
          .collection('chatMessages')
          .where('matchId', isEqualTo: matchId)
          .orderBy('sentAt')
          .get();
      return snap.docs.map(_fromDoc).toList();
    } catch (e) {
      debugPrint('Failed to load messages for match $matchId: $e');
      return [];
    }
  }

  Future<void> sendMessage(String matchId, String senderId, String messageText) async {
    final message = ChatMessage(
      id: const Uuid().v4(),
      matchId: matchId,
      senderId: senderId,
      messageText: messageText,
      sentAt: DateTime.now(),
      createdAt: DateTime.now(),
    );

    try {
      final ref = _db.collection('chatMessages').doc();
      final withId = message.copyWith(id: ref.id);
      await ref.set(_toMap(withId));
    } catch (e) {
      debugPrint('Failed to send message: $e');
      rethrow;
    }
    notifyListeners();
  }

  Future<void> markAsRead(String messageId) async {
    try {
      await _db.collection('chatMessages').doc(messageId).set({'readAt': DateTime.now().toIso8601String()}, SetOptions(merge: true));
      notifyListeners();
    } catch (e) {
      debugPrint('Failed to mark message read: $e');
    }
  }

  Future<int> getUnreadCount(String matchId, String userId) async {
    try {
      final snap = await _db
          .collection('chatMessages')
          .where('matchId', isEqualTo: matchId)
          .where('readAt', isNull: true)
          .get();
      return snap.docs.map(_fromDoc).where((m) => m.senderId != userId).length;
    } catch (e) {
      debugPrint('Failed to get unread count: $e');
      return 0;
    }
  }

  ChatMessage _fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final d = doc.data() ?? {};
    final json = {
      'id': d['id'] ?? doc.id,
      'matchId': d['matchId'],
      'senderId': d['senderId'],
      'messageText': d['messageText'],
      'sentAt': _dateToIso(d['sentAt']),
      'readAt': d['readAt'] != null ? _dateToIso(d['readAt']) : null,
      'createdAt': _dateToIso(d['createdAt'] ?? d['sentAt']),
    };
    return ChatMessage.fromJson(json);
  }

  Map<String, dynamic> _toMap(ChatMessage m) => {
        'id': m.id,
        'matchId': m.matchId,
        'senderId': m.senderId,
        'messageText': m.messageText,
        'sentAt': m.sentAt.toIso8601String(),
        'readAt': m.readAt?.toIso8601String(),
        'createdAt': m.createdAt.toIso8601String(),
      };

  String _dateToIso(dynamic v) {
    if (v == null) return DateTime.now().toIso8601String();
    if (v is Timestamp) return v.toDate().toIso8601String();
    if (v is DateTime) return v.toIso8601String();
    if (v is String) return DateTime.parse(v).toIso8601String();
    return DateTime.now().toIso8601String();
  }
}
