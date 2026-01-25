import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// Initialize Admin SDK once
if (!admin.apps.length) {
  admin.initializeApp();
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const seed_nyc_demo = onRequest({ region: "us-central1" }, async (req, res) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.set(corsHeaders).status(204).send("");
    return;
  }

  try {
    // Require POST
    if (req.method !== "POST") {
      res.set(corsHeaders).status(405).json({ error: "Method not allowed" });
      return;
    }

    // Verify Firebase Auth ID token from Authorization header
    const authHeader = req.headers["authorization"] as string | undefined;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.set(corsHeaders).status(401).json({ error: "Missing bearer token" });
      return;
    }

    const idToken = authHeader.substring("Bearer ".length);
    let decoded: admin.auth.DecodedIdToken;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch (e) {
      res.set(corsHeaders).status(401).json({ error: "Invalid token" });
      return;
    }

    const db = admin.firestore();
    const now = new Date().toISOString();

    // Predefined users
    const users = [
      { id: "u_brooklyn_amy", email: "amy.brooklyn@example.com", username: "Amy", gender: "female", city: "Brooklyn, New York, United States", bio: "Coffee lover ☕ | Board games and trivia night" },
      { id: "u_brooklyn_mike", email: "mike.brooklyn@example.com", username: "Mike", gender: "male", city: "Brooklyn, New York, United States", bio: "Runner 🏃 | Tech enthusiast" },
      { id: "u_queens_sara", email: "sara.queens@example.com", username: "Sara", gender: "female", city: "Queens, New York, United States", bio: "Artist 🎨 | Music festivals" },
      { id: "u_queens_jay", email: "jay.queens@example.com", username: "Jay", gender: "male", city: "Queens, New York, United States", bio: "Foodie 🍣 | Knicks fan" },
      { id: "u_nyc_lena", email: "lena.nyc@example.com", username: "Lena", gender: "female", city: "New York, New York, United States", bio: "Product designer ✨ | Yoga + travel" },
      { id: "u_nyc_omar", email: "omar.nyc@example.com", username: "Omar", gender: "male", city: "New York, New York, United States", bio: "Standup comedy fan 🎤 | Street photography" },
    ];

    // Idempotent user upserts
    for (const u of users) {
      const ref = db.collection("users").doc(u.id);
      const snap = await ref.get();
      if (!snap.exists) {
        await ref.set({
          id: u.id,
          email: u.email,
          username: u.username,
          avatarUrl: null,
          city: u.city,
          bio: u.bio,
          gender: u.gender,
          createdAt: now,
          updatedAt: now,
          isActive: true,
          totalGamesPlayed: 0,
          totalMatches: 0,
        });
      }
    }

    // Questions
    const questions = [
      { id: "q1", questionText: "Which weekend plan sounds most fun?", options: ["Museum day", "Hiking", "Cooking class", "Beach hang"], category: "vibes" },
      { id: "q2", questionText: "Pick a New York snack:", options: ["Bagel + schmear", "Dollar slice", "Halal cart", "Ramen"], category: "food" },
      { id: "q3", questionText: "Ideal first hangout?", options: ["Coffee", "Drinks", "Walk in the park", "Live show"], category: "date" },
      { id: "q4", questionText: "You get one ticket to:", options: ["Comedy", "Concert", "Broadway", "Sports"], category: "events" },
      { id: "q5", questionText: "Night owl or early bird?", options: ["Night owl", "Early bird", "Depends on the day", "Perpetual napper"], category: "lifestyle" },
      { id: "q6", questionText: "Pick a borough energy:", options: ["Manhattan", "Brooklyn", "Queens", "Bronx/Staten"], category: "nyc" },
      { id: "q7", questionText: "How do you recharge?", options: ["Solo time", "Close friends", "Outdoors", "Creative work"], category: "vibes" },
      { id: "q8", questionText: "Your texting style:", options: ["Short + quick", "Paragraphs", "Voice notes", "Memes/gifs"], category: "communication" },
    ];

    for (const q of questions) {
      const ref = db.collection("questions").doc(q.id);
      const snap = await ref.get();
      if (!snap.exists) {
        await ref.set({
          id: q.id,
          questionText: q.questionText,
          options: q.options,
          category: q.category,
          difficulty: "medium",
          timeLimitSeconds: 30,
          createdAt: now,
        });
      }
    }

    const roomId = "nyc_mixer_1";
    const liveRoomId = "nyc_mixer_live";

    // Room (waiting)
    const roomRef = db.collection("rooms").doc(roomId);
    const roomSnap = await roomRef.get();
    if (!roomSnap.exists) {
      await roomRef.set({
        id: roomId,
        hostId: "u_nyc_lena",
        city: "New York, New York, United States",
        title: "NYC EchoMatch Mixer",
        description: "A quick-fire mini game to find great vibes near you.",
        maxParticipants: 10,
        status: "waiting",
        entryFee: 0.0,
        scheduledStart: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        actualStart: null,
        actualEnd: null,
        scheduledEnd: null,
        createdAt: now,
        updatedAt: now,
        currentParticipants: 6,
        questionIds: ["q1", "q2", "q3", "q4", "q5"],
        venueAddress: null,
        requiresGenderParity: true,
      });
    }

    // Live room (in progress) + session
    const liveRoomRef = db.collection("rooms").doc(liveRoomId);
    const liveSnap = await liveRoomRef.get();
    if (!liveSnap.exists) {
      await liveRoomRef.set({
        id: liveRoomId,
        hostId: "u_nyc_lena",
        city: "New York, New York, United States",
        title: "NYC Live Game",
        description: "Jump in to test the full flow now.",
        maxParticipants: 10,
        status: "inProgress",
        entryFee: 0.0,
        scheduledStart: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        actualStart: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        actualEnd: null,
        scheduledEnd: null,
        createdAt: now,
        updatedAt: now,
        currentParticipants: 6,
        questionIds: ["q1", "q2", "q3", "q4", "q5"],
        venueAddress: null,
        requiresGenderParity: true,
      });

      const sessionId = "gs_nyc_live";
      await db.collection("gameSessions").doc(sessionId).set({
        id: sessionId,
        roomId: liveRoomId,
        currentQuestionIndex: 0,
        questionIds: ["q1", "q2", "q3", "q4", "q5"],
        gameState: "question",
        questionStartTime: now,
        questionEndTime: new Date(Date.now() + 30 * 1000).toISOString(),
        createdAt: now,
        updatedAt: now,
        isTest: false,
      });
    }

    // Participants for both rooms
    const participantUserIds = users.map((u) => u.id);
    for (const rid of [roomId, liveRoomId]) {
      for (const uid of participantUserIds) {
        const id = `${rid}:${uid}`;
        const ref = db.collection("roomParticipants").doc(id);
        const snap = await ref.get();
        if (!snap.exists) {
          await ref.set({
            id,
            roomId: rid,
            userId: uid,
            status: "paid",
            requestedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            approvedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
            paidAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
            paymentReference: "demo",
            score: 0,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    }

    res.set(corsHeaders).status(200).json({ ok: true, seeded: true, actorUid: decoded.uid });
  } catch (err: any) {
    console.error("seed_nyc_demo error", err);
    res.set(corsHeaders).status(500).json({ error: err?.message || String(err) });
  }
});
