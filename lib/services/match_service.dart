import 'package:flutter/foundation.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:uuid/uuid.dart';
import 'package:echomatch/models/match.dart';
import 'package:echomatch/models/user_selection.dart';

class MatchService extends ChangeNotifier {
  final _db = FirebaseFirestore.instance;

  Future<List<Match>> calculateMatches(List<UserSelection> selections) async {
    final selectionMap = <String, Set<String>>{};
    
    for (final selection in selections) {
      selectionMap.putIfAbsent(selection.selectorUserId, () => {}).add(selection.selectedUserId);
    }

    final matches = <Match>[];
    final processedPairs = <String>{};

    for (final entry in selectionMap.entries) {
      final userA = entry.key;
      final selectedByA = entry.value;

      for (final userB in selectedByA) {
        final pairKey = userA.compareTo(userB) < 0 ? '$userA:$userB' : '$userB:$userA';
        
        if (processedPairs.contains(pairKey)) continue;
        processedPairs.add(pairKey);

        if (selectionMap.containsKey(userB) && selectionMap[userB]!.contains(userA)) {
          final now = DateTime.now();
          final match = Match(
            id: const Uuid().v4(),
            gameSessionId: selections.first.gameSessionId,
            uid1: userA.compareTo(userB) < 0 ? userA : userB,
            uid2: userA.compareTo(userB) < 0 ? userB : userA,
            matchedAt: now,
            expiresAt: now.add(const Duration(hours: 24)),
            status: MatchStatus.active,
          );
          matches.add(match);
        }
      }
    }

    for (final match in matches) {
      await _saveMatch(match);
    }

    notifyListeners();
    return matches;
  }

  Future<List<Match>> getUserMatches(String userId) async {
    try {
      final q1 = await _db.collection('matches').where('uid1', isEqualTo: userId).get();
      final q2 = await _db.collection('matches').where('uid2', isEqualTo: userId).get();
      final all = [...q1.docs, ...q2.docs].map(_fromDoc).toList();
      final now = DateTime.now();
      final result = <Match>[];
      for (final m in all) {
        if (m.expiresAt.isBefore(now) && m.status == MatchStatus.active) {
          await updateMatchStatus(m.id, MatchStatus.expired);
        } else if (m.status == MatchStatus.active || m.status == MatchStatus.chatted) {
          result.add(m);
        }
      }
      return result;
    } catch (e) {
      debugPrint('Failed to get user matches: $e');
      return [];
    }
  }

  Future<Match?> getMatchById(String id) async {
    try {
      final doc = await _db.collection('matches').doc(id).get();
      if (!doc.exists) return null;
      return _fromDoc(doc);
    } catch (e) {
      debugPrint('Failed to get match $id: $e');
      return null;
    }
  }

  Future<void> updateMatchStatus(String matchId, MatchStatus status) async {
    try {
      final Map<String, dynamic> data = {'status': status.name};
      if (status == MatchStatus.chatted) {
        data['firstChatAt'] = DateTime.now().toIso8601String();
      }
      if (status == MatchStatus.expired) {
        // keep existing firstChatAt if any
      }
      await _db.collection('matches').doc(matchId).set(data, SetOptions(merge: true));
      notifyListeners();
    } catch (e) {
      debugPrint('Failed to update match status: $e');
    }
  }

  Future<void> _saveMatch(Match match) async {
    try {
      await _db.collection('matches').doc(match.id).set(_toMap(match));
    } catch (e) {
      debugPrint('Failed to save match: $e');
    }
  }

  Match _fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final d = doc.data() ?? {};
    final json = {
      'id': d['id'] ?? doc.id,
      'gameSessionId': d['gameSessionId'],
      'uid1': d['uid1'],
      'uid2': d['uid2'],
      'matchedAt': _dateToIso(d['matchedAt']),
      'expiresAt': _dateToIso(d['expiresAt']),
      'status': d['status'],
      'firstChatAt': d['firstChatAt'] != null ? _dateToIso(d['firstChatAt']) : null,
    };
    return Match.fromJson(json);
  }

  Map<String, dynamic> _toMap(Match m) => {
        'id': m.id,
        'gameSessionId': m.gameSessionId,
        'uid1': m.uid1,
        'uid2': m.uid2,
        'matchedAt': m.matchedAt.toIso8601String(),
        'expiresAt': m.expiresAt.toIso8601String(),
        'status': m.status.name,
        'firstChatAt': m.firstChatAt?.toIso8601String(),
      };

  String _dateToIso(dynamic v) {
    if (v == null) return DateTime.now().toIso8601String();
    if (v is Timestamp) return v.toDate().toIso8601String();
    if (v is DateTime) return v.toIso8601String();
    if (v is String) return DateTime.parse(v).toIso8601String();
    return DateTime.now().toIso8601String();
  }
}
