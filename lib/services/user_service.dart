import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:echomatch/models/user.dart';
import 'package:flutter/foundation.dart';

class UserService {
  static const String _collection = 'users';
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  /// Convert Firestore document data to [User].
  /// Handles both Timestamp and ISO string formats for date fields.
  User _fromFirestore(Map<String, dynamic> data, String id) {
    DateTime parseDate(dynamic v) {
      if (v is Timestamp) return v.toDate();
      if (v is String) return DateTime.tryParse(v) ?? DateTime.now();
      return DateTime.now();
    }

    Gender parseGender(dynamic v) {
      if (v is String) {
        final name = v.toLowerCase();
        for (final g in Gender.values) {
          if (g.name.toLowerCase() == name) return g;
        }
      } else if (v is int) {
        if (v >= 0 && v < Gender.values.length) return Gender.values[v];
      }
      return Gender.male;
    }

    return User(
      id: id,
      email: (data['email'] as String?) ?? '',
      username: ((data['username'] as String?) ?? (data['displayName'] as String?) ?? '').trim(),
      avatarUrl: data['avatarUrl'] as String?,
      city: (data['city'] as String?) ?? '',
      bio: data['bio'] as String?,
      gender: parseGender(data['gender']),
      createdAt: parseDate(data['createdAt']),
      updatedAt: parseDate(data['updatedAt']),
      isActive: (data['isActive'] as bool?) ?? true,
      totalGamesPlayed: (data['totalGamesPlayed'] as num?)?.toInt() ?? 0,
      totalMatches: (data['totalMatches'] as num?)?.toInt() ?? 0,
    );
  }

  /// Get all users from Firestore.
  Future<List<User>> getAllUsers() async {
    try {
      final snapshot = await _db.collection(_collection).get();
      return snapshot.docs.map((d) => _fromFirestore(d.data(), d.id)).toList();
    } catch (e) {
      debugPrint('Failed to fetch users from Firestore: $e');
      rethrow;
    }
  }

  /// Get a single user by id.
  Future<User?> getUserById(String id) async {
    try {
      final doc = await _db.collection(_collection).doc(id).get();
      if (!doc.exists) return null;
      return _fromFirestore(doc.data() as Map<String, dynamic>, doc.id);
    } catch (e) {
      debugPrint('Failed to fetch user $id: $e');
      return null;
    }
  }

  /// Create a new user document.
  Future<void> createUser(User user) async {
    try {
      // Store dates as Timestamps for better querying; keep other fields as-is
      final data = Map<String, dynamic>.from(user.toJson());
      data['createdAt'] = Timestamp.fromDate(user.createdAt);
      data['updatedAt'] = Timestamp.fromDate(user.updatedAt);

      await _db.collection(_collection).doc(user.id).set(data, SetOptions(merge: false));
    } catch (e) {
      debugPrint('Failed to create user ${user.id}: $e');
      rethrow;
    }
  }

  /// Update an existing user document.
  Future<void> updateUser(User user) async {
    try {
      final data = Map<String, dynamic>.from(user.toJson());
      data['updatedAt'] = Timestamp.fromDate(user.updatedAt);

      await _db.collection(_collection).doc(user.id).update(data);
    } catch (e) {
      debugPrint('Failed to update user ${user.id}: $e');
      rethrow;
    }
  }
}
