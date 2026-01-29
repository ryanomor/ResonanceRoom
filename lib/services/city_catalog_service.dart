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
      'packages/flutter_country_state/assets/country_state_city.json',
      'packages/flutter_country_state/assets/country_state_city.json.json',
    ];

    // Try known candidates first
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
          _rawData = {'countries': decoded};
          debugPrint('[CityCatalogService] Loaded city catalog (list) from $path');
          return;
        }
      } catch (e) {
        debugPrint('[CityCatalogService] Failed to load $path: $e');
      }
    }

    // Fallback: scan AssetManifest.json to discover correct path in this environment
    try {
      final manifestStr = await rootBundle.loadString('AssetManifest.json');
      final manifestJson = json.decode(manifestStr);
      // AssetManifest can be a Map<String, dynamic> or a List depending on tooling
      Iterable<String> keys;
      if (manifestJson is Map<String, dynamic>) {
        keys = manifestJson.keys.cast<String>();
      } else if (manifestJson is List) {
        keys = manifestJson.cast<String>();
      } else {
        keys = const [];
      }

      final matches = keys.where((k) => k.contains('packages/flutter_country_state') && k.endsWith('.json')).toList()
        ..sort((a, b) => a.length.compareTo(b.length)); // prefer shorter, likely canonical path

      for (final path in matches) {
        try {
          final jsonStr = await rootBundle.loadString(path);
          final decoded = json.decode(jsonStr);
          if (decoded is Map<String, dynamic>) {
            _rawData = decoded;
            debugPrint('[CityCatalogService] Loaded city catalog from manifest: $path');
            return;
          }
          if (decoded is List) {
            _rawData = {'countries': decoded};
            debugPrint('[CityCatalogService] Loaded city catalog (list) from manifest: $path');
            return;
          }
        } catch (e) {
          debugPrint('[CityCatalogService] Failed to load manifest candidate $path: $e');
        }
      }
    } catch (e) {
      debugPrint('[CityCatalogService] Could not read AssetManifest.json: $e');
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

    final unique = cities.toSet().toList()..sort((a, b) => a.toLowerCase().compareTo(b.toLowerCase()));
    _citiesByIso2[code] = unique;
    debugPrint('[CityCatalogService] Loaded ${unique.length} cities for $code');
    return unique;
  }
}
