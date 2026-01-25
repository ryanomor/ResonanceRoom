class ChatMessage {
  final String id;
  final String matchId;
  final String senderId;
  final String messageText;
  final DateTime sentAt;
  final DateTime? readAt;
  final DateTime createdAt;

  ChatMessage({
    required this.id,
    required this.matchId,
    required this.senderId,
    required this.messageText,
    required this.sentAt,
    this.readAt,
    required this.createdAt,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) => ChatMessage(
    id: json['id'] as String,
    matchId: json['matchId'] as String,
    senderId: json['senderId'] as String,
    messageText: json['messageText'] as String,
    sentAt: DateTime.parse(json['sentAt'] as String),
    readAt: json['readAt'] != null ? DateTime.parse(json['readAt'] as String) : null,
    createdAt: DateTime.parse(json['createdAt'] as String),
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'matchId': matchId,
    'senderId': senderId,
    'messageText': messageText,
    'sentAt': sentAt.toIso8601String(),
    'readAt': readAt?.toIso8601String(),
    'createdAt': createdAt.toIso8601String(),
  };

  ChatMessage copyWith({
    String? id,
    String? matchId,
    String? senderId,
    String? messageText,
    DateTime? sentAt,
    DateTime? readAt,
    DateTime? createdAt,
  }) => ChatMessage(
    id: id ?? this.id,
    matchId: matchId ?? this.matchId,
    senderId: senderId ?? this.senderId,
    messageText: messageText ?? this.messageText,
    sentAt: sentAt ?? this.sentAt,
    readAt: readAt ?? this.readAt,
    createdAt: createdAt ?? this.createdAt,
  );
}
