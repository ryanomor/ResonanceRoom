import 'dart:convert';
import 'package:flutter/services.dart' show rootBundle;
import 'package:flutter/foundation.dart' show kIsWeb, defaultTargetPlatform, TargetPlatform, debugPrint;
import 'package:firebase_core/firebase_core.dart';

/// Loads FirebaseOptions from an env JSON asset (e.g., env/dev.json).
/// Returns null if the file is missing or invalid. Errors are logged.
class FirebaseEnvLoader {
  static const String defaultPath = 'env/dev.json';

  /// Attempts to load and build [FirebaseOptions] from the given JSON asset.
  /// The JSON must contain either generic keys (FIREBASE_API_KEY, etc.) or
  /// platform-specific keys (FIREBASE_WEB_API_KEY, FIREBASE_ANDROID_API_KEY, etc.).
  static Future<FirebaseOptions?> tryLoad({String path = defaultPath}) async {
    try {
      final jsonStr = await rootBundle.loadString(path);
      final Map<String, dynamic> data = json.decode(jsonStr) as Map<String, dynamic>;

      String get(String specificKey, String genericKey) {
        return (data[specificKey] as String?) ?? (data[genericKey] as String?) ?? '';
      }

      if (kIsWeb) {
        final apiKey = get('FIREBASE_WEB_API_KEY', 'FIREBASE_API_KEY');
        final appId = get('FIREBASE_WEB_APP_ID', 'FIREBASE_APP_ID');
        final senderId = get('FIREBASE_WEB_MESSAGING_SENDER_ID', 'FIREBASE_MESSAGING_SENDER_ID');
        final projectId = get('FIREBASE_WEB_PROJECT_ID', 'FIREBASE_PROJECT_ID');
        final authDomain = get('FIREBASE_WEB_AUTH_DOMAIN', 'FIREBASE_AUTH_DOMAIN');
        final storageBucket = get('FIREBASE_WEB_STORAGE_BUCKET', 'FIREBASE_STORAGE_BUCKET');
        if ([apiKey, appId, senderId, projectId, authDomain, storageBucket].every((e) => e.isNotEmpty)) {
          return FirebaseOptions(
            apiKey: apiKey,
            appId: appId,
            messagingSenderId: senderId,
            projectId: projectId,
            authDomain: authDomain,
            storageBucket: storageBucket,
          );
        }
        return null;
      }

      switch (defaultTargetPlatform) {
        case TargetPlatform.android:
          final apiKey = get('FIREBASE_ANDROID_API_KEY', 'FIREBASE_API_KEY');
          final appId = get('FIREBASE_ANDROID_APP_ID', 'FIREBASE_APP_ID');
          final senderId = get('FIREBASE_ANDROID_MESSAGING_SENDER_ID', 'FIREBASE_MESSAGING_SENDER_ID');
          final projectId = get('FIREBASE_ANDROID_PROJECT_ID', 'FIREBASE_PROJECT_ID');
          final storageBucket = get('FIREBASE_ANDROID_STORAGE_BUCKET', 'FIREBASE_STORAGE_BUCKET');
          if ([apiKey, appId, senderId, projectId, storageBucket].every((e) => e.isNotEmpty)) {
            return FirebaseOptions(
              apiKey: apiKey,
              appId: appId,
              messagingSenderId: senderId,
              projectId: projectId,
              storageBucket: storageBucket,
            );
          }
          return null;
        case TargetPlatform.iOS:
          final apiKey = get('FIREBASE_IOS_API_KEY', 'FIREBASE_API_KEY');
          final appId = get('FIREBASE_IOS_APP_ID', 'FIREBASE_APP_ID');
          final senderId = get('FIREBASE_IOS_MESSAGING_SENDER_ID', 'FIREBASE_MESSAGING_SENDER_ID');
          final projectId = get('FIREBASE_IOS_PROJECT_ID', 'FIREBASE_PROJECT_ID');
          final storageBucket = get('FIREBASE_IOS_STORAGE_BUCKET', 'FIREBASE_STORAGE_BUCKET');
          final bundleId = get('FIREBASE_IOS_BUNDLE_ID', 'FIREBASE_IOS_BUNDLE_ID');
          if ([apiKey, appId, senderId, projectId, storageBucket].every((e) => e.isNotEmpty)) {
            return FirebaseOptions(
              apiKey: apiKey,
              appId: appId,
              messagingSenderId: senderId,
              projectId: projectId,
              storageBucket: storageBucket,
              iosBundleId: bundleId.isNotEmpty ? bundleId : null,
            );
          }
          return null;
        case TargetPlatform.macOS:
        case TargetPlatform.windows:
        case TargetPlatform.linux:
        case TargetPlatform.fuchsia:
          return null;
      }
    } catch (e) {
      // Log but don't crash; caller can fallback to default options.
      debugPrint('FirebaseEnvLoader: failed to load $path: $e');
      return null;
    }
  }
}
