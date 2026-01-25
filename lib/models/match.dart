enum MatchStatus { active, chatted, expired }

class Match {
  final String id;
  final String gameSessionId;
  final String user1Id;
  final String user2Id;
  final DateTime matchedAt;
  final DateTime expiresAt;
  final MatchStatus status;
  final DateTime? firstChatAt;

  Match({
    required this.id,
    required this.gameSessionId,
    required this.user1Id,
    required this.user2Id,
    required this.matchedAt,
    required this.expiresAt,
    this.status = MatchStatus.active,
    this.firstChatAt,
  });

  factory Match.fromJson(Map<String, dynamic> json) => Match(
    id: json['id'] as String,
    gameSessionId: json['gameSessionId'] as String,
    user1Id: json['user1Id'] as String,
    user2Id: json['user2Id'] as String,
    matchedAt: DateTime.parse(json['matchedAt'] as String),
    expiresAt: DateTime.parse(json['expiresAt'] as String),
    status: MatchStatus.values.firstWhere((e) => e.name == json['status'], orElse: () => MatchStatus.active),
    firstChatAt: json['firstChatAt'] != null ? DateTime.parse(json['firstChatAt'] as String) : null,
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'gameSessionId': gameSessionId,
    'user1Id': user1Id,
    'user2Id': user2Id,
    'matchedAt': matchedAt.toIso8601String(),
    'expiresAt': expiresAt.toIso8601String(),
    'status': status.name,
    'firstChatAt': firstChatAt?.toIso8601String(),
  };

  Match copyWith({
    String? id,
    String? gameSessionId,
    String? user1Id,
    String? user2Id,
    DateTime? matchedAt,
    DateTime? expiresAt,
    MatchStatus? status,
    DateTime? firstChatAt,
  }) => Match(
    id: id ?? this.id,
    gameSessionId: gameSessionId ?? this.gameSessionId,
    user1Id: user1Id ?? this.user1Id,
    user2Id: user2Id ?? this.user2Id,
    matchedAt: matchedAt ?? this.matchedAt,
    expiresAt: expiresAt ?? this.expiresAt,
    status: status ?? this.status,
    firstChatAt: firstChatAt ?? this.firstChatAt,
  );

  String getOtherUserId(String currentUserId) => currentUserId == user1Id ? user2Id : user1Id;
  bool isExpired() => DateTime.now().isAfter(expiresAt) && status == MatchStatus.active;
}
