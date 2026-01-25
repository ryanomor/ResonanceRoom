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

// One-off seeding function: writes users/{uid} with provided profile
export const seed_user_doc = onRequest(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      res.set(corsHeaders).status(204).send("");
      return;
    }
    res.set(corsHeaders);

    const uid = "URcOKBW9c8SXPE6W7pnZeZxAh5o2"; // Provided by user

    // Verify the Auth user exists (clear error if not)
    try {
      await admin.auth().getUser(uid);
    } catch (e) {
      res.status(400).json({ ok: false, error: `Auth user not found for UID ${uid}` });
      return;
    }

    const now = new Date().toISOString();
    const data = {
      id: uid,
      email: "seed@demo.local",
      username: "citygirl",
      city: "New York",
      gender: "female",
      avatarUrl: null,
      bio: null,
      createdAt: now,
      updatedAt: now,
      isActive: true,
      totalGamesPlayed: 0,
      totalMatches: 0,
    } as const;

    await admin.firestore().collection("users").doc(uid).set(data, { merge: true });

    res.status(200).json({ ok: true, path: `users/${uid}`, data });
  } catch (err) {
    const message = (err as Error)?.message ?? String(err);
    res.status(500).json({ ok: false, error: message });
  }
});
