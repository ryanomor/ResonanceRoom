enum GameState { question, selection, transition, ended }

class GameSession {
  final String id;
  final String roomId;
  final int currentQuestionIndex;
  final List<String> questionIds;
  final GameState gameState;
  final DateTime? questionStartTime;
  final DateTime? questionEndTime;
  final DateTime createdAt;
  final DateTime updatedAt;
  final bool isTest;

  GameSession({
    required this.id,
    required this.roomId,
    this.currentQuestionIndex = 0,
    required this.questionIds,
    this.gameState = GameState.question,
    this.questionStartTime,
    this.questionEndTime,
    required this.createdAt,
    required this.updatedAt,
    this.isTest = false,
  });

  factory GameSession.fromJson(Map<String, dynamic> json) => GameSession(
    id: json['id'] as String,
    roomId: json['roomId'] as String,
    currentQuestionIndex: json['currentQuestionIndex'] as int? ?? 0,
    questionIds: (json['questionIds'] as List).cast<String>(),
    gameState: GameState.values.firstWhere((e) => e.name == json['gameState'], orElse: () => GameState.question),
    questionStartTime: json['questionStartTime'] != null ? DateTime.parse(json['questionStartTime'] as String) : null,
    questionEndTime: json['questionEndTime'] != null ? DateTime.parse(json['questionEndTime'] as String) : null,
    createdAt: DateTime.parse(json['createdAt'] as String),
    updatedAt: DateTime.parse(json['updatedAt'] as String),
    isTest: json['isTest'] as bool? ?? false,
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'roomId': roomId,
    'currentQuestionIndex': currentQuestionIndex,
    'questionIds': questionIds,
    'gameState': gameState.name,
    'questionStartTime': questionStartTime?.toIso8601String(),
    'questionEndTime': questionEndTime?.toIso8601String(),
    'createdAt': createdAt.toIso8601String(),
    'updatedAt': updatedAt.toIso8601String(),
    'isTest': isTest,
  };

  GameSession copyWith({
    String? id,
    String? roomId,
    int? currentQuestionIndex,
    List<String>? questionIds,
    GameState? gameState,
    DateTime? questionStartTime,
    DateTime? questionEndTime,
    DateTime? createdAt,
    DateTime? updatedAt,
    bool? isTest,
  }) => GameSession(
    id: id ?? this.id,
    roomId: roomId ?? this.roomId,
    currentQuestionIndex: currentQuestionIndex ?? this.currentQuestionIndex,
    questionIds: questionIds ?? this.questionIds,
    gameState: gameState ?? this.gameState,
    questionStartTime: questionStartTime ?? this.questionStartTime,
    questionEndTime: questionEndTime ?? this.questionEndTime,
    createdAt: createdAt ?? this.createdAt,
    updatedAt: updatedAt ?? this.updatedAt,
    isTest: isTest ?? this.isTest,
  );

  String? get currentQuestionId => currentQuestionIndex < questionIds.length ? questionIds[currentQuestionIndex] : null;
  bool get hasMoreQuestions => currentQuestionIndex < questionIds.length - 1;
}
