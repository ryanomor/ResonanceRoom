class UserAnswer {
  final String id;
  final String gameSessionId;
  final String userId;
  final String questionId;
  final int selectedOption;
  final DateTime answeredAt;

  UserAnswer({
    required this.id,
    required this.gameSessionId,
    required this.userId,
    required this.questionId,
    required this.selectedOption,
    required this.answeredAt,
  });

  factory UserAnswer.fromJson(Map<String, dynamic> json) => UserAnswer(
    id: json['id'] as String,
    gameSessionId: json['gameSessionId'] as String,
    userId: json['userId'] as String,
    questionId: json['questionId'] as String,
    selectedOption: json['selectedOption'] is int
        ? json['selectedOption'] as int
        : int.tryParse(json['selectedOption']?.toString() ?? '') ?? 0,
    answeredAt: DateTime.parse(json['answeredAt'] as String),
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'gameSessionId': gameSessionId,
    'userId': userId,
    'questionId': questionId,
    'selectedOption': selectedOption,
    'answeredAt': answeredAt.toIso8601String(),
  };

  UserAnswer copyWith({
    String? id,
    String? gameSessionId,
    String? userId,
    String? questionId,
    int? selectedOption,
    DateTime? answeredAt,
  }) => UserAnswer(
    id: id ?? this.id,
    gameSessionId: gameSessionId ?? this.gameSessionId,
    userId: userId ?? this.userId,
    questionId: questionId ?? this.questionId,
    selectedOption: selectedOption ?? this.selectedOption,
    answeredAt: answeredAt ?? this.answeredAt,
  );
}
