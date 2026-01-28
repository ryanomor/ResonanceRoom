import 'package:flutter/foundation.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:uuid/uuid.dart';
import 'package:echomatch/models/game_session.dart';
import 'package:echomatch/models/user_answer.dart';
import 'package:echomatch/models/user_selection.dart';
import 'package:echomatch/services/question_service.dart';
import 'package:echomatch/services/room_service.dart';
import 'package:echomatch/models/room.dart';
import 'package:echomatch/services/room_participant_service.dart';

class GameService extends ChangeNotifier {
  final _db = FirebaseFirestore.instance;

  GameSession? _currentSession;
  Map<String, String> _currentRoundAnswers = {};
  Set<String> _currentRoundSelections = {};

  GameSession? get currentSession => _currentSession;
  Map<String, String> get currentRoundAnswers => _currentRoundAnswers;
  Set<String> get currentRoundSelections => _currentRoundSelections;

  // Returns a stream of the unique answer count for the current question in the active session
  Stream<int> answeredCountStream() {
    if (_currentSession == null || _currentSession!.currentQuestionId == null) {
      return const Stream<int>.empty();
    }
    final sessionId = _currentSession!.id;
    final questionId = _currentSession!.currentQuestionId!;
    return _db
        .collection('userAnswers')
        .where('gameSessionId', isEqualTo: sessionId)
        .where('questionId', isEqualTo: questionId)
        .snapshots()
        .map((snap) {
      final ids = <String>{};
      for (final d in snap.docs) {
        final data = d.data();
        final uid = data['userId'] as String?;
        if (uid != null) ids.add(uid);
      }
      return ids.length;
    });
  }

  // Returns the number of expected participants (players only, excludes hosts) for the current room
  Future<int> expectedParticipantsCount() async {
    if (_currentSession == null) return 0;
    try {
      final roomId = _currentSession!.roomId;
      final players = await RoomParticipantService().getApprovedParticipants(roomId);
      return players.length;
    } catch (e) {
      debugPrint('expectedParticipantsCount error: $e');
      return 0;
    }
  }

  Future<GameSession> createGameSession(String roomId, int questionCount, {bool isTest = false}) async {
    final questionService = QuestionService();
    final room = await RoomService().getRoomById(roomId);
    List<String> questionIds;
    if (room != null && room.questionIds.isNotEmpty) {
      questionIds = room.questionIds;
    } else {
      final questions = await questionService.getRandomQuestions(questionCount);
      questionIds = questions.map((q) => q.id).toList();
    }
    
    final session = GameSession(
      id: const Uuid().v4(),
      roomId: roomId,
      questionIds: questionIds,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
      isTest: isTest,
    );

    await _saveSession(session);
    _currentSession = session;
    notifyListeners();
    return session;
  }

  Future<GameSession?> getSessionByRoomId(String roomId) async {
    try {
      final snap = await _db.collection('gameSessions').where('roomId', isEqualTo: roomId).limit(1).get();
      if (snap.docs.isEmpty) return null;
      final found = _fromSessionDoc(snap.docs.first);
      _currentSession = found;
      notifyListeners();
      return found;
    } catch (e) {
      debugPrint('Failed to load session by roomId: $e');
      return null;
    }
  }

  Future<void> startQuestion() async {
    if (_currentSession == null) return;

    final now = DateTime.now();
    final question = await QuestionService().getQuestionById(_currentSession!.currentQuestionId!);
    
    _currentSession = _currentSession!.copyWith(
      gameState: GameState.question,
      questionStartTime: now,
      questionEndTime: now.add(Duration(seconds: question?.timeLimitSeconds ?? 30)),
      updatedAt: now,
    );

    _currentRoundAnswers = {};
    await _saveSession(_currentSession!);
    notifyListeners();
    // After recording an answer, check if everyone has answered and move to selection if so
    await _checkAndStartSelectionIfReady();
  }

