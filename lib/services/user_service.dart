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

    DateTime? parseNullableDate(dynamic v) {
      if (v == null) return null;
      if (v is Timestamp) return v.toDate();
      if (v is String) return DateTime.tryParse(v);
      return null;
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
      lastLoginAt: parseNullableDate(data['lastLoginAt']),
      isActive: (data['isActive'] as bool?) ?? true,
      totalGamesPlayed: (data['totalGamesPlayed'] as num?)?.toInt() ?? 0,
      totalMatches: (data['totalMatches'] as num?)?.toInt() ?? 0,
      favoriteCities: (data['favoriteCities'] is List)
          ? (data['favoriteCities'] as List)
              .whereType<dynamic>()
              .map((e) => e.toString())
              .toList()
          : const [],
      lastNotificationsSeenAt: parseNullableDate(data['lastNotificationsSeenAt']),
      dismissedNotificationIds: (data['dismissedNotificationIds'] is List)
          ? (data['dismissedNotificationIds'] as List)
              .whereType<dynamic>()
              .map((e) => e.toString())
              .toList()
          : const [],
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
      if (user.lastLoginAt != null) {
        data['lastLoginAt'] = Timestamp.fromDate(user.lastLoginAt!);
      }
      if (user.lastNotificationsSeenAt != null) {
        data['lastNotificationsSeenAt'] = Timestamp.fromDate(user.lastNotificationsSeenAt!);
      }

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
      if (user.lastLoginAt != null) {
        data['lastLoginAt'] = Timestamp.fromDate(user.lastLoginAt!);
      }
      if (user.lastNotificationsSeenAt != null) {
        data['lastNotificationsSeenAt'] = Timestamp.fromDate(user.lastNotificationsSeenAt!);
      }

      await _db.collection(_collection).doc(user.id).update(data);
    } catch (e) {
      debugPrint('Failed to update user ${user.id}: $e');
      rethrow;
    }
  }

  /// Update only lastLoginAt field.
  Future<void> updateLastLogin(String userId, DateTime when) async {
    try {
      await _db.collection(_collection).doc(userId).update({
        'lastLoginAt': Timestamp.fromDate(when),
        'updatedAt': Timestamp.fromDate(when),
      });
    } catch (e) {
      debugPrint('Failed to update lastLoginAt for $userId: $e');
    }
  }

  /// Delete a user document.
  Future<void> deleteUser(String userId) async {
    try {
      await _db.collection(_collection).doc(userId).delete();
    } catch (e) {
      debugPrint('Failed to delete user $userId: $e');
      rethrow;
    }
  }
}
