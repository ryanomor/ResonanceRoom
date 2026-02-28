import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:echomatch/config/env_loader.dart';

class PlaceValidationService {
  static const _baseUrl = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

  static Future<String?> validateAddressInCity({required String address, required String cityDisplayName}) async {
    final query = address.trim();
    if (query.isEmpty) return null;

    final token = AppEnv.mapboxToken;
    if (token.isEmpty) {
      debugPrint('[PlaceValidationService] No Mapbox token configured');
      return null;
    }

    try {
      final params = <String, String>{
        'access_token': token,
        'types': 'address,poi',
        'autocomplete': 'false',
        'limit': '5',
        'language': 'en',
        'proximity': 'ip',
      };

      final encoded = Uri.encodeComponent(query);
      final uri = Uri.parse('$_baseUrl/$encoded.json').replace(queryParameters: params);

      final res = await http.get(uri).timeout(const Duration(seconds: 6));
      if (res.statusCode != 200) {
        debugPrint('[PlaceValidationService] HTTP ${res.statusCode}');
        return null;
      }

      final data = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
      final features = data['features'] as List?;
      if (features == null || features.isEmpty) return null;

      final cityNorm = cityDisplayName.toLowerCase().split(',').first.trim();
      for (final f in features) {
        final placeName = (f['place_name'] as String?) ?? '';
        if (placeName.toLowerCase().contains(cityNorm)) {
          return placeName.trim();
        }
      }

      final first = (features.first['place_name'] as String?) ?? '';
      return first.isNotEmpty ? first.trim() : null;
    } on TimeoutException {
      debugPrint('[PlaceValidationService] request timed out for "$query"');
      return null;
    } catch (e) {
      debugPrint('[PlaceValidationService] exception: $e');
      return null;
    }
  }
}