  Future<void> submitAnswer(String userId, String selectedOption) async {
    if (_currentSession == null || _currentSession!.currentQuestionId == null) return;

    try {
      final room = await RoomService().getRoomById(_currentSession!.roomId);
      if (room != null && room.hostId == userId) {
        debugPrint('Host attempted to submit an answer; ignoring.');
        return;
      }
    } catch (e) {
      debugPrint('submitAnswer host check failed: $e');
    }

    final answer = UserAnswer(
      id: const Uuid().v4(),
      gameSessionId: _currentSession!.id,
      userId: userId,
      questionId: _currentSession!.currentQuestionId!,
      selectedOption: selectedOption,
      answeredAt: DateTime.now(),
    );

    await _saveAnswer(answer);
    _currentRoundAnswers[userId] = selectedOption;
    notifyListeners();
    // After recording an answer, check if everyone has answered and move to selection if so
    await _checkAndStartSelectionIfReady();
  }

  Future<void> startSelection() async {
    if (_currentSession == null) return;

    _currentSession = _currentSession!.copyWith(
      gameState: GameState.selection,
      updatedAt: DateTime.now(),
    );

    _currentRoundSelections = {};
    await _saveSession(_currentSession!);
    notifyListeners();
  }

  /// Host can force end of question and open selection for everyone
  Future<void> endQuestionByHost() async => startSelection();

  /// Returns true if all approved participants in the room have answered the current question
  Future<bool> haveAllParticipantsAnswered() async {
    if (_currentSession == null || _currentSession!.currentQuestionId == null) return false;
    try {
      final roomId = _currentSession!.roomId;
      final expected = (await RoomParticipantService().getApprovedParticipants(roomId)).length;
      final answers = await _getAnswersForQuestion(_currentSession!.id, _currentSession!.currentQuestionId!);
      final uniqueAnswered = answers.map((a) => a.userId).toSet().length;
      if (expected == 0) {
        // Fallback: if no participant records, consider current unique responders as the group
        return uniqueAnswered > 0; // single-player test flows proceed after first answer
      }
      return uniqueAnswered >= expected;
    } catch (e) {
      debugPrint('haveAllParticipantsAnswered error: $e');
      return false;
    }
  }

  Future<void> _checkAndStartSelectionIfReady() async {
    final allAnswered = await haveAllParticipantsAnswered();
    if (allAnswered) {
      await startSelection();
    }
  }

  Future<Map<String, List<String>>> getUsersByAnswer() async {
    if (_currentSession == null) return {};

    final answers = await _getAnswersForQuestion(_currentSession!.id, _currentSession!.currentQuestionId!);
    final groupedUsers = <String, List<String>>{};

    for (final answer in answers) {
      groupedUsers.putIfAbsent(answer.selectedOption, () => []).add(answer.userId);
    }

    return groupedUsers;
  }

  Future<void> submitSelection(String selectorUserId, String selectedUserId) async {
    if (_currentSession == null || _currentSession!.currentQuestionId == null) return;

    final selection = UserSelection(
      id: const Uuid().v4(),
      gameSessionId: _currentSession!.id,
      questionId: _currentSession!.currentQuestionId!,
      selectorUserId: selectorUserId,
      selectedUserId: selectedUserId,
      createdAt: DateTime.now(),
    );

    await _saveSelection(selection);
    _currentRoundSelections.add(selectedUserId);
    notifyListeners();
  }

  Future<void> nextQuestion() async {
    if (_currentSession == null) return;

    if (_currentSession!.hasMoreQuestions) {
      _currentSession = _currentSession!.copyWith(
        currentQuestionIndex: _currentSession!.currentQuestionIndex + 1,
        gameState: GameState.question,
        updatedAt: DateTime.now(),
      );
      await _saveSession(_currentSession!);
    } else {
      _currentSession = _currentSession!.copyWith(
        gameState: GameState.ended,
        updatedAt: DateTime.now(),
      );
      await _saveSession(_currentSession!);
    }
    notifyListeners();
  }

  Future<List<UserAnswer>> _getAnswersForQuestion(String sessionId, String questionId) async {
    try {
      final snap = await _db.collection('userAnswers')
          .where('gameSessionId', isEqualTo: sessionId)
          .where('questionId', isEqualTo: questionId)
          .get();
      return snap.docs.map(_fromAnswerDoc).toList();
    } catch (e) {
      debugPrint('Failed to get answers for session/question: $e');
      return [];
    }
  }

