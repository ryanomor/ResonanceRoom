import 'dart:async';
import 'package:firebase_auth/firebase_auth.dart' as fb_auth;
import 'package:flutter/foundation.dart';
import 'package:echomatch/models/user.dart';
import 'package:echomatch/services/user_service.dart';
import 'package:echomatch/services/city_validation_service.dart';

class AuthService extends ChangeNotifier {
  final fb_auth.FirebaseAuth _auth = fb_auth.FirebaseAuth.instance;
  final UserService _userService = UserService();

  User? _currentUser;
  bool _isLoading = false;
  String? _error;
  StreamSubscription<fb_auth.User?>? _authSub;

  User? get currentUser => _currentUser;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isAuthenticated => _currentUser != null;

  AuthService() {
    initialize();
  }

  Future<void> initialize() async {
    _isLoading = true;
    notifyListeners();

    // Listen for auth state changes and load corresponding user profile
    _authSub?.cancel();
    _authSub = _auth.userChanges().listen((fbUser) async {
      try {
        if (fbUser == null) {
          _currentUser = null;
        } else {
          final profile = await _userService.getUserById(fbUser.uid);
          _currentUser = profile;
        }
      } catch (e) {
        debugPrint('Auth state listener error: $e');
        _error = e.toString();
      } finally {
        notifyListeners();
      }
    }, onError: (e) {
      debugPrint('Auth listener error: $e');
      _error = e.toString();
      notifyListeners();
    });

    _isLoading = false;
    notifyListeners();
  }

  Future<bool> signUp({
    required String email,
    required String password,
    required String username,
    required String city,
    required Gender gender,
    String? bio,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // Validate city
      final normalizedCity = await CityValidationService().validateAndNormalizeCity(city);
      if (normalizedCity == null) {
        _error = 'Please enter a valid city (e.g., "Austin" or "Austin, TX")';
        _isLoading = false;
        notifyListeners();
        return false;
      }

      // Create auth account
      final cred = await _auth.createUserWithEmailAndPassword(email: email, password: password);
      final fbUser = cred.user;
      if (fbUser == null) {
        _error = 'Failed to create account';
        _isLoading = false;
        notifyListeners();
        return false;
      }

      // Create Firestore profile using uid as id
      final now = DateTime.now();
      final newUser = User(
        id: fbUser.uid,
        email: email,
        username: username.trim(),
        city: normalizedCity,
        bio: bio,
        gender: gender,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      );

      await _userService.createUser(newUser);
      _currentUser = newUser;

      _isLoading = false;
      notifyListeners();
      return true;
    } on fb_auth.FirebaseAuthException catch (e) {
      debugPrint('Firebase sign up failed: ${e.code} - ${e.message}');
      _error = _mapFirebaseAuthError(e);
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      debugPrint('Sign up failed: $e');
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> signIn({required String email, required String password}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final cred = await _auth.signInWithEmailAndPassword(email: email, password: password);
      final fbUser = cred.user;
      if (fbUser == null) throw Exception('Auth failed');

      // Load profile; in case of missing profile, create a minimal one
      var profile = await _userService.getUserById(fbUser.uid);
      final now = DateTime.now();
      if (profile == null) {
        profile = User(
          id: fbUser.uid,
          email: fbUser.email ?? email,
          username: (email.split('@').first).trim(),
          city: '',
          bio: null,
          gender: Gender.male,
          createdAt: now,
          updatedAt: now,
          lastLoginAt: now,
        );
        await _userService.createUser(profile);
      } else {
        // Update last login timestamp
        await _userService.updateLastLogin(fbUser.uid, now);
        profile = profile.copyWith(lastLoginAt: now, updatedAt: now);
      }

      _currentUser = profile;

      _isLoading = false;
      notifyListeners();
      return true;
    } on fb_auth.FirebaseAuthException catch (e) {
      debugPrint('Firebase sign in failed: ${e.code} - ${e.message}');
      _error = _mapFirebaseAuthError(e);
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      debugPrint('Sign in failed: $e');
      _error = 'Invalid email or password';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> signOut() async {
    try {
      await _auth.signOut();
    } catch (e) {
      debugPrint('Sign out error: $e');
    } finally {
      _currentUser = null;
      _error = null;
      notifyListeners();
    }
  }

  Future<void> updateProfile(User updatedUser) async {
    try {
      await _userService.updateUser(updatedUser);
      _currentUser = updatedUser;
      notifyListeners();
    } catch (e) {
      debugPrint('Update profile failed: $e');
      _error = e.toString();
      notifyListeners();
    }
  }

  Future<bool> deleteAccount() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final fbUser = _auth.currentUser;
      final uid = fbUser?.uid;
      if (fbUser == null || uid == null) {
        _error = 'No authenticated user';
        _isLoading = false;
        notifyListeners();
        return false;
      }

      // Delete Firestore user first (best-effort)
      try {
        await _userService.deleteUser(uid);
      } catch (e) {
        debugPrint('Warning: failed to delete user doc $uid before auth delete: $e');
      }

      // Delete auth user (may require recent login)
      await fbUser.delete();

      _currentUser = null;
      _isLoading = false;
      notifyListeners();
      return true;
    } on fb_auth.FirebaseAuthException catch (e) {
      debugPrint('Delete account failed: ${e.code} - ${e.message}');
      if (e.code == 'requires-recent-login') {
        _error = 'Please sign in again to delete your account.';
      } else {
        _error = e.message ?? 'Failed to delete account';
      }
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      debugPrint('Delete account exception: $e');
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  String _mapFirebaseAuthError(fb_auth.FirebaseAuthException e) {
    switch (e.code) {
      case 'email-already-in-use':
        return 'Email already in use';
      case 'invalid-email':
        return 'Invalid email address';
      case 'weak-password':
        return 'Password is too weak';
      case 'user-not-found':
      case 'wrong-password':
        return 'Invalid email or password';
      case 'too-many-requests':
        return 'Too many attempts. Try again later';
      default:
        return e.message ?? 'Authentication error';
    }
  }

  /// Returns true if the given city is in the user's favorites (case-insensitive, base name).
  bool isCityFavorited(String city) {
    final user = _currentUser;
    if (user == null) return false;
    final base = city.split(',').first.trim().toLowerCase();
    return user.favoriteCities.any((c) => c.trim().toLowerCase() == base);
  }

  /// Toggle favorite city for the current user and persist to Firestore.
  Future<void> toggleFavoriteCity(String city) async {
    final user = _currentUser;
    if (user == null) return;
    try {
      final base = city.split(',').first.trim();
      final favorites = List<String>.from(user.favoriteCities);
      final existingIndex = favorites.indexWhere((c) => c.trim().toLowerCase() == base.toLowerCase());
      if (existingIndex >= 0) {
        favorites.removeAt(existingIndex);
      } else {
        // Insert at front for recency ordering
        favorites.removeWhere((c) => c.trim().toLowerCase() == base.toLowerCase());
        favorites.insert(0, base);
      }

      final updated = user.copyWith(
        favoriteCities: favorites,
        updatedAt: DateTime.now(),
      );
      await _userService.updateUser(updated);
      _currentUser = updated;
      notifyListeners();
    } catch (e) {
      debugPrint('toggleFavoriteCity failed: $e');
    }
  }

  @override
  void dispose() {
    _authSub?.cancel();
    super.dispose();
  }
}
