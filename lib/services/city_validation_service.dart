import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:echomatch/config/env_loader.dart';

class CityValidationService {
  static const _baseUrl = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

  static String _token() => AppEnv.mapboxToken;

  Future<List<String>> searchCities(String rawQuery, {String? originCity}) async {
    final query = rawQuery.trim();
    if (query.length < 2) return const [];

    final token = _token();
    if (token.isEmpty) {
      debugPrint('[CityValidationService] No Mapbox token configured');
      return const [];
    }

    try {
      final params = <String, String>{
        'access_token': token,
        'types': 'place',
        'autocomplete': 'true',
        'limit': '8',
        'language': 'en',
      };

      if (originCity != null && originCity.trim().isNotEmpty) {
        params['proximity'] = 'ip';
      }

      final encoded = Uri.encodeComponent(query);
      final uri = Uri.parse('$_baseUrl/$encoded.json').replace(queryParameters: params);

      final res = await http.get(uri).timeout(const Duration(seconds: 6));
      if (res.statusCode != 200) {
        debugPrint('[CityValidationService] HTTP ${res.statusCode}');
        return const [];
      }

      final data = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
      final features = data['features'] as List?;
      if (features == null) return const [];

      return features.map((f) {
        final placeName = (f['place_name'] as String?) ?? '';
        return placeName.trim();
      }).where((s) => s.isNotEmpty).toList(growable: false);
    } on TimeoutException {
      debugPrint('[CityValidationService] request timed out for "$query"');
      return const [];
    } catch (e) {
      debugPrint('[CityValidationService] exception: $e');
      return const [];
    }
  }

  Future<String?> validateAndNormalizeCity(String rawCity) async {
    final results = await searchCities(rawCity);
    if (results.isNotEmpty) return results.first;

    final trimmed = rawCity.trim().replaceAll(RegExp(r'''[\s'\".,]+$'''), '');
    if (trimmed.isNotEmpty && RegExp(r'^[A-Za-z][A-Za-z .\-]{1,}$').hasMatch(trimmed)) {
      String cap(String p) => p.isEmpty ? p : p[0].toUpperCase() + p.substring(1).toLowerCase();
      return trimmed.split(' ').map((w) => w.split('-').map(cap).join('-')).join(' ').trim();
    }
    return null;
  }
}
