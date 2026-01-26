import 'package:flutter/foundation.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:echomatch/models/room.dart';

class RoomService {
  final _db = FirebaseFirestore.instance;

  Future<List<Room>> getAllRooms() async {
    try {
      final snap = await _db.collection('rooms').get();
      return snap.docs.map(_fromDoc).toList();
    } catch (e) {
      debugPrint('Failed to get rooms: $e');
      return [];
    }
  }

  /// Normalizes a display city into a metro key for comparison.
  /// NYC boroughs and common aliases map to a single key: "new york".
  String _metroKey(String displayCity) {
    final first = displayCity.split(',').first.trim().toLowerCase();
    var token = first;
    if (token.startsWith('the ')) token = token.substring(4); // "The Bronx" -> "bronx"
    const nyc = {
      'new york',
      'new york city',
      'nyc',
      'manhattan',
      'brooklyn',
      'queens',
      'bronx',
      'staten island',
    };
    if (nyc.contains(token)) return 'new york';
    return first;
  }

  Future<List<Room>> getRoomsByCity(String city) async {
    try {
      // Fetch waiting rooms then filter by city (case-insensitive) client-side for now
      final snap = await _db.collection('rooms').where('status', isEqualTo: RoomStatus.waiting.name).get();
      final queryKey = _metroKey(city);
      return snap.docs.map(_fromDoc).where((room) => _metroKey(room.city) == queryKey).toList();
    } catch (e) {
      debugPrint('Failed to get rooms by city: $e');
      return [];
    }
  }

  Future<Room?> getRoomById(String id) async {
    try {
      final doc = await _db.collection('rooms').doc(id).get();
      if (!doc.exists) return null;
      return _fromDoc(doc);
    } catch (e) {
      debugPrint('Failed to get room $id: $e');
      return null;
    }
  }

  Future<void> createRoom(Room room) async {
    try {
      await _db.collection('rooms').doc(room.id).set(_toMap(room));
    } catch (e) {
      debugPrint('Failed to create room: $e');
      rethrow;
    }
  }

  Future<void> updateRoom(Room room) async {
    try {
      await _db.collection('rooms').doc(room.id).set(_toMap(room), SetOptions(merge: true));
    } catch (e) {
      debugPrint('Failed to update room ${room.id}: $e');
      rethrow;
    }
  }

  Future<void> deleteRoom(String roomId) async {
    try {
      await _db.collection('rooms').doc(roomId).delete();
    } catch (e) {
      debugPrint('Failed to delete room $roomId: $e');
    }
  }

  Room _fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final d = doc.data() ?? {};
    Map<String, dynamic> json = {
      'id': d['id'] ?? doc.id,
      'hostId': d['hostId'],
      'city': d['city'],
      'title': d['title'],
      'description': d['description'],
      'maxParticipants': d['maxParticipants'],
      'status': d['status'],
      'entryFee': (d['entryFee'] ?? 0).toDouble(),
      'scheduledStart': _dateToIso(d['scheduledStart']),
      'actualStart': d['actualStart'] != null ? _dateToIso(d['actualStart']) : null,
      'actualEnd': d['actualEnd'] != null ? _dateToIso(d['actualEnd']) : null,
      'scheduledEnd': d['scheduledEnd'] != null ? _dateToIso(d['scheduledEnd']) : null,
      'createdAt': _dateToIso(d['createdAt']),
      'updatedAt': _dateToIso(d['updatedAt']),
      'currentParticipants': d['currentParticipants'] ?? 0,
      'questionIds': (d['questionIds'] as List?)?.cast<String>() ?? const [],
      'venueAddress': d['venueAddress'],
      'requiresGenderParity': d['requiresGenderParity'] ?? true,
    };
    return Room.fromJson(json);
  }

  Map<String, dynamic> _toMap(Room r) => {
        'id': r.id,
        'hostId': r.hostId,
        'city': r.city,
        'title': r.title,
        'description': r.description,
        'maxParticipants': r.maxParticipants,
        'status': r.status.name,
        'entryFee': r.entryFee,
        'scheduledStart': r.scheduledStart.toIso8601String(),
        'actualStart': r.actualStart?.toIso8601String(),
        'actualEnd': r.actualEnd?.toIso8601String(),
        'scheduledEnd': r.scheduledEnd?.toIso8601String(),
        'createdAt': r.createdAt.toIso8601String(),
        'updatedAt': r.updatedAt.toIso8601String(),
        'currentParticipants': r.currentParticipants,
        'questionIds': r.questionIds,
        'venueAddress': r.venueAddress,
        'requiresGenderParity': r.requiresGenderParity,
      };

  String _dateToIso(dynamic v) {
    if (v == null) return DateTime.now().toIso8601String();
    if (v is Timestamp) return v.toDate().toIso8601String();
    if (v is DateTime) return v.toIso8601String();
    if (v is String) return DateTime.parse(v).toIso8601String();
    return DateTime.now().toIso8601String();
  }
}
