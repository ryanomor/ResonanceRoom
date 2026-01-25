import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:echomatch/models/question.dart';

class QuestionService {
  final _db = FirebaseFirestore.instance;

  Future<List<Question>> getAllQuestions() async {
    try {
      final snap = await _db.collection('questions').get();
      return snap.docs.map(_fromDoc).toList();
    } catch (e) {
      debugPrint('Failed to get questions: $e');
      return [];
    }
  }

  Future<Question?> getQuestionById(String id) async {
    try {
      final doc = await _db.collection('questions').doc(id).get();
      if (!doc.exists) return null;
      return _fromDoc(doc);
    } catch (e) {
      debugPrint('Failed to get question by id: $e');
      return null;
    }
  }

  Future<List<Question>> getRandomQuestions(int count) async {
    final allQuestions = await getAllQuestions();
    final random = Random();
    final shuffled = List<Question>.from(allQuestions)..shuffle(random);
    return shuffled.take(count).toList();
  }

  Question _fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final d = doc.data() ?? {};
    final json = {
      'id': d['id'] ?? doc.id,
      'questionText': d['questionText'],
      'options': (d['options'] as List?)?.cast<String>() ?? <String>[],
      'category': d['category'],
      'difficulty': d['difficulty'] ?? QuestionDifficulty.medium.name,
      'timeLimitSeconds': d['timeLimitSeconds'] ?? 30,
      'createdAt': _dateToIso(d['createdAt']),
    };
    return Question.fromJson(json);
  }

  String _dateToIso(dynamic v) {
    if (v == null) return DateTime.now().toIso8601String();
    if (v is Timestamp) return v.toDate().toIso8601String();
    if (v is DateTime) return v.toIso8601String();
    if (v is String) return DateTime.parse(v).toIso8601String();
    return DateTime.now().toIso8601String();
  }
}
