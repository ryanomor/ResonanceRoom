enum ParticipantStatus { pending, approved, rejected, paid, inGame }

enum ParticipantRole { player, host }

class RoomParticipant {
  final String id;
  final String roomId;
  final String userId;
  final ParticipantStatus status;
  final ParticipantRole role;
  final DateTime requestedAt;
  final DateTime? approvedAt;
  final DateTime? paidAt;
  final String? paymentReference;
  final int score;
  final DateTime createdAt;
  final DateTime updatedAt;

  RoomParticipant({
    required this.id,
    required this.roomId,
    required this.userId,
    this.status = ParticipantStatus.pending,
    this.role = ParticipantRole.player,
    required this.requestedAt,
    this.approvedAt,
    this.paidAt,
    this.paymentReference,
    this.score = 0,
    required this.createdAt,
    required this.updatedAt,
  });

  factory RoomParticipant.fromJson(Map<String, dynamic> json) => RoomParticipant(
    id: json['id'] as String,
    roomId: json['roomId'] as String,
    userId: json['userId'] as String,
    status: ParticipantStatus.values.firstWhere((e) => e.name == json['status'], orElse: () => ParticipantStatus.pending),
    role: ParticipantRole.values.firstWhere((e) => e.name == (json['role'] as String? ?? 'player'), orElse: () => ParticipantRole.player),
    requestedAt: DateTime.parse(json['requestedAt'] as String),
    approvedAt: json['approvedAt'] != null ? DateTime.parse(json['approvedAt'] as String) : null,
    paidAt: json['paidAt'] != null ? DateTime.parse(json['paidAt'] as String) : null,
    paymentReference: json['paymentReference'] as String?,
    score: json['score'] as int? ?? 0,
    createdAt: DateTime.parse(json['createdAt'] as String),
    updatedAt: DateTime.parse(json['updatedAt'] as String),
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'roomId': roomId,
    'userId': userId,
    'status': status.name,
    'role': role.name,
    'requestedAt': requestedAt.toIso8601String(),
    'approvedAt': approvedAt?.toIso8601String(),
    'paidAt': paidAt?.toIso8601String(),
    'paymentReference': paymentReference,
    'score': score,
    'createdAt': createdAt.toIso8601String(),
    'updatedAt': updatedAt.toIso8601String(),
  };

  RoomParticipant copyWith({
    String? id,
    String? roomId,
    String? userId,
    ParticipantStatus? status,
    ParticipantRole? role,
    DateTime? requestedAt,
    DateTime? approvedAt,
    DateTime? paidAt,
    String? paymentReference,
    int? score,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) => RoomParticipant(
    id: id ?? this.id,
    roomId: roomId ?? this.roomId,
    userId: userId ?? this.userId,
    status: status ?? this.status,
    role: role ?? this.role,
    requestedAt: requestedAt ?? this.requestedAt,
    approvedAt: approvedAt ?? this.approvedAt,
    paidAt: paidAt ?? this.paidAt,
    paymentReference: paymentReference ?? this.paymentReference,
    score: score ?? this.score,
    createdAt: createdAt ?? this.createdAt,
    updatedAt: updatedAt ?? this.updatedAt,
  );
}
