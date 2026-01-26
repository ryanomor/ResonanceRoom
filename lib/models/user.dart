enum Gender { male, female }

class User {
  final String id;
  final String email;
  final String username;
  final String? avatarUrl;
  final String city;
  final String? bio;
  final Gender gender;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? lastLoginAt;
  final bool isActive;
  final int totalGamesPlayed;
  final int totalMatches;
  final List<String> favoriteCities;

  User({
    required this.id,
    required this.email,
    required this.username,
    this.avatarUrl,
    required this.city,
    this.bio,
    required this.gender,
    required this.createdAt,
    required this.updatedAt,
    this.lastLoginAt,
    this.isActive = true,
    this.totalGamesPlayed = 0,
    this.totalMatches = 0,
    this.favoriteCities = const [],
  });

  factory User.fromJson(Map<String, dynamic> json) {
    final genderRaw = json['gender'];
    Gender parsedGender;
    if (genderRaw is String) {
      parsedGender = Gender.values.firstWhere(
        (g) => g.name.toLowerCase() == genderRaw.toLowerCase(),
        orElse: () => Gender.male,
      );
    } else if (genderRaw is int) {
      parsedGender = (genderRaw >= 0 && genderRaw < Gender.values.length)
          ? Gender.values[genderRaw]
          : Gender.male;
    } else {
      parsedGender = Gender.male;
    }

    final username = (json['username'] as String?)?.trim();
    final legacyDisplayName = (json['displayName'] as String?)?.trim();

    return User(
      id: json['id'] as String,
      email: json['email'] as String,
      username: (username == null || username.isEmpty)
          ? (legacyDisplayName ?? '')
          : username,
      avatarUrl: json['avatarUrl'] as String?,
      city: json['city'] as String,
      bio: json['bio'] as String?,
      gender: parsedGender,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      lastLoginAt: (json['lastLoginAt'] as String?) != null
          ? DateTime.parse(json['lastLoginAt'] as String)
          : null,
      isActive: json['isActive'] as bool? ?? true,
      totalGamesPlayed: json['totalGamesPlayed'] as int? ?? 0,
      totalMatches: json['totalMatches'] as int? ?? 0,
      favoriteCities: (json['favoriteCities'] is List)
          ? (json['favoriteCities'] as List)
              .whereType<dynamic>()
              .map((e) => e.toString())
              .toList()
          : const [],
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'email': email,
    'username': username,
    'avatarUrl': avatarUrl,
    'city': city,
    'bio': bio,
    'gender': gender.name,
    'createdAt': createdAt.toIso8601String(),
    'updatedAt': updatedAt.toIso8601String(),
    'lastLoginAt': lastLoginAt?.toIso8601String(),
    'isActive': isActive,
    'totalGamesPlayed': totalGamesPlayed,
    'totalMatches': totalMatches,
    'favoriteCities': favoriteCities,
  };

  User copyWith({
    String? id,
    String? email,
    String? username,
    String? avatarUrl,
    String? city,
    String? bio,
    Gender? gender,
    DateTime? createdAt,
    DateTime? updatedAt,
    DateTime? lastLoginAt,
    bool? isActive,
    int? totalGamesPlayed,
    int? totalMatches,
    List<String>? favoriteCities,
  }) => User(
    id: id ?? this.id,
    email: email ?? this.email,
    username: username ?? this.username,
    avatarUrl: avatarUrl ?? this.avatarUrl,
    city: city ?? this.city,
    bio: bio ?? this.bio,
    gender: gender ?? this.gender,
    createdAt: createdAt ?? this.createdAt,
    updatedAt: updatedAt ?? this.updatedAt,
    lastLoginAt: lastLoginAt ?? this.lastLoginAt,
    isActive: isActive ?? this.isActive,
    totalGamesPlayed: totalGamesPlayed ?? this.totalGamesPlayed,
    totalMatches: totalMatches ?? this.totalMatches,
    favoriteCities: favoriteCities ?? this.favoriteCities,
  );
}
