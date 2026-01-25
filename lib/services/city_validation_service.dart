import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

class CityValidationService {
  static const _baseUrl = 'https://nominatim.openstreetmap.org/search';
  static const _teleportBaseUrl = 'https://api.teleport.org/api/cities/';
  static const _minImportanceForMajorCity = 0.35;
  static const _minPopulationForMajorCity = 100000;

  static const _cityAddressKeys = ['city', 'town', 'village', 'municipality', 'hamlet', 'locality'];
  static const _stateAddressKeys = ['state', 'region', 'province', 'state_district', 'county'];
  static const _cityLikeAddressTypes = {'city', 'town', 'village', 'municipality', 'hamlet', 'locality'};
  static const Map<String, String> _regionCodeToCountry = {
    'AL': 'United States',
    'AK': 'United States',
    'AZ': 'United States',
    'AR': 'United States',
    'CA': 'United States',
    'CO': 'United States',
    'CT': 'United States',
    'DE': 'United States',
    'FL': 'United States',
    'GA': 'United States',
    'HI': 'United States',
    'ID': 'United States',
    'IL': 'United States',
    'IN': 'United States',
    'IA': 'United States',
    'KS': 'United States',
    'KY': 'United States',
    'LA': 'United States',
    'ME': 'United States',
    'MD': 'United States',
    'MA': 'United States',
    'MI': 'United States',
    'MN': 'United States',
    'MS': 'United States',
    'MO': 'United States',
    'MT': 'United States',
    'NE': 'United States',
    'NV': 'United States',
    'NH': 'United States',
    'NJ': 'United States',
    'NM': 'United States',
    'NY': 'United States',
    'NC': 'United States',
    'ND': 'United States',
    'OH': 'United States',
    'OK': 'United States',
    'OR': 'United States',
    'PA': 'United States',
    'RI': 'United States',
    'SC': 'United States',
    'SD': 'United States',
    'TN': 'United States',
    'TX': 'United States',
    'UT': 'United States',
    'VT': 'United States',
    'VA': 'United States',
    'WA': 'United States',
    'WV': 'United States',
    'WI': 'United States',
    'WY': 'United States',
    'DC': 'United States',
    'PR': 'United States',
    'AB': 'Canada',
    'BC': 'Canada',
    'MB': 'Canada',
    'NB': 'Canada',
    'NL': 'Canada',
    'NS': 'Canada',
    'NT': 'Canada',
    'NU': 'Canada',
    'ON': 'Canada',
    'PE': 'Canada',
    'QC': 'Canada',
    'SK': 'Canada',
    'YT': 'Canada',
  };
  static const Map<String, String> _regionNameToCountry = {
    'alabama': 'United States',
    'alaska': 'United States',
    'arizona': 'United States',
    'arkansas': 'United States',
    'california': 'United States',
    'colorado': 'United States',
    'connecticut': 'United States',
    'delaware': 'United States',
    'florida': 'United States',
    'georgia': 'United States',
    'hawaii': 'United States',
    'idaho': 'United States',
    'illinois': 'United States',
    'indiana': 'United States',
    'iowa': 'United States',
    'kansas': 'United States',
    'kentucky': 'United States',
    'louisiana': 'United States',
    'maine': 'United States',
    'maryland': 'United States',
    'massachusetts': 'United States',
    'michigan': 'United States',
    'minnesota': 'United States',
    'mississippi': 'United States',
    'missouri': 'United States',
    'montana': 'United States',
    'nebraska': 'United States',
    'nevada': 'United States',
    'new hampshire': 'United States',
    'new jersey': 'United States',
    'new mexico': 'United States',
    'new york': 'United States',
    'north carolina': 'United States',
    'north dakota': 'United States',
    'ohio': 'United States',
    'oklahoma': 'United States',
    'oregon': 'United States',
    'pennsylvania': 'United States',
    'rhode island': 'United States',
    'south carolina': 'United States',
    'south dakota': 'United States',
    'tennessee': 'United States',
    'texas': 'United States',
    'utah': 'United States',
    'vermont': 'United States',
    'virginia': 'United States',
    'washington': 'United States',
    'west virginia': 'United States',
    'wisconsin': 'United States',
    'wyoming': 'United States',
    'district of columbia': 'United States',
    'puerto rico': 'United States',
    'alberta': 'Canada',
    'british columbia': 'Canada',
    'manitoba': 'Canada',
    'new brunswick': 'Canada',
    'newfoundland and labrador': 'Canada',
    'nova scotia': 'Canada',
    'northwest territories': 'Canada',
    'nunavut': 'Canada',
    'ontario': 'Canada',
    'prince edward island': 'Canada',
    'quebec': 'Canada',
    'saskatchewan': 'Canada',
    'yukon': 'Canada',
    'england': 'United Kingdom',
    'scotland': 'United Kingdom',
    'wales': 'United Kingdom',
    'northern ireland': 'United Kingdom',
  };
  static const Map<String, String> _countryToIso2 = {
    'United States': 'us',
    'Canada': 'ca',
    'United Kingdom': 'gb',
    'Australia': 'au',
    'New Zealand': 'nz',
    'Ireland': 'ie',
    'France': 'fr',
    'Germany': 'de',
    'Spain': 'es',
    'Italy': 'it',
    'Portugal': 'pt',
    'Netherlands': 'nl',
    'Belgium': 'be',
    'Switzerland': 'ch',
    'Austria': 'at',
    'Sweden': 'se',
    'Norway': 'no',
    'Denmark': 'dk',
    'Finland': 'fi',
    'Iceland': 'is',
    'Mexico': 'mx',
    'Brazil': 'br',
    'Argentina': 'ar',
    'Colombia': 'co',
    'Chile': 'cl',
    'Peru': 'pe',
    'Japan': 'jp',
    'South Korea': 'kr',
    'China': 'cn',
    'Hong Kong': 'hk',
    'Singapore': 'sg',
    'India': 'in',
    'United Arab Emirates': 'ae',
    'South Africa': 'za',
    'Nigeria': 'ng',
    'Kenya': 'ke',
    'Saudi Arabia': 'sa',
  };

