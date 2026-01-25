class UserSelection {
  final String id;
  final String gameSessionId;
  final String questionId;
  final String selectorUserId;
  final String selectedUserId;
  final DateTime createdAt;

  UserSelection({
    required this.id,
    required this.gameSessionId,
    required this.questionId,
    required this.selectorUserId,
    required this.selectedUserId,
    required this.createdAt,
  });

  factory UserSelection.fromJson(Map<String, dynamic> json) => UserSelection(
    id: json['id'] as String,
    gameSessionId: json['gameSessionId'] as String,
    questionId: json['questionId'] as String,
    selectorUserId: json['selectorUserId'] as String,
    selectedUserId: json['selectedUserId'] as String,
    createdAt: DateTime.parse(json['createdAt'] as String),
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'gameSessionId': gameSessionId,
    'questionId': questionId,
    'selectorUserId': selectorUserId,
    'selectedUserId': selectedUserId,
    'createdAt': createdAt.toIso8601String(),
  };

  UserSelection copyWith({
    String? id,
    String? gameSessionId,
    String? questionId,
    String? selectorUserId,
    String? selectedUserId,
    DateTime? createdAt,
  }) => UserSelection(
    id: id ?? this.id,
    gameSessionId: gameSessionId ?? this.gameSessionId,
    questionId: questionId ?? this.questionId,
    selectorUserId: selectorUserId ?? this.selectorUserId,
    selectedUserId: selectedUserId ?? this.selectedUserId,
    createdAt: createdAt ?? this.createdAt,
  );
}
