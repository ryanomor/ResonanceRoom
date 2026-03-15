import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const seed_questions_batch2 = onRequest({ region: "us-central1" }, async (req, res) => {
  if (req.method === "OPTIONS") {
    res.set(corsHeaders).status(204).send("");
    return;
  }

  try {
    if (req.method !== "POST") {
      res.set(corsHeaders).status(405).json({ error: "Method not allowed" });
      return;
    }

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

    const questions = [
      // lifestyle (easy=20s, medium=30s, hard=45s)
      { id: "lifestyle_1", questionText: "Your ideal Sunday morning?", options: ["Brunch with friends", "Slow coffee + book", "Morning run", "Sleep in late"], category: "lifestyle", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "lifestyle_2", questionText: "How often do you cook at home?", options: ["Almost every day", "A few times a week", "Weekends only", "Rarely — takeout life"], category: "lifestyle", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "lifestyle_3", questionText: "What's your relationship with your phone?", options: ["Glued to it", "Check it often", "Mostly for calls", "Intentionally minimal"], category: "lifestyle", difficulty: "medium", timeLimitSeconds: 30 },
      { id: "lifestyle_4", questionText: "How do you handle a free unexpected afternoon?", options: ["Spontaneous adventure", "Catch up on errands", "Rest and recharge", "Call a friend"], category: "lifestyle", difficulty: "medium", timeLimitSeconds: 30 },
      { id: "lifestyle_5", questionText: "Gym, yoga, outdoor runs, or none?", options: ["Gym", "Yoga", "Outdoor runs", "None — stay active other ways"], category: "lifestyle", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "lifestyle_6", questionText: "How do you wake up?", options: ["Alarm snoozer", "One alarm, up instantly", "Natural light", "Someone else wakes me"], category: "lifestyle", difficulty: "easy", timeLimitSeconds: 20 },

      // food
      { id: "food_1", questionText: "Pick your ideal dinner out:", options: ["Sushi omakase", "Cozy Italian", "Street tacos", "Farm-to-table"], category: "food", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "food_2", questionText: "What's your coffee order?", options: ["Black coffee", "Oat latte", "Cold brew", "I don't drink coffee"], category: "food", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "food_3", questionText: "Best late-night snack?", options: ["Pizza slice", "Ramen", "Chips + dip", "Ice cream"], category: "food", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "food_4", questionText: "How spicy do you go?", options: ["No spice please", "Mild", "Medium", "The hotter the better"], category: "food", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "food_5", questionText: "Would you try an adventurous food on a date?", options: ["Absolutely, I'm adventurous", "If they order it first", "Depends on what it is", "Hard pass"], category: "food", difficulty: "medium", timeLimitSeconds: 30 },
      { id: "food_6", questionText: "Who picks the restaurant?", options: ["Me — I love planning", "Whoever cares more", "We find it together", "Whoever suggests first"], category: "food", difficulty: "medium", timeLimitSeconds: 30 },

      // vibes
      { id: "vibes_1", questionText: "Pick a playlist for a road trip:", options: ["90s throwbacks", "Lo-fi beats", "Podcast", "Country"], category: "vibes", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "vibes_2", questionText: "What's your energy at a house party?", options: ["Center of the room", "Deep convo in a corner", "Playing games", "On the balcony"], category: "vibes", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "vibes_3", questionText: "Describe your aesthetic in one word:", options: ["Minimal", "Cozy", "Bold", "Eclectic"], category: "vibes", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "vibes_4", questionText: "Your happy place is:", options: ["A beach", "A mountain cabin", "A city café", "My own couch"], category: "vibes", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "vibes_5", questionText: "What kind of weather matches your mood?", options: ["Sunny and warm", "Cool and cloudy", "Stormy and dramatic", "First snow of winter"], category: "vibes", difficulty: "medium", timeLimitSeconds: 30 },

      // date
      { id: "date_1", questionText: "First date — who plans it?", options: ["The person who asked", "Whoever has better ideas", "Plan together", "Surprise each other"], category: "date", difficulty: "medium", timeLimitSeconds: 30 },
      { id: "date_2", questionText: "Best second date activity?", options: ["Cooking class", "Escape room", "Art gallery", "Farmers market"], category: "date", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "date_3", questionText: "Biggest green flag on a date?", options: ["They ask great questions", "They make you laugh", "They're present, no phone", "They know the staff by name"], category: "date", difficulty: "hard", timeLimitSeconds: 45 },
      { id: "date_4", questionText: "How long before calling someone your partner?", options: ["A few weeks", "A couple months", "When it just feels right", "When we have the talk"], category: "date", difficulty: "hard", timeLimitSeconds: 45 },
      { id: "date_5", questionText: "What's a dealbreaker on a first date?", options: ["Rude to staff", "Talks only about themselves", "Too many exes mentioned", "Glued to their phone"], category: "date", difficulty: "hard", timeLimitSeconds: 45 },

      // communication
      { id: "communication_1", questionText: "When something bothers you, you:", options: ["Bring it up right away", "Wait for the right moment", "Drop hints", "Process alone first"], category: "communication", difficulty: "hard", timeLimitSeconds: 45 },
      { id: "communication_2", questionText: "How do you prefer to resolve disagreements?", options: ["Talk it out in person", "Text — less charged", "Take a break, then talk", "I avoid conflict"], category: "communication", difficulty: "hard", timeLimitSeconds: 45 },
      { id: "communication_3", questionText: "How often do you check in with people you care about?", options: ["Daily texts", "Couple times a week", "When I'm thinking of them", "I'm bad at it honestly"], category: "communication", difficulty: "medium", timeLimitSeconds: 30 },
      { id: "communication_4", questionText: "Your ideal response time for texts:", options: ["Within minutes", "Within the hour", "Same day", "Whenever I see it"], category: "communication", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "communication_5", questionText: "When you're upset you:", options: ["Need space first", "Want to talk immediately", "Distract myself", "Depends on why"], category: "communication", difficulty: "hard", timeLimitSeconds: 45 },

      // travel
      { id: "travel_1", questionText: "Your travel style?", options: ["Fully planned", "Loose itinerary", "Totally spontaneous", "Let someone else plan"], category: "travel", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "travel_2", questionText: "Dream destination?", options: ["Tokyo", "Amalfi Coast", "Patagonia", "New Orleans"], category: "travel", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "travel_3", questionText: "How often do you travel?", options: ["Multiple times a year", "Once a year", "Every few years", "I prefer staying local"], category: "travel", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "travel_4", questionText: "Best part of a trip?", options: ["The food", "The scenery", "Meeting locals", "Disconnecting"], category: "travel", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "travel_5", questionText: "Would you do a spontaneous weekend trip?", options: ["Yes, let's go now", "If flights are cheap", "With the right person", "I need more notice"], category: "travel", difficulty: "medium", timeLimitSeconds: 30 },
      { id: "travel_6", questionText: "What kind of accommodation?", options: ["Boutique hotel", "Airbnb with character", "Hostel to meet people", "Camping / outdoors"], category: "travel", difficulty: "easy", timeLimitSeconds: 20 },

      // humor
      { id: "humor_1", questionText: "Your humor style:", options: ["Dry and deadpan", "Self-deprecating", "Random absurdist", "Pun master"], category: "humor", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "humor_2", questionText: "Do you laugh at your own jokes?", options: ["Always", "Only the good ones", "Rarely", "I contain multitudes"], category: "humor", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "humor_3", questionText: "Best comedy format?", options: ["Stand-up special", "Sketch show", "Improv night", "Funny podcasts"], category: "humor", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "humor_4", questionText: "Most important thing a partner can do?", options: ["Make you laugh daily", "Be your biggest support", "Challenge you to grow", "Just get you"], category: "humor", difficulty: "hard", timeLimitSeconds: 45 },

      // events
      { id: "events_1", questionText: "Your ideal Friday night event:", options: ["Live music", "Comedy show", "Art opening", "Rooftop party"], category: "events", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "events_2", questionText: "How far in advance do you plan going out?", options: ["Day-of only", "A few days ahead", "Weeks in advance", "I wait to see plans materialize"], category: "events", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "events_3", questionText: "Music festival or intimate show?", options: ["Festival all the way", "Intimate venue", "Either, depends on the artist", "I'd rather stream it"], category: "events", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "events_4", questionText: "Sports — fan or skip?", options: ["Season ticket holder", "Casual fan, love the atmosphere", "Only playoffs", "Not my thing"], category: "events", difficulty: "easy", timeLimitSeconds: 20 },

      // values
      { id: "values_1", questionText: "What does success look like to you?", options: ["Financial freedom", "Meaningful work", "Close relationships", "Making a difference"], category: "values", difficulty: "hard", timeLimitSeconds: 45 },
      { id: "values_2", questionText: "How important is ambition in a partner?", options: ["Very — drives me too", "Important but not everything", "Not really — just be kind", "Depends on what they're working toward"], category: "values", difficulty: "hard", timeLimitSeconds: 45 },
      { id: "values_3", questionText: "Family — how big a role in your life?", options: ["Everything, very close-knit", "Important but I set boundaries", "It's complicated", "Found family is my real family"], category: "values", difficulty: "hard", timeLimitSeconds: 45 },
      { id: "values_4", questionText: "How do you feel about social media?", options: ["Love it, I post often", "Use it passively", "Mostly off it", "Strongly prefer offline"], category: "values", difficulty: "medium", timeLimitSeconds: 30 },
      { id: "values_5", questionText: "What do you value most in a friendship?", options: ["Loyalty", "Deep conversations", "Shared humor", "Showing up in hard times"], category: "values", difficulty: "hard", timeLimitSeconds: 45 },
      { id: "values_6", questionText: "How do you grow as a person?", options: ["Therapy + reflection", "Reading and learning", "Hard experiences", "Surrounding myself with good people"], category: "values", difficulty: "hard", timeLimitSeconds: 45 },
    ];

    let upserted = 0;
    let skipped = 0;

    for (const q of questions) {
      const ref = db.collection("questions").doc(q.id);
      const snap = await ref.get();
      if (!snap.exists) {
        await ref.set({
          id: q.id,
          questionText: q.questionText,
          options: q.options,
          category: q.category,
          difficulty: q.difficulty,
          timeLimitSeconds: q.timeLimitSeconds,
          createdAt: now,
        });
        upserted++;
      } else {
        skipped++;
      }
    }

    res.set(corsHeaders).status(200).json({
      ok: true,
      upserted,
      skipped,
      total: questions.length,
      actorUid: decoded.uid,
    });
  } catch (err: any) {
    console.error("seed_questions_batch2 error", err);
    res.set(corsHeaders).status(500).json({ error: err?.message || String(err) });
  }
});
