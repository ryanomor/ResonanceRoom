import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:echomatch/config/env_loader.dart';

class VenueSuggestion {
  final String name;
  final String fullAddress;
  final double? latitude;
  final double? longitude;

  const VenueSuggestion({
    required this.name,
    required this.fullAddress,
    this.latitude,
    this.longitude,
  });
}

class VenueSearchService {
  static const _baseUrl = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

  Future<List<VenueSuggestion>> searchVenues(String rawQuery, {String? proximityCity}) async {
    final query = rawQuery.trim();
    if (query.length < 2) return const [];

    final token = AppEnv.mapboxToken;
    if (token.isEmpty) {
      debugPrint('[VenueSearchService] No Mapbox token configured');
      return const [];
    }

    try {
      final params = <String, String>{
        'access_token': token,
        'types': 'address,poi',
        'autocomplete': 'true',
        'limit': '8',
        'language': 'en',
      };

      if (proximityCity != null && proximityCity.trim().isNotEmpty) {
        params['proximity'] = 'ip';
      }

      final encoded = Uri.encodeComponent(query);
      final uri = Uri.parse('$_baseUrl/$encoded.json').replace(queryParameters: params);

      final res = await http.get(uri).timeout(const Duration(seconds: 6));
      if (res.statusCode != 200) {
        debugPrint('[VenueSearchService] HTTP ${res.statusCode}');
        return const [];
      }

      final data = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
      final features = data['features'] as List?;
      if (features == null) return const [];

      return features.map((f) {
        final text = (f['text'] as String?) ?? '';
        final placeName = (f['place_name'] as String?) ?? text;
        final coords = f['geometry']?['coordinates'] as List?;
        final lng = coords != null && coords.length >= 2 ? (coords[0] as num?)?.toDouble() : null;
        final lat = coords != null && coords.length >= 2 ? (coords[1] as num?)?.toDouble() : null;

        final parts = placeName.split(',');
        final name = text.isNotEmpty ? text : parts.first.trim();
        final address = placeName.trim();

        return VenueSuggestion(
          name: name,
          fullAddress: address,
          latitude: lat,
          longitude: lng,
        );
      }).where((v) => v.name.isNotEmpty).toList(growable: false);
    } on TimeoutException {
      debugPrint('[VenueSearchService] request timed out for "$query"');
      return const [];
    } catch (e) {
      debugPrint('[VenueSearchService] exception: $e');
      return const [];
    }
  }
}
