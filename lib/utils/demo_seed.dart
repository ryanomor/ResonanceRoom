import 'package:cloud_firestore/cloud_firestore.dart';

class DemoSeeder {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  Future<void> seedNYC() async {
    // Idempotent: if the primary room exists, skip creating duplicates
    final roomId = 'nyc_mixer_1';
    final liveRoomId = 'nyc_mixer_live';

    // Predefined users
    final users = [
      {
        'id': 'u_brooklyn_amy',
        'email': 'amy.brooklyn@example.com',
        'username': 'Amy',
        'gender': 'female',
        'city': 'Brooklyn, New York, United States',
        'bio': 'Coffee lover ☕ | Board games and trivia night',
      },
      {
        'id': 'u_brooklyn_mike',
        'email': 'mike.brooklyn@example.com',
        'username': 'Mike',
        'gender': 'male',
        'city': 'Brooklyn, New York, United States',
        'bio': 'Runner 🏃 | Tech enthusiast',
      },
      {
        'id': 'u_queens_sara',
        'email': 'sara.queens@example.com',
        'username': 'Sara',
        'gender': 'female',
        'city': 'Queens, New York, United States',
        'bio': 'Artist 🎨 | Music festivals',
      },
      {
        'id': 'u_queens_jay',
        'email': 'jay.queens@example.com',
        'username': 'Jay',
        'gender': 'male',
        'city': 'Queens, New York, United States',
        'bio': 'Foodie 🍣 | Knicks fan',
      },
      {
        'id': 'u_nyc_lena',
        'email': 'lena.nyc@example.com',
        'username': 'Lena',
        'gender': 'female',
        'city': 'New York, New York, United States',
        'bio': 'Product designer ✨ | Yoga + travel',
      },
      {
        'id': 'u_nyc_omar',
        'email': 'omar.nyc@example.com',
        'username': 'Omar',
        'gender': 'male',
        'city': 'New York, New York, United States',
        'bio': 'Standup comedy fan 🎤 | Street photography',
      },
    ];

    final now = DateTime.now();

    // Seed users with stable ids
    for (final u in users) {
      final docRef = _db.collection('users').doc(u['id'] as String);
      final exists = await docRef.get();
      if (!exists.exists) {
        await docRef.set({
          'id': u['id'],
          'email': u['email'],
          'username': u['username'],
          'avatarUrl': null,
          'city': u['city'],
          'bio': u['bio'],
          'gender': u['gender'],
          'createdAt': now.toIso8601String(),
          'updatedAt': now.toIso8601String(),
          'isActive': true,
          'totalGamesPlayed': 0,
          'totalMatches': 0,
        });
      }
    }

    // Seed a handful of questions
    final questions = [
      {
        'id': 'q1',
        'questionText': 'Which weekend plan sounds most fun?',
        'options': ['Museum day', 'Hiking', 'Cooking class', 'Beach hang'],
        'category': 'vibes',
      },
      {
        'id': 'q2',
        'questionText': 'Pick a New York snack:',
        'options': ['Bagel + schmear', 'Dollar slice', 'Halal cart', 'Ramen'],
        'category': 'food',
      },
      {
        'id': 'q3',
        'questionText': 'Ideal first hangout?',
        'options': ['Coffee', 'Drinks', 'Walk in the park', 'Live show'],
        'category': 'date',
      },
      {
        'id': 'q4',
        'questionText': 'You get one ticket to:',
        'options': ['Comedy', 'Concert', 'Broadway', 'Sports'],
        'category': 'events',
      },
      {
        'id': 'q5',
        'questionText': 'Night owl or early bird?',
        'options': ['Night owl', 'Early bird', 'Depends on the day', 'Perpetual napper'],
        'category': 'lifestyle',
      },
      {
        'id': 'q6',
        'questionText': 'Pick a borough energy:',
        'options': ['Manhattan', 'Brooklyn', 'Queens', 'Bronx/Staten'],
        'category': 'nyc',
      },
      {
        'id': 'q7',
        'questionText': 'How do you recharge?',
        'options': ['Solo time', 'Close friends', 'Outdoors', 'Creative work'],
        'category': 'vibes',
      },
      {
        'id': 'q8',
        'questionText': 'Your texting style:',
        'options': ['Short + quick', 'Paragraphs', 'Voice notes', 'Memes/gifs'],
        'category': 'communication',
      },
    ];

