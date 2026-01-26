import 'package:flutter/foundation.dart';

enum AppNotificationType { gameStartingSoon, joinRequestUpdate, newCityGame }

class AppNotification {
  final String id;
  final AppNotificationType type;
  final String title;
  final String? message;
  final DateTime createdAt;
  final DateTime updatedAt;

  AppNotification({
    required this.id,
    required this.type,
    required this.title,
    this.message,
    required this.createdAt,
    required this.updatedAt,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) => AppNotification(
        id: json['id'] as String,
        type: AppNotificationType.values.firstWhere(
          (e) => e.name == json['type'],
          orElse: () => AppNotificationType.newCityGame,
        ),
        title: json['title'] as String? ?? '',
        message: json['message'] as String?,
        createdAt: DateTime.parse(json['createdAt'] as String),
        updatedAt: DateTime.parse(json['updatedAt'] as String),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type.name,
        'title': title,
        'message': message,
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
      };

  AppNotification copyWith({
    String? id,
    AppNotificationType? type,
    String? title,
    String? message,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) => AppNotification(
        id: id ?? this.id,
        type: type ?? this.type,
        title: title ?? this.title,
        message: message ?? this.message,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
      );
}
