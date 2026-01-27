import 'package:flutter/foundation.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:echomatch/models/room_participant.dart';

class RoomParticipantService {
  final _db = FirebaseFirestore.instance;

  Future<List<RoomParticipant>> getParticipantsByRoom(String roomId) async {
    try {
      final snap = await _db.collection('roomParticipants').where('roomId', isEqualTo: roomId).get();
      return snap.docs.map(_fromDoc).toList();
    } catch (e) {
      debugPrint('Failed to get participants for room $roomId: $e');
      return [];
    }
  }

  Future<List<RoomParticipant>> getPendingRequests(String roomId) async {
    try {
      final snap = await _db.collection('roomParticipants')
          .where('roomId', isEqualTo: roomId)
          .where('status', isEqualTo: ParticipantStatus.pending.name)
          .get();
      return snap.docs.map(_fromDoc).toList();
    } catch (e) {
      debugPrint('Failed to get pending for room $roomId: $e');
      return [];
    }
  }

  Future<List<RoomParticipant>> getApprovedParticipants(String roomId) async {
    try {
      final snap = await _db.collection('roomParticipants')
          .where('roomId', isEqualTo: roomId)
          .where('status', whereIn: [ParticipantStatus.paid.name, ParticipantStatus.inGame.name])
          .get();
      final all = snap.docs.map(_fromDoc).toList();
      // Exclude hosts from approved participants
      return all.where((p) => p.role == ParticipantRole.player).toList();
    } catch (e) {
      debugPrint('Failed to get approved for room $roomId: $e');
      return [];
    }
  }

  Future<List<RoomParticipant>> getParticipantsByUser(String userId) async {
    try {
      final snap = await _db
          .collection('roomParticipants')
          .where('userId', isEqualTo: userId)
          .get();
      return snap.docs.map(_fromDoc).toList();
    } catch (e) {
      debugPrint('Failed to get participants for user $userId: $e');
      return [];
    }
  }

  Future<RoomParticipant?> getParticipant(String roomId, String userId) async {
    try {
      final id = '${roomId}:${userId}';
      final doc = await _db.collection('roomParticipants').doc(id).get();
      if (!doc.exists) return null;
      return _fromDoc(doc);
    } catch (e) {
      debugPrint('Failed to get participant $roomId/$userId: $e');
      return null;
    }
  }

  Future<void> createParticipant(RoomParticipant participant) async {
    try {
      final id = '${participant.roomId}:${participant.userId}';
      await _db.collection('roomParticipants').doc(id).set(_toMap(participant.copyWith(id: id)));
    } catch (e) {
      debugPrint('Failed to create participant: $e');
      rethrow;
    }
  }

  Future<void> updateParticipant(RoomParticipant participant) async {
    try {
      final id = participant.id.isNotEmpty ? participant.id : '${participant.roomId}:${participant.userId}';
      await _db.collection('roomParticipants').doc(id).set(_toMap(participant.copyWith(id: id)), SetOptions(merge: true));
    } catch (e) {
      debugPrint('Failed to update participant ${participant.id}: $e');
      rethrow;
    }
  }

  Future<void> deleteParticipantsForRoom(String roomId) async {
    try {
      final snap = await _db.collection('roomParticipants').where('roomId', isEqualTo: roomId).get();
      final batch = _db.batch();
      for (final d in snap.docs) {
        batch.delete(d.reference);
      }
      await batch.commit();
    } catch (e) {
      debugPrint('Failed to delete participants for room $roomId: $e');
    }
  }

  RoomParticipant _fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final d = doc.data() ?? {};
    final json = {
      'id': d['id'] ?? doc.id,
      'roomId': d['roomId'],
      'userId': d['userId'],
      'status': d['status'],
      'role': d['role'] ?? 'player',
      'requestedAt': _dateToIso(d['requestedAt']),
      'approvedAt': d['approvedAt'] != null ? _dateToIso(d['approvedAt']) : null,
      'paidAt': d['paidAt'] != null ? _dateToIso(d['paidAt']) : null,
      'paymentReference': d['paymentReference'],
      'score': d['score'] ?? 0,
      'createdAt': _dateToIso(d['createdAt']),
      'updatedAt': _dateToIso(d['updatedAt']),
    };
    return RoomParticipant.fromJson(json);
  }

  Map<String, dynamic> _toMap(RoomParticipant p) => {
        'id': p.id,
        'roomId': p.roomId,
        'userId': p.userId,
        'status': p.status.name,
        'role': p.role.name,
        'requestedAt': p.requestedAt.toIso8601String(),
        'approvedAt': p.approvedAt?.toIso8601String(),
        'paidAt': p.paidAt?.toIso8601String(),
        'paymentReference': p.paymentReference,
        'score': p.score,
        'createdAt': p.createdAt.toIso8601String(),
        'updatedAt': p.updatedAt.toIso8601String(),
      };

  String _dateToIso(dynamic v) {
    if (v == null) return DateTime.now().toIso8601String();
    if (v is Timestamp) return v.toDate().toIso8601String();
    if (v is DateTime) return v.toIso8601String();
    if (v is String) return DateTime.parse(v).toIso8601String();
    return DateTime.now().toIso8601String();
  }
}
