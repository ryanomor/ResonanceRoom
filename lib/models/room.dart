enum RoomStatus { waiting, inProgress, completed }

class Room {
  final String id;
  final String hostId;
  final String city;
  final String title;
  final String description;
  final int maxParticipants;
  final RoomStatus status;
  final double entryFee;
  final DateTime scheduledStart;
  final DateTime? actualStart;
  final DateTime? actualEnd;
  final DateTime? scheduledEnd;
  final DateTime createdAt;
  final DateTime updatedAt;
  final int currentParticipants;
  final List<String> questionIds;
  final String? venueAddress;
  final bool requiresGenderParity;

  Room({
    required this.id,
    required this.hostId,
    required this.city,
    required this.title,
    required this.description,
    this.maxParticipants = 10,
    this.status = RoomStatus.waiting,
    this.entryFee = 0.0,
    required this.scheduledStart,
    this.actualStart,
    this.actualEnd,
    this.scheduledEnd,
    required this.createdAt,
    required this.updatedAt,
    this.currentParticipants = 0,
    this.questionIds = const [],
    this.venueAddress,
    this.requiresGenderParity = true,
  });

  factory Room.fromJson(Map<String, dynamic> json) => Room(
    id: json['id'] as String,
    hostId: json['hostId'] as String,
    city: json['city'] as String,
    title: json['title'] as String,
    description: json['description'] as String,
    maxParticipants: json['maxParticipants'] as int? ?? 10,
    status: RoomStatus.values.firstWhere((e) => e.name == json['status'], orElse: () => RoomStatus.waiting),
    entryFee: (json['entryFee'] as num?)?.toDouble() ?? 0.0,
    scheduledStart: DateTime.parse(json['scheduledStart'] as String),
    actualStart: json['actualStart'] != null ? DateTime.parse(json['actualStart'] as String) : null,
    actualEnd: json['actualEnd'] != null ? DateTime.parse(json['actualEnd'] as String) : null,
    scheduledEnd: json['scheduledEnd'] != null ? DateTime.parse(json['scheduledEnd'] as String) : null,
    createdAt: DateTime.parse(json['createdAt'] as String),
    updatedAt: DateTime.parse(json['updatedAt'] as String),
    currentParticipants: json['currentParticipants'] as int? ?? 0,
    questionIds: (json['questionIds'] as List?)?.cast<String>() ?? const [],
    venueAddress: json['venueAddress'] as String?,
    requiresGenderParity: json['requiresGenderParity'] as bool? ?? true,
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'hostId': hostId,
    'city': city,
    'title': title,
    'description': description,
    'maxParticipants': maxParticipants,
    'status': status.name,
    'entryFee': entryFee,
    'scheduledStart': scheduledStart.toIso8601String(),
    'actualStart': actualStart?.toIso8601String(),
    'actualEnd': actualEnd?.toIso8601String(),
    'scheduledEnd': scheduledEnd?.toIso8601String(),
    'createdAt': createdAt.toIso8601String(),
    'updatedAt': updatedAt.toIso8601String(),
    'currentParticipants': currentParticipants,
    'questionIds': questionIds,
    'venueAddress': venueAddress,
    'requiresGenderParity': requiresGenderParity,
  };

  Room copyWith({
    String? id,
    String? hostId,
    String? city,
    String? title,
    String? description,
    int? maxParticipants,
    RoomStatus? status,
    double? entryFee,
    DateTime? scheduledStart,
    DateTime? actualStart,
    DateTime? actualEnd,
    DateTime? scheduledEnd,
    DateTime? createdAt,
    DateTime? updatedAt,
    int? currentParticipants,
    List<String>? questionIds,
    String? venueAddress,
    bool? requiresGenderParity,
  }) => Room(
    id: id ?? this.id,
    hostId: hostId ?? this.hostId,
    city: city ?? this.city,
    title: title ?? this.title,
    description: description ?? this.description,
    maxParticipants: maxParticipants ?? this.maxParticipants,
    status: status ?? this.status,
    entryFee: entryFee ?? this.entryFee,
    scheduledStart: scheduledStart ?? this.scheduledStart,
    actualStart: actualStart ?? this.actualStart,
    actualEnd: actualEnd ?? this.actualEnd,
    scheduledEnd: scheduledEnd ?? this.scheduledEnd,
    createdAt: createdAt ?? this.createdAt,
    updatedAt: updatedAt ?? this.updatedAt,
    currentParticipants: currentParticipants ?? this.currentParticipants,
    questionIds: questionIds ?? this.questionIds,
    venueAddress: venueAddress ?? this.venueAddress,
    requiresGenderParity: requiresGenderParity ?? this.requiresGenderParity,
  );
}
