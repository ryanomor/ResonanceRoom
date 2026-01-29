import 'dart:convert';
import 'package:flutter/services.dart' show rootBundle;
import 'package:flutter/foundation.dart';

/// Provides offline city lists by country using flutter_country_state package data.
///
/// This service loads the package's embedded JSON once and caches city lists
/// per country ISO2 code. If the package asset path changes in future versions,
/// we attempt a couple of common fallbacks and log errors gracefully.
class CityCatalogService {
  CityCatalogService._();
  static final CityCatalogService _instance = CityCatalogService._();
  factory CityCatalogService() => _instance;

  final Map<String, List<String>> _citiesByIso2 = {};
  Map<String, dynamic>? _rawData;

  /// Loads the underlying JSON data from flutter_country_state.
  Future<void> _ensureLoaded() async {
    if (_rawData != null) return;
    final candidateAssets = <String>[
      // Primary known path used by flutter_country_state
      'packages/flutter_country_state/assets/country_state_city.json',
      // Possible alternative path if package restructured
      'packages/flutter_country_state/assets/country_state_city.json.json',
    ];

    for (final path in candidateAssets) {
      try {
        final jsonStr = await rootBundle.loadString(path);
        final decoded = json.decode(jsonStr);
        if (decoded is Map<String, dynamic>) {
          _rawData = decoded;
          debugPrint('[CityCatalogService] Loaded city catalog from $path');
          return;
        }
        if (decoded is List) {
          // Some packages ship the list at top level
          _rawData = {'countries': decoded};
          debugPrint('[CityCatalogService] Loaded city catalog (list) from $path');
          return;
        }
      } catch (e) {
        debugPrint('[CityCatalogService] Failed to load $path: $e');
      }
    }

    // If still null, keep as null; callers will see empty results
    debugPrint('[CityCatalogService] Could not load flutter_country_state data.');
  }

  /// Returns a sorted, de-duplicated list of city names for the given ISO2 country code.
  /// Example: 'US', 'GB', 'CA'. Case-insensitive.
  Future<List<String>> getCitiesByCountryCode(String iso2) async {
    final code = iso2.toUpperCase();
    if (_citiesByIso2.containsKey(code)) return _citiesByIso2[code]!;

    await _ensureLoaded();
    final data = _rawData;
    if (data == null) {
      _citiesByIso2[code] = const [];
      return const [];
    }

    final countries = (data['countries'] as List?) ?? (data['data'] as List?) ?? (data['list'] as List?) ?? [];
    final List<String> cities = [];

    for (final country in countries) {
      if (country is! Map) continue;
      final iso2Field = (country['iso2'] ?? country['iso'] ?? country['code'] ?? country['isoCode'])?.toString().toUpperCase();
      if (iso2Field != code) continue;

      // Collect cities from nested states -> cities
      final states = (country['states'] as List?) ?? (country['state'] as List?) ?? (country['provinces'] as List?) ?? [];
      for (final st in states) {
        if (st is! Map) continue;
        final stateCities = (st['cities'] as List?) ?? (st['city'] as List?) ?? [];
        for (final c in stateCities) {
          if (c is Map) {
            final name = (c['name'] ?? c['city'] ?? c['label'])?.toString();
            if (name != null && name.trim().isNotEmpty) cities.add(name.trim());
          } else if (c is String) {
            if (c.trim().isNotEmpty) cities.add(c.trim());
          }
        }
      }

      // Some datasets also include top-level cities
      final topCities = (country['cities'] as List?) ?? [];
      for (final c in topCities) {
        if (c is Map) {
          final name = (c['name'] ?? c['city'] ?? c['label'])?.toString();
          if (name != null && name.trim().isNotEmpty) cities.add(name.trim());
        } else if (c is String) {
          if (c.trim().isNotEmpty) cities.add(c.trim());
        }
      }
    }

    // Deduplicate and sort
    final unique = cities.toSet().toList()..sort((a, b) => a.toLowerCase().compareTo(b.toLowerCase()));
    _citiesByIso2[code] = unique;
    debugPrint('[CityCatalogService] Loaded ${unique.length} cities for $code');
    return unique;
  }
}
