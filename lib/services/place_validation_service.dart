import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

class PlaceValidationService {
  static const _baseUrl = 'https://nominatim.openstreetmap.org/search';

  /// Validates that [address] resolves to a real place and is within [cityDisplayName].
  /// Returns a normalized display string (e.g., "123 Main St, Philadelphia, Pennsylvania, United States") or null if no plausible match.
  static Future<String?> validateAddressInCity({required String address, required String cityDisplayName}) async {
    final query = address.trim();
    if (query.isEmpty) return null;
    try {
      final params = {
        'q': query,
        'format': 'jsonv2',
        'addressdetails': '1',
        'limit': '5',
      };
      final uri = Uri.parse(_baseUrl).replace(queryParameters: params);
      final res = await http.get(uri, headers: {
        'User-Agent': 'EchoMatch/1.0 (Dreamflow Flutter)',
        'Accept': 'application/json',
      });
      if (res.statusCode != 200) {
        debugPrint('Address validation failed: HTTP ${res.statusCode}');
        return null;
      }
      final decoded = jsonDecode(utf8.decode(res.bodyBytes));
      if (decoded is! List) return null;

      // Normalize city tokens for a robust contains check
      String norm(String s) => s.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]+'), ' ').trim();
      final cityNorm = norm(cityDisplayName);
      for (final item in decoded) {
        if (item is! Map<String, dynamic>) continue;
        final display = (item['display_name'] as String?)?.trim();
        if (display == null || display.isEmpty) continue;
        final displayNorm = norm(display);
        // Require the normalized city to be present in the normalized display string
        if (displayNorm.contains(cityNorm.split(' ').first)) {
          return display;
        }
      }
      return null;
    } catch (e) {
      debugPrint('Address validation exception: $e');
      return null;
    }
  }
}
