enum MatchStatus { active, chatted, expired }

class Match {
  final String id;
  final String gameSessionId;
  final String uid1;
  final String uid2;
  final DateTime matchedAt;
  final DateTime expiresAt;
  final MatchStatus status;
  final DateTime? firstChatAt;

  Match({
    required this.id,
    required this.gameSessionId,
    required this.uid1,
    required this.uid2,
    required this.matchedAt,
    required this.expiresAt,
    this.status = MatchStatus.active,
    this.firstChatAt,
  });

  factory Match.fromJson(Map<String, dynamic> json) => Match(
    id: json['id'] as String,
    gameSessionId: json['gameSessionId'] as String,
    uid1: json['uid1'] as String,
    uid2: json['uid2'] as String,
    matchedAt: DateTime.parse(json['matchedAt'] as String),
    expiresAt: DateTime.parse(json['expiresAt'] as String),
    status: MatchStatus.values.firstWhere((e) => e.name == json['status'], orElse: () => MatchStatus.active),
    firstChatAt: json['firstChatAt'] != null ? DateTime.parse(json['firstChatAt'] as String) : null,
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'gameSessionId': gameSessionId,
    'uid1': uid1,
    'uid2': uid2,
    'matchedAt': matchedAt.toIso8601String(),
    'expiresAt': expiresAt.toIso8601String(),
    'status': status.name,
    'firstChatAt': firstChatAt?.toIso8601String(),
  };

  Match copyWith({
    String? id,
    String? gameSessionId,
    String? uid1,
    String? uid2,
    DateTime? matchedAt,
    DateTime? expiresAt,
    MatchStatus? status,
    DateTime? firstChatAt,
  }) => Match(
    id: id ?? this.id,
    gameSessionId: gameSessionId ?? this.gameSessionId,
    uid1: uid1 ?? this.uid1,
    uid2: uid2 ?? this.uid2,
    matchedAt: matchedAt ?? this.matchedAt,
    expiresAt: expiresAt ?? this.expiresAt,
    status: status ?? this.status,
    firstChatAt: firstChatAt ?? this.firstChatAt,
  );

  String getOtherUserId(String currentUserId) => currentUserId == uid1 ? uid2 : uid1;
  bool isExpired() => DateTime.now().isAfter(expiresAt) && status == MatchStatus.active;
}