    for (final q in questions) {
      final docRef = _db.collection('questions').doc(q['id'] as String);
      final exists = await docRef.get();
      if (!exists.exists) {
        await docRef.set({
          'id': q['id'],
          'questionText': q['questionText'],
          'options': q['options'],
          'category': q['category'],
          'difficulty': 'medium',
          'timeLimitSeconds': 30,
          'createdAt': now.toIso8601String(),
        });
      }
    }

    // Primary room (waiting)
    final roomDoc = _db.collection('rooms').doc(roomId);
    final roomExists = await roomDoc.get();
    if (!roomExists.exists) {
      await roomDoc.set({
        'id': roomId,
        'hostId': 'u_nyc_lena',
        'city': 'New York, New York, United States',
        'title': 'NYC EchoMatch Mixer',
        'description': 'A quick-fire mini game to find great vibes near you.',
        'maxParticipants': 10,
        'status': 'waiting',
        'entryFee': 0.0,
        'scheduledStart': now.add(const Duration(hours: 1)).toIso8601String(),
        'actualStart': null,
        'actualEnd': null,
        'scheduledEnd': null,
        'createdAt': now.toIso8601String(),
        'updatedAt': now.toIso8601String(),
        'currentParticipants': 6,
        'questionIds': ['q1','q2','q3','q4','q5'],
        'venueAddress': null,
        'requiresGenderParity': true,
      });
    }

    // Live room (in progress) with a session
    final liveRoomDoc = _db.collection('rooms').doc(liveRoomId);
    final liveRoomSnap = await liveRoomDoc.get();
    if (!liveRoomSnap.exists) {
      await liveRoomDoc.set({
        'id': liveRoomId,
        'hostId': 'u_nyc_lena',
        'city': 'New York, New York, United States',
        'title': 'NYC Live Game',
        'description': 'Jump in to test the full flow now.',
        'maxParticipants': 10,
        'status': 'inProgress',
        'entryFee': 0.0,
        'scheduledStart': now.subtract(const Duration(minutes: 15)).toIso8601String(),
        'actualStart': now.subtract(const Duration(minutes: 10)).toIso8601String(),
        'actualEnd': null,
        'scheduledEnd': null,
        'createdAt': now.toIso8601String(),
        'updatedAt': now.toIso8601String(),
        'currentParticipants': 6,
        'questionIds': ['q1','q2','q3','q4','q5'],
        'venueAddress': null,
        'requiresGenderParity': true,
      });

      final sessionId = 'gs_nyc_live';
      final sessionDoc = _db.collection('gameSessions').doc(sessionId);
      await sessionDoc.set({
        'id': sessionId,
        'roomId': liveRoomId,
        'currentQuestionIndex': 0,
        'questionIds': ['q1','q2','q3','q4','q5'],
        'gameState': 'question',
        'questionStartTime': now.toIso8601String(),
        'questionEndTime': now.add(const Duration(seconds: 30)).toIso8601String(),
        'createdAt': now.toIso8601String(),
        'updatedAt': now.toIso8601String(),
        'isTest': false,
      });
    }

    // Participants for both rooms (paid = approved)
    final participantUserIds = users.map((u) => u['id'] as String).toList();
    for (final rid in [roomId, liveRoomId]) {
      for (final uid in participantUserIds) {
        final id = '$rid:$uid';
        final docRef = _db.collection('roomParticipants').doc(id);
        final exists = await docRef.get();
        if (!exists.exists) {
          await docRef.set({
            'id': id,
            'roomId': rid,
            'userId': uid,
            'status': 'paid',
            'requestedAt': now.subtract(const Duration(minutes: 30)).toIso8601String(),
            'approvedAt': now.subtract(const Duration(minutes: 25)).toIso8601String(),
            'paidAt': now.subtract(const Duration(minutes: 20)).toIso8601String(),
            'paymentReference': 'demo',
            'score': 0,
            'createdAt': now.toIso8601String(),
            'updatedAt': now.toIso8601String(),
          });
        }
      }
    }
  }
}
