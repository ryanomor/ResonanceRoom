enum QuestionDifficulty { easy, medium, hard }

class Question {
  final String id;
  final String questionText;
  final List<String> options;
  final String category;
  final QuestionDifficulty difficulty;
  final int timeLimitSeconds;
  final DateTime createdAt;

  Question({
    required this.id,
    required this.questionText,
    required this.options,
    required this.category,
    this.difficulty = QuestionDifficulty.medium,
    this.timeLimitSeconds = 30,
    required this.createdAt,
  });

  factory Question.fromJson(Map<String, dynamic> json) => Question(
    id: json['id'] as String,
    questionText: json['questionText'] as String,
    options: (json['options'] as List).cast<String>(),
    category: json['category'] as String,
    difficulty: QuestionDifficulty.values.firstWhere((e) => e.name == json['difficulty'], orElse: () => QuestionDifficulty.medium),
    timeLimitSeconds: json['timeLimitSeconds'] as int? ?? 30,
    createdAt: DateTime.parse(json['createdAt'] as String),
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'questionText': questionText,
    'options': options,
    'category': category,
    'difficulty': difficulty.name,
    'timeLimitSeconds': timeLimitSeconds,
    'createdAt': createdAt.toIso8601String(),
  };

  Question copyWith({
    String? id,
    String? questionText,
    List<String>? options,
    String? category,
    QuestionDifficulty? difficulty,
    int? timeLimitSeconds,
    DateTime? createdAt,
  }) => Question(
    id: id ?? this.id,
    questionText: questionText ?? this.questionText,
    options: options ?? this.options,
    category: category ?? this.category,
    difficulty: difficulty ?? this.difficulty,
    timeLimitSeconds: timeLimitSeconds ?? this.timeLimitSeconds,
    createdAt: createdAt ?? this.createdAt,
  );
}
