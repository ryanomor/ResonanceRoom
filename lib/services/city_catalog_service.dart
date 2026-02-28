import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:echomatch/config/env_loader.dart';

class CityCatalogService {
  CityCatalogService._();
  static final CityCatalogService _instance = CityCatalogService._();
  factory CityCatalogService() => _instance;

  static const _baseUrl = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

  final Map<String, List<String>> _cache = {};

  Future<List<String>> getCitiesByCountryCode(String iso2) async {
    return searchCities('', countryCode: iso2);
  }

  Future<List<String>> searchCities(String rawQuery, {String? countryCode}) async {
    final query = rawQuery.trim();
    final cacheKey = '${countryCode ?? ''}:$query';
    if (_cache.containsKey(cacheKey)) return _cache[cacheKey]!;

    final token = AppEnv.mapboxToken;
    if (token.isEmpty) {
      debugPrint('[CityCatalogService] No Mapbox token configured');
      return const [];
    }

    final searchQuery = query.isEmpty ? 'city' : query;

    try {
      final params = <String, String>{
        'access_token': token,
        'types': 'place',
        'autocomplete': 'true',
        'limit': '10',
        'language': 'en',
      };

      if (countryCode != null && countryCode.isNotEmpty) {
        params['country'] = countryCode.toLowerCase();
      }

      final encoded = Uri.encodeComponent(searchQuery);
      final uri = Uri.parse('$_baseUrl/$encoded.json').replace(queryParameters: params);

      final res = await http.get(uri).timeout(const Duration(seconds: 6));
      if (res.statusCode != 200) {
        debugPrint('[CityCatalogService] HTTP ${res.statusCode}');
        return const [];
      }

      final data = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
      final features = data['features'] as List?;
      if (features == null) return const [];

      final results = features.map((f) {
        final name = (f['text'] as String?) ?? '';
        return name.trim();
      }).where((s) => s.isNotEmpty).toList(growable: false);

      _cache[cacheKey] = results;
      return results;
    } on TimeoutException {
      debugPrint('[CityCatalogService] request timed out for "$searchQuery"');
      return const [];
    } catch (e) {
      debugPrint('[CityCatalogService] exception: $e');
      return const [];
    }
  }
}