  Future<List<UserSelection>> getAllSelectionsForSession(String sessionId) async {
    try {
      final snap = await _db.collection('userSelections')
          .where('gameSessionId', isEqualTo: sessionId)
          .get();
      return snap.docs.map(_fromSelectionDoc).toList();
    } catch (e) {
      debugPrint('Failed to get selections for session: $e');
      return [];
    }
  }

  Future<void> _saveSession(GameSession session) async {
    try {
      await _db.collection('gameSessions').doc(session.id).set(_toSessionMap(session), SetOptions(merge: true));
    } catch (e) {
      debugPrint('Failed to save session: $e');
    }
  }

  Future<void> _saveAnswer(UserAnswer answer) async {
    try {
      await _db.collection('userAnswers').doc(answer.id).set(_toAnswerMap(answer));
    } catch (e) {
      debugPrint('Failed to save answer: $e');
    }
  }

  Future<void> _saveSelection(UserSelection selection) async {
    try {
      await _db.collection('userSelections').doc(selection.id).set(_toSelectionMap(selection));
    } catch (e) {
      debugPrint('Failed to save selection: $e');
    }
  }

  GameSession _fromSessionDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final d = doc.data() ?? {};
    final json = {
      'id': d['id'] ?? doc.id,
      'roomId': d['roomId'],
      'currentQuestionIndex': d['currentQuestionIndex'] ?? 0,
      'questionIds': (d['questionIds'] as List?)?.cast<String>() ?? <String>[],
      'gameState': d['gameState'] ?? GameState.question.name,
      'questionStartTime': d['questionStartTime'] != null ? _dateToIso(d['questionStartTime']) : null,
      'questionEndTime': d['questionEndTime'] != null ? _dateToIso(d['questionEndTime']) : null,
      'createdAt': _dateToIso(d['createdAt']),
      'updatedAt': _dateToIso(d['updatedAt']),
      'isTest': d['isTest'] ?? false,
    };
    return GameSession.fromJson(json);
  }

  Map<String, dynamic> _toSessionMap(GameSession s) => {
        'id': s.id,
        'roomId': s.roomId,
        'currentQuestionIndex': s.currentQuestionIndex,
        'questionIds': s.questionIds,
        'gameState': s.gameState.name,
        'questionStartTime': s.questionStartTime?.toIso8601String(),
        'questionEndTime': s.questionEndTime?.toIso8601String(),
        'createdAt': s.createdAt.toIso8601String(),
        'updatedAt': s.updatedAt.toIso8601String(),
        'isTest': s.isTest,
      };

  UserAnswer _fromAnswerDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final d = doc.data() ?? {};
    final json = {
      'id': d['id'] ?? doc.id,
      'gameSessionId': d['gameSessionId'],
      'userId': d['userId'],
      'questionId': d['questionId'],
      'selectedOption': d['selectedOption'],
      'answeredAt': _dateToIso(d['answeredAt']),
    };
    return UserAnswer.fromJson(json);
  }

  Map<String, dynamic> _toAnswerMap(UserAnswer a) => {
        'id': a.id,
        'gameSessionId': a.gameSessionId,
        'userId': a.userId,
        'questionId': a.questionId,
        'selectedOption': a.selectedOption,
        'answeredAt': a.answeredAt.toIso8601String(),
      };

  UserSelection _fromSelectionDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final d = doc.data() ?? {};
    final json = {
      'id': d['id'] ?? doc.id,
      'gameSessionId': d['gameSessionId'],
      'questionId': d['questionId'],
      'selectorUserId': d['selectorUserId'],
      'selectedUserId': d['selectedUserId'],
      'createdAt': _dateToIso(d['createdAt']),
    };
    return UserSelection.fromJson(json);
  }

  Map<String, dynamic> _toSelectionMap(UserSelection s) => {
        'id': s.id,
        'gameSessionId': s.gameSessionId,
        'questionId': s.questionId,
        'selectorUserId': s.selectorUserId,
        'selectedUserId': s.selectedUserId,
        'createdAt': s.createdAt.toIso8601String(),
      };

  String _dateToIso(dynamic v) {
    if (v == null) return DateTime.now().toIso8601String();
    if (v is Timestamp) return v.toDate().toIso8601String();
    if (v is DateTime) return v.toIso8601String();
    if (v is String) return DateTime.parse(v).toIso8601String();
    return DateTime.now().toIso8601String();
  }
}