  static bool _isCityLikeType(String? cls, String? type) {
    final c = cls?.toLowerCase();
    final t = type?.toLowerCase();
    if (c == 'place') {
      return t == 'city' || t == 'town' || t == 'village' || t == 'hamlet' || t == 'municipality';
    }
    // Some cities come back as administrative boundaries.
    if (c == 'boundary') return t == 'administrative';
    return false;
  }

  static bool _isCityLikeAddressType(String? addressType) => addressType != null && _cityLikeAddressTypes.contains(addressType.toLowerCase());

  static String _normalizeForMatch(String input) => input.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]+'), ' ').trim();

  static List<String> _splitNormalizedTokens(String input) => _normalizeForMatch(input).split(' ').where((part) => part.isNotEmpty).toList(growable: false);

  static bool _matchesTokens({required List<String> queryTokens, required String suggestionNorm, required String cityNorm, required List<String> cityTokens}) {
    if (queryTokens.isEmpty) return false;
    final fullQuery = queryTokens.join(' ');
    if (suggestionNorm.contains(fullQuery) || cityNorm.contains(fullQuery)) return true;

    var misses = 0;
    for (final token in queryTokens) {
      var matched = false;
      if (token.length == 1) {
        matched = suggestionNorm.contains(token);
      } else if (cityNorm.contains(token) || suggestionNorm.contains(token)) {
        matched = true;
      } else {
        for (final cityToken in cityTokens) {
          if (cityToken.contains(token)) {
            matched = true;
            break;
          }
          if (token.length >= 3 && _levenshteinDistance(cityToken, token) <= 1) {
            matched = true;
            break;
          }
        }
      }

      if (!matched) {
        misses++;
        if (misses > 1) return false;
      }
    }
    return true;
  }

  static String? _firstNonEmpty(Map<String, dynamic>? source, List<String> candidates) {
    if (source == null) return null;
    for (final key in candidates) {
      final raw = source[key];
      if (raw is String && raw.trim().isNotEmpty) return raw.trim();
    }
    return null;
  }

  static String? _canonicalCountryName(String? raw) {
    if (raw == null) return null;
    final trimmed = raw.trim();
    if (trimmed.isEmpty) return null;

    final upper = trimmed.toUpperCase();
    final mappedCode = _regionCodeToCountry[upper];
    if (mappedCode != null) return mappedCode;

    final lower = trimmed.toLowerCase();
    final mappedName = _regionNameToCountry[lower];
    if (mappedName != null) return mappedName;

    switch (lower) {
      case 'united states':
      case 'united states of america':
      case 'usa':
      case 'u.s.a':
      case 'us':
      case 'u.s.':
      case 'america':
        return 'United States';
      case 'united kingdom':
      case 'u.k.':
      case 'uk':
      case 'great britain':
      case 'britain':
      case 'gb':
        return 'United Kingdom';
      case 'uae':
      case 'u.a.e.':
      case 'united arab emirates':
        return 'United Arab Emirates';
      case 'drc':
      case 'democratic republic of the congo':
        return 'Democratic Republic of the Congo';
      case 'republic of the congo':
        return 'Republic of the Congo';
      default:
        return trimmed;
    }
  }

  static String? _extractCountryFromDisplay(String? display) {
    if (display == null) return null;
    final parts = display
        .split(',')
        .map((part) => part.trim())
        .where((part) => part.isNotEmpty)
        .toList();
    if (parts.isEmpty) return null;

    for (var i = parts.length - 1; i >= 0; i--) {
      final canonical = _canonicalCountryName(parts[i]);
      if (canonical != null) return canonical;
    }
    return null;
  }

  static int? _parsePopulation(dynamic raw) {
    if (raw == null) return null;
    if (raw is num) return raw.toInt();
    if (raw is String) {
      final digits = raw.replaceAll(RegExp(r'[^0-9]'), '');
      if (digits.isEmpty) return null;
      return int.tryParse(digits);
    }
    return null;
  }

  static String? _extractCityName(Map<String, dynamic> item) {
    final address = item['address'];
    if (address is! Map<String, dynamic>) return null;
    final city = _firstNonEmpty(address, _cityAddressKeys);
    if (city != null) return city;
    final display = item['display_name'];
    if (display is! String || display.trim().isEmpty) return null;
    return display.split(',').first.trim();
  }

  static String? _extractStateName(Map<String, dynamic> item) {
    final address = item['address'];
    if (address is! Map<String, dynamic>) return null;
    return _firstNonEmpty(address, _stateAddressKeys);
  }

  static String? _extractCountryName(Map<String, dynamic> item) {
    final address = item['address'];
    if (address is! Map<String, dynamic>) return null;
    final country = address['country'];
    if (country is String && country.trim().isNotEmpty) {
      final canonical = _canonicalCountryName(country);
      if (canonical != null) return canonical;
    }
    final countryCode = address['country_code'];
    if (countryCode is String && countryCode.trim().isNotEmpty) {
      return _canonicalCountryName(countryCode);
    }
    return null;
  }

  static int _levenshteinDistance(String a, String b) {
    if (a == b) return 0;
    if (a.isEmpty) return b.length;
    if (b.isEmpty) return a.length;

    final previous = List<int>.generate(b.length + 1, (index) => index);
    final current = List<int>.filled(b.length + 1, 0);

    for (var i = 0; i < a.length; i++) {
      current[0] = i + 1;
      for (var j = 0; j < b.length; j++) {
        final cost = a[i] == b[j] ? 0 : 1;
        final deletion = previous[j + 1] + 1;
        final insertion = current[j] + 1;
        final substitution = previous[j] + cost;
        current[j + 1] = min(deletion, min(insertion, substitution));
      }
      for (var j = 0; j < previous.length; j++) {
        previous[j] = current[j];
      }
    }

    return current[b.length];
  }

  static double _scoreCandidate({required List<String> queryTokens, required List<String> cityTokens, required String cityNorm, required String suggestionNorm}) {
    var score = 0.0;

    final fullQuery = queryTokens.join(' ');
    if (cityNorm.startsWith(fullQuery)) score += 80;
    if (suggestionNorm.startsWith(fullQuery)) score += 60;

    for (final token in queryTokens) {
      final indexInCity = cityNorm.indexOf(token);
      final indexInSuggestion = suggestionNorm.indexOf(token);
      if (indexInCity == 0) {
        score += 30;
      } else if (indexInCity > 0) {
        score += 20 - indexInCity.clamp(0, 15);
      } else if (indexInSuggestion >= 0) {
        score += 10 - indexInSuggestion.clamp(0, 10) / 2;
      }

      var bestDistance = token.length;
      for (final cityToken in cityTokens) {
        final distance = _levenshteinDistance(cityToken, token);
        if (distance < bestDistance) bestDistance = distance;
      }
      score += (token.length - bestDistance) * 5;
    }

    score -= (suggestionNorm.length - cityNorm.length).abs() * 0.5;
    return score;
  }

  static Future<List<Map<String, dynamic>>> _fetchTeleportResults(String query) async {
    try {
      final uri = Uri.parse(_teleportBaseUrl).replace(queryParameters: {'search': query, 'limit': '10'});
      final res = await http
          .get(uri, headers: {
            'User-Agent': 'EchoMatch/1.0 (Dreamflow Flutter)',
            'Accept': 'application/json',
          })
          .timeout(const Duration(seconds: 6));

      if (res.statusCode != 200) {
        debugPrint('Teleport city search failed: HTTP ${res.statusCode}');
        return const [];
      }

      final decoded = jsonDecode(utf8.decode(res.bodyBytes));
      if (decoded is! Map<String, dynamic>) return const [];
      final embedded = decoded['_embedded'];
      if (embedded is! Map<String, dynamic>) return const [];
      final results = embedded['city:search-results'];
      if (results is! List) return const [];
      return results.whereType<Map<String, dynamic>>().toList(growable: false);
    } on TimeoutException {
      debugPrint('Teleport city search timed out for query: $query');
      return const [];
    } catch (e) {
      debugPrint('Teleport city search exception: $e');
      return const [];
    }
  }

  /// Returns up to a handful of normalized city display names for the query.
  ///
  /// This is intended for UI typeahead/suggestion lists.
  Future<List<String>> searchCities(String rawQuery, {String? originCity}) async {
    final query = rawQuery.trim();
    if (query.length < 2) return const [];

    try {
      final preferredCountry = _extractCountryFromDisplay(originCity);
      final preferredCountryCode = preferredCountry != null ? _countryToIso2[preferredCountry] : null;
      Future<List<dynamic>> fetch({required Map<String, String> params, bool preferCountry = false}) async {
        final queryParams = {
          ...params,
          'format': 'jsonv2',
          'addressdetails': '1',
          'extratags': '1',
          'limit': '12',
          'dedupe': '1',
        };
        if (preferCountry && preferredCountryCode != null) {
          queryParams['countrycodes'] = preferredCountryCode;
        }

        final uri = Uri.parse(_baseUrl).replace(queryParameters: queryParams);

        try {
          final res = await http
              .get(uri, headers: {
                'User-Agent': 'EchoMatch/1.0 (Dreamflow Flutter)',
                'Accept': 'application/json',
              })
              .timeout(const Duration(seconds: 6));

          if (res.statusCode != 200) {
            debugPrint('City search failed: HTTP ${res.statusCode}');
            return const [];
          }

          final decoded = jsonDecode(utf8.decode(res.bodyBytes));
          if (decoded is! List || decoded.isEmpty) return const [];
          return decoded;
        } on TimeoutException {
          debugPrint('City search request timed out for params: $params');
          return const [];
        } catch (e) {
          debugPrint('City search request error: $e');
          return const [];
        }
      }

      final qTokens = _splitNormalizedTokens(query);
      if (qTokens.isEmpty) return const [];

      final scoredBySuggestion = <String, double>{};
      final suggestionCountry = <String, String?>{};
      final suggestionSourceRank = <String, int>{};
      final seenPlaceIds = <String>{};

      void upsertCandidate(String suggestion, double score, {String? country, required int sourceRank}) {
        final existing = scoredBySuggestion[suggestion];
        if (existing == null || score > existing) {
          scoredBySuggestion[suggestion] = score;
          if (country != null) {
            suggestionCountry[suggestion] = country;
          } else if (suggestionCountry[suggestion] == null) {
            suggestionCountry[suggestion] = null;
          }
          final previousRank = suggestionSourceRank[suggestion];
          suggestionSourceRank[suggestion] = previousRank == null ? sourceRank : min(previousRank, sourceRank);
          return;
        }

        if (country != null && suggestionCountry[suggestion] == null) {
          suggestionCountry[suggestion] = country;
        }
        final previousRank = suggestionSourceRank[suggestion];
        if (previousRank == null || sourceRank < previousRank) {
          suggestionSourceRank[suggestion] = sourceRank;
        }
      }

      void processTeleport(List<Map<String, dynamic>> items) {
        for (final item in items) {
          final fullName = (item['matching_full_name'] as String?)?.trim();
          if (fullName == null || fullName.isEmpty) continue;

          final cityName = fullName.split(',').first.trim();
          if (cityName.isEmpty) continue;

          final suggestionNorm = _normalizeForMatch(fullName);
          final cityNorm = _normalizeForMatch(cityName);
          final cityTokens = _splitNormalizedTokens(cityName);

          if (suggestionNorm.isEmpty || cityNorm.isEmpty) continue;

          if (!_matchesTokens(queryTokens: qTokens, suggestionNorm: suggestionNorm, cityNorm: cityNorm, cityTokens: cityTokens)) continue;

          var score = _scoreCandidate(
            queryTokens: qTokens,
            cityTokens: cityTokens,
            cityNorm: cityNorm,
            suggestionNorm: suggestionNorm,
          );

          final teleportScore = (item['matching_score'] as num?)?.toDouble();
          if (teleportScore != null) score += teleportScore;
          score += 150;

          final countryName = _extractCountryFromDisplay(fullName);
          if (preferredCountry != null && countryName != null) {
            if (countryName == preferredCountry) {
              score += 220;
            } else {
              score -= 30;
            }
          }

          upsertCandidate(fullName, score, country: countryName, sourceRank: 0);
        }
      }

      void processItems(List<dynamic> items, {required bool requireMajor, required int sourceRank}) {
        for (final item in items) {
          if (item is! Map<String, dynamic>) continue;

          final placeId = item['place_id'];
          if (placeId != null && !seenPlaceIds.add('$placeId')) continue;

          final type = (item['type'] as String?)?.toLowerCase();
          final cls = (item['class'] as String?)?.toLowerCase();
          final addressType = (item['addresstype'] as String?)?.toLowerCase();
          if (!_isCityLikeType(cls, type) && !_isCityLikeAddressType(addressType)) continue;

          final cityName = _extractCityName(item);
          if (cityName == null || cityName.isEmpty) continue;

          final importance = (item['importance'] as num?)?.toDouble() ?? 0;
          int? population;
          final extratags = item['extratags'];
          if (extratags is Map<String, dynamic>) population = _parsePopulation(extratags['population']);
          population ??= _parsePopulation(item['population']);

          if (requireMajor) {
            final meetsPopulationThreshold = population != null && population >= _minPopulationForMajorCity;
            if (importance < _minImportanceForMajorCity && !meetsPopulationThreshold) continue;
            final cityNameLower = cityName.toLowerCase();
            if (cityNameLower.startsWith('village of ') || cityNameLower.startsWith('town of ') || cityNameLower.contains('census-designated place')) continue;
          }
          final stateName = _extractStateName(item);
          final countryName = _extractCountryName(item);

          final suggestionParts = <String>[cityName];
          if (stateName != null && !suggestionParts.contains(stateName)) suggestionParts.add(stateName);
          if (countryName != null && !suggestionParts.contains(countryName)) suggestionParts.add(countryName);
          final suggestion = suggestionParts.join(', ');
          final suggestionNorm = _normalizeForMatch(suggestion);
          final cityNorm = _normalizeForMatch(cityName);
          final cityTokens = _splitNormalizedTokens(cityName);

          if (suggestionNorm.isEmpty || cityNorm.isEmpty) continue;

          if (!_matchesTokens(queryTokens: qTokens, suggestionNorm: suggestionNorm, cityNorm: cityNorm, cityTokens: cityTokens)) continue;

          var score = _scoreCandidate(
            queryTokens: qTokens,
            cityTokens: cityTokens,
            cityNorm: cityNorm,
            suggestionNorm: suggestionNorm,
          );

          if (population != null) score += population.clamp(0, 5000000) / 100000;
          score += importance * 100;
          if (preferredCountry != null && countryName != null) {
            if (countryName == preferredCountry) {
              score += 180;
            } else {
              score -= 20;
            }
          }

          upsertCandidate(suggestion, score, country: countryName, sourceRank: sourceRank);
        }
      }

      final teleportResults = await _fetchTeleportResults(query);
      if (teleportResults.isNotEmpty) processTeleport(teleportResults);

      if (scoredBySuggestion.length < 4 && query.contains(' ')) {
        final firstToken = query.split(' ').firstWhere((token) => token.trim().isNotEmpty, orElse: () => query);
        if (firstToken.length >= 2 && firstToken != query) {
          final altTeleport = await _fetchTeleportResults(firstToken);
          if (altTeleport.isNotEmpty) processTeleport(altTeleport);
        }
      }

      if (scoredBySuggestion.length < 4 && query.length >= 3) {
        final expandedTeleport = await _fetchTeleportResults('$query city');
        if (expandedTeleport.isNotEmpty) processTeleport(expandedTeleport);
      }

      final fetchedBatches = <List<dynamic>>[];

      final structured = await fetch(params: {'city': query}, preferCountry: preferredCountryCode != null);
      fetchedBatches.add(structured);
      processItems(structured, requireMajor: true, sourceRank: 1);

      if (preferredCountryCode != null && scoredBySuggestion.length < 4) {
        final structuredGlobal = await fetch(params: {'city': query});
        fetchedBatches.add(structuredGlobal);
        processItems(structuredGlobal, requireMajor: true, sourceRank: 2);
      }

      if (scoredBySuggestion.length < 8) {
        final fallbackPreferred = await fetch(params: {'q': query}, preferCountry: preferredCountryCode != null);
        fetchedBatches.add(fallbackPreferred);
        processItems(fallbackPreferred, requireMajor: true, sourceRank: 3);

        if (preferredCountryCode != null && scoredBySuggestion.length < 8) {
          final fallbackGlobal = await fetch(params: {'q': query});
          fetchedBatches.add(fallbackGlobal);
          processItems(fallbackGlobal, requireMajor: true, sourceRank: 4);
        }
      }

      if (scoredBySuggestion.length < 8 && query.length > 3) {
        final expandedQuery = '$query city';
        final extraPreferred = await fetch(params: {'q': expandedQuery}, preferCountry: preferredCountryCode != null);
        fetchedBatches.add(extraPreferred);
        processItems(extraPreferred, requireMajor: true, sourceRank: 5);

        if (preferredCountryCode != null && scoredBySuggestion.length < 8) {
          final extraGlobal = await fetch(params: {'q': expandedQuery});
          fetchedBatches.add(extraGlobal);
          processItems(extraGlobal, requireMajor: true, sourceRank: 6);
        }
      }

      if (scoredBySuggestion.length < 4) {
        for (final batch in fetchedBatches) {
          processItems(batch, requireMajor: false, sourceRank: 7);
        }
      }

      final entries = scoredBySuggestion.entries.toList()
        ..sort((a, b) {
          final aPreferred = preferredCountry != null && suggestionCountry[a.key] == preferredCountry;
          final bPreferred = preferredCountry != null && suggestionCountry[b.key] == preferredCountry;
          if (aPreferred != bPreferred) {
            return aPreferred ? -1 : 1;
          }
          final aRank = suggestionSourceRank[a.key] ?? 99;
          final bRank = suggestionSourceRank[b.key] ?? 99;
          if (aRank != bRank) return aRank.compareTo(bRank);
          return b.value.compareTo(a.value);
        });

      final prioritized = <String>[];
      final others = <String>[];
      for (final entry in entries) {
        final list = preferredCountry != null && suggestionCountry[entry.key] == preferredCountry ? prioritized : others;
        list.add(entry.key);
      }

      return [...prioritized, ...others].take(8).toList(growable: false);
    } catch (e) {
      debugPrint('City search exception: $e');
      return const [];
    }
  }

  /// Validates a city string by querying OpenStreetMap Nominatim.
  ///
  /// Returns a normalized display city (e.g. "Austin, Texas, United States")
  /// when a plausible city match is found; otherwise returns null.
  Future<String?> validateAndNormalizeCity(String rawCity) async {
    // Sanitize common input issues like leading/trailing quotes or commas (e.g., "Austin,", 'Philadelphia')
    String city = rawCity.trim().replaceAll(RegExp(r'''^[\s'\".,]+|[\s'\".,]+$'''), "");
    if (city.isEmpty) return null;

    String? normalized;

    try {
      final uri = Uri.parse(_baseUrl).replace(queryParameters: {
        'q': city,
        'format': 'jsonv2',
        'addressdetails': '1',
        'limit': '5',
        // Helps reduce random POIs.
        'featuretype': 'city',
      });

      // Nominatim usage policy expects a valid User-Agent.
      final res = await http
          .get(uri, headers: {
            'User-Agent': 'EchoMatch/1.0 (Dreamflow Flutter)',
            'Accept': 'application/json',
          })
          .timeout(const Duration(seconds: 6));

      if (res.statusCode == 200) {
        final decoded = jsonDecode(utf8.decode(res.bodyBytes));
        if (decoded is List && decoded.isNotEmpty) {
          Map<String, dynamic>? best;
          for (final item in decoded) {
            if (item is! Map<String, dynamic>) continue;
            final type = (item['type'] as String?)?.toLowerCase();
            final cls = (item['class'] as String?)?.toLowerCase();
            if (_isCityLikeType(cls, type)) {
              best = item;
              break;
            }
          }
          final name = best?['display_name'] as String?;
          if (name != null && name.trim().isNotEmpty) {
            normalized = name.trim();
          }
        }
      } else {
        debugPrint('City validation failed: HTTP ${res.statusCode}');
      }
    } on TimeoutException {
      debugPrint('City validation timed out for "$city"');
    } catch (e) {
      debugPrint('City validation exception: $e');
    }

    // If Nominatim failed or returned no city-like result, try Teleport fallback
    if (normalized == null) {
      try {
        final teleport = await _fetchTeleportResults(city);
        if (teleport.isNotEmpty) {
          final first = teleport.firstWhere((e) => (e['matching_full_name'] as String?)?.trim().isNotEmpty == true, orElse: () => const {});
          final full = (first['matching_full_name'] as String?)?.trim();
          if (full != null && full.isNotEmpty) {
            normalized = full;
            debugPrint('City validation used Teleport fallback for "$city": $normalized');
          }
        }
      } catch (e) {
        debugPrint('Teleport fallback failed: $e');
      }
    }

    // Final graceful fallback: accept reasonable city-looking strings offline
    if (normalized == null) {
      final looksLikeCity = RegExp(r'^[A-Za-z][A-Za-z .\-]{1,}$').hasMatch(city);
      if (looksLikeCity) {
        String titleCase(String input) {
          String cap(String part) => part.isEmpty ? part : (part[0].toUpperCase() + part.substring(1).toLowerCase());
          return input
              .split(' ')
              .map((w) => w.split('-').map(cap).join('-'))
              .join(' ')
              .trim();
        }
        normalized = titleCase(city);
        debugPrint('City validation accepted heuristic value for "$city": $normalized');
      }
    }

    return normalized;
  }
}
