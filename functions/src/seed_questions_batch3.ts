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

export const seed_questions_batch3 = onRequest({ region: "us-central1" }, async (req, res) => {
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
      // lifestyle (10)
      { id: "lifestyle_b3_1", questionText: "How do you decompress after a long week?", options: ["Long walk with no destination", "TV binge on the couch", "Dinner with close friends", "Solo creative project"], category: "lifestyle", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "lifestyle_b3_2", questionText: "What's your relationship with routines?", options: ["I live by them", "Loose structure works", "I resist them completely", "Depends on the season"], category: "lifestyle", difficulty: "medium", timeLimitSeconds: 30 },
      { id: "lifestyle_b3_3", questionText: "Your apartment vibe?", options: ["Plants everywhere", "Clean and minimal", "Cozy chaos", "Gallery wall maximalist"], category: "lifestyle", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "lifestyle_b3_4", questionText: "How do you feel about pets?", options: ["Dog person all the way", "Cat person for life", "Any animal, I love them all", "I prefer a pet-free home"], category: "lifestyle", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "lifestyle_b3_5", questionText: "What time does your brain work best?", options: ["Early morning", "Late morning", "Afternoon", "Night owl hours"], category: "lifestyle", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "lifestyle_b3_6", questionText: "How do you spend money?", options: ["Experiences over things", "Save first, spend later", "Impulse buyer, no regrets", "Invest in quality pieces"], category: "lifestyle", difficulty: "medium", timeLimitSeconds: 30 },
      { id: "lifestyle_b3_7", questionText: "Your ideal living situation?", options: ["Alone in a quiet spot", "With a partner", "Roommates I actually like", "Near family"], category: "lifestyle", difficulty: "medium", timeLimitSeconds: 30 },
      { id: "lifestyle_b3_8", questionText: "What do you do first thing in the morning?", options: ["Check my phone", "Make coffee immediately", "Stretch or meditate", "Lay there in denial"], category: "lifestyle", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "lifestyle_b3_9", questionText: "How do you feel about working from home?", options: ["Love it, never going back", "Need to get out sometimes", "Prefer the office energy", "Depends on the work"], category: "lifestyle", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "lifestyle_b3_10", questionText: "What's your cleaning style?", options: ["Clean as I go", "Deep clean once a week", "When guests are coming", "Organized mess is fine"], category: "lifestyle", difficulty: "easy", timeLimitSeconds: 20 },

      // food (10)
      { id: "food_b3_1", questionText: "Your go-to comfort food?", options: ["Mac and cheese", "Pho or ramen", "Fresh bread with butter", "Chocolate anything"], category: "food", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "food_b3_2", questionText: "Breakfast person or skip it?", options: ["Full breakfast every day", "Coffee counts as breakfast", "Brunch on weekends only", "I eat when I'm hungry"], category: "food", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "food_b3_3", questionText: "How do you feel about cooking together?", options: ["That's peak romance", "Fun but I need my own station", "I'll watch and taste-test", "Let's just order in"], category: "food", difficulty: "medium", timeLimitSeconds: 30 },
      { id: "food_b3_4", questionText: "What's your drink at a bar?", options: ["Classic cocktail", "Local craft beer", "Glass of natural wine", "Non-alcoholic something"], category: "food", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "food_b3_5", questionText: "Favorite cuisine you could eat every week?", options: ["Mexican", "Japanese", "Mediterranean", "Thai"], category: "food", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "food_b3_6", questionText: "How important is the restaurant atmosphere?", options: ["Everything — vibe matters most", "Good food can overcome bad decor", "I care about music and lighting", "Just give me a stool and a plate"], category: "food", difficulty: "medium", timeLimitSeconds: 30 },
      { id: "food_b3_7", questionText: "Dessert — always, sometimes, or never?", options: ["Always, life is short", "Only if it looks amazing", "I'd rather have another drink", "Rarely, I'm not a sweet person"], category: "food", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "food_b3_8", questionText: "Grocery shopping style?", options: ["List and efficient", "Wander and get inspired", "Online delivery always", "Buy the same 10 things"], category: "food", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "food_b3_9", questionText: "Your farmer's market move?", options: ["Fresh produce haul", "Sample everything first", "Find the weird specialty item", "Coffee and people-watching"], category: "food", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "food_b3_10", questionText: "How do you feel about sharing plates?", options: ["Love it — let's try everything", "I'll share some but not all", "Order your own", "Only with people I'm close to"], category: "food", difficulty: "medium", timeLimitSeconds: 30 },

      // vibes (10)
      { id: "vibes_b3_1", questionText: "What recharges your social battery?", options: ["One-on-one time", "A solo night in", "A big group outing", "Being in nature"], category: "vibes", difficulty: "medium", timeLimitSeconds: 30 },
      { id: "vibes_b3_2", questionText: "Pick a color palette for your life:", options: ["Earth tones and terracotta", "Ocean blues and whites", "Black, grey, and gold", "Warm sunset colors"], category: "vibes", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "vibes_b3_3", questionText: "How do you feel about silence with someone?", options: ["Comfortable silence is everything", "I fill it naturally", "Depends on the person", "Silence makes me uneasy"], category: "vibes", difficulty: "hard", timeLimitSeconds: 45 },
      { id: "vibes_b3_4", questionText: "What's your relationship with nostalgia?", options: ["I romanticize everything", "I appreciate it but live forward", "Only certain memories", "I don't look back much"], category: "vibes", difficulty: "medium", timeLimitSeconds: 30 },
      { id: "vibes_b3_5", questionText: "Your Saturday night ideal:", options: ["Dinner party at home", "Out dancing somewhere", "Live show or event", "Movie and takeout"], category: "vibes", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "vibes_b3_6", questionText: "What kind of energy do people say you bring?", options: ["Calm and grounding", "Hype and excitement", "Warmth and care", "Sharp wit and laughs"], category: "vibes", difficulty: "medium", timeLimitSeconds: 30 },
      { id: "vibes_b3_7", questionText: "Candles, incense, or neither?", options: ["Candles always burning", "Incense sets the mood", "Both depending on the day", "Neither — open a window"], category: "vibes", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "vibes_b3_8", questionText: "What does your ideal morning sound like?", options: ["Birds and quiet", "Music playing softly", "City sounds outside", "Total silence"], category: "vibes", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "vibes_b3_9", questionText: "How do you feel about spontaneity?", options: ["I thrive on it", "In small doses", "Only if the plan was boring", "I need a heads-up"], category: "vibes", difficulty: "medium", timeLimitSeconds: 30 },
      { id: "vibes_b3_10", questionText: "Pick a fictional world to live in for a week:", options: ["Studio Ghibli film", "A Wes Anderson set", "New York in a rom-com", "A cabin in a Murakami novel"], category: "vibes", difficulty: "easy", timeLimitSeconds: 20 },

      // date (10)
      { id: "date_b3_1", questionText: "How do you show someone you're interested?", options: ["I tell them directly", "Plan something thoughtful", "Physical touch and closeness", "Quality time and attention"], category: "date", difficulty: "hard", timeLimitSeconds: 45 },
      { id: "date_b3_2", questionText: "Third date — what are you hoping for?", options: ["Deeper conversation", "Physical chemistry check", "Meeting their world a bit", "Just more of what's working"], category: "date", difficulty: "hard", timeLimitSeconds: 45 },
      { id: "date_b3_3", questionText: "Biggest turn-on in early dating?", options: ["Intellectual curiosity", "Sense of humor", "Confidence without arrogance", "Genuine kindness to others"], category: "date", difficulty: "hard", timeLimitSeconds: 45 },
      { id: "date_b3_4", questionText: "How do you feel about texting between dates?", options: ["Keep it frequent and fun", "A few check-ins are enough", "Save it for in person", "Memes and voice notes only"], category: "date", difficulty: "medium", timeLimitSeconds: 30 },
      { id: "date_b3_5", questionText: "After a great first date, you:", options: ["Text them that night", "Wait a day to play it cool", "Start planning date two", "Tell your friends everything"], category: "date", difficulty: "medium", timeLimitSeconds: 30 },
      { id: "date_b3_6", questionText: "What makes you want a second date?", options: ["I lost track of time", "They surprised me somehow", "The conversation flowed", "I felt like myself around them"], category: "date", difficulty: "hard", timeLimitSeconds: 45 },
      { id: "date_b3_7", questionText: "How important is physical attraction initially?", options: ["Essential — it has to be there", "Important but grows over time", "Chemistry matters more than looks", "Personality overrides everything"], category: "date", difficulty: "hard", timeLimitSeconds: 45 },
      { id: "date_b3_8", questionText: "Your ideal pace for a new relationship?", options: ["Fast and all-in", "Steady and intentional", "Slow burn", "Whatever feels natural"], category: "date", difficulty: "hard", timeLimitSeconds: 45 },
      { id: "date_b3_9", questionText: "Best unexpected date idea?", options: ["Sunset picnic somewhere new", "Bookstore browsing then coffee", "Cook a meal together at home", "Night walk with no destination"], category: "date", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "date_b3_10", questionText: "When do you introduce someone to friends?", options: ["Early — friends validate fast", "After a few weeks", "Only when it's official", "When it happens naturally"], category: "date", difficulty: "medium", timeLimitSeconds: 30 },

      // communication (10)
      { id: "communication_b3_1", questionText: "How do you give compliments?", options: ["Freely and often", "Only when I really mean it", "More through actions than words", "Specific and intentional"], category: "communication", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "communication_b3_2", questionText: "When someone cancels plans, you:", options: ["Totally understand", "Feel a little stung but move on", "Depends on the reason", "Secretly relieved sometimes"], category: "communication", difficulty: "medium", timeLimitSeconds: 30 },
      { id: "communication_b3_3", questionText: "How do you handle receiving criticism?", options: ["Take it in and reflect", "Get defensive at first, then process", "Ask for specifics", "Depends on who it's from"], category: "communication", difficulty: "hard", timeLimitSeconds: 45 },
      { id: "communication_b3_4", questionText: "Your love language?", options: ["Words of affirmation", "Acts of service", "Physical touch", "Quality time"], category: "communication", difficulty: "medium", timeLimitSeconds: 30 },
      { id: "communication_b3_5", questionText: "How do you apologize?", options: ["Immediately and directly", "With space, then words", "Through actions more than words", "I write it out sometimes"], category: "communication", difficulty: "hard", timeLimitSeconds: 45 },
      { id: "communication_b3_6", questionText: "Do you talk to strangers easily?", options: ["Yes, everywhere I go", "In the right setting", "Only if they start it", "Almost never"], category: "communication", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "communication_b3_7", questionText: "How transparent are you early on?", options: ["Open book from day one", "Gradually, as trust builds", "I share when asked", "I'm guarded until I'm sure"], category: "communication", difficulty: "hard", timeLimitSeconds: 45 },
      { id: "communication_b3_8", questionText: "Phone calls or voice notes?", options: ["Calls — I like real-time", "Voice notes are perfect", "Text is king", "Video call or nothing"], category: "communication", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "communication_b3_9", questionText: "How do you show someone you're listening?", options: ["Eye contact and nodding", "Ask follow-up questions", "Remember details later", "Repeat back what they said"], category: "communication", difficulty: "medium", timeLimitSeconds: 30 },
      { id: "communication_b3_10", questionText: "When you need support, you:", options: ["Ask for it clearly", "Hope someone notices", "Talk to one trusted person", "Journal or process alone first"], category: "communication", difficulty: "hard", timeLimitSeconds: 45 },

      // travel (10)
      { id: "travel_b3_1", questionText: "Window or aisle seat?", options: ["Window — I need the view", "Aisle — I need the freedom", "Middle if it means sitting together", "Exit row, always"], category: "travel", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "travel_b3_2", questionText: "Trip with a partner — your ideal length?", options: ["Long weekend", "Full week", "Two weeks minimum", "A month if we can swing it"], category: "travel", difficulty: "medium", timeLimitSeconds: 30 },
      { id: "travel_b3_3", questionText: "How do you navigate a new city?", options: ["Wander with no map", "Follow local recommendations", "Research top spots in advance", "Join a walking tour first"], category: "travel", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "travel_b3_4", questionText: "Mountains or coast?", options: ["Mountains every time", "Coast and ocean air", "Lake in between both", "Desert landscape"], category: "travel", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "travel_b3_5", questionText: "How do you feel about solo travel?", options: ["Love it — it's liberating", "Done it, prefer company", "Want to try it someday", "Not for me"], category: "travel", difficulty: "medium", timeLimitSeconds: 30 },
      { id: "travel_b3_6", questionText: "What do you always pack?", options: ["A good book", "Running shoes", "A journal", "Too many outfits"], category: "travel", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "travel_b3_7", questionText: "Best travel memory type?", options: ["A meal that changed me", "A random local encounter", "A view I'll never forget", "Getting lost and finding something"], category: "travel", difficulty: "medium", timeLimitSeconds: 30 },
      { id: "travel_b3_8", questionText: "How adventurous are you abroad?", options: ["I'll try anything once", "Adventurous with food, cautious otherwise", "Moderate — I like comfort too", "I stick to what I know"], category: "travel", difficulty: "medium", timeLimitSeconds: 30 },
      { id: "travel_b3_9", questionText: "Return to a favorite place or somewhere new?", options: ["Always somewhere new", "I have places I return to", "Mix of both", "New places stress me out"], category: "travel", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "travel_b3_10", questionText: "Your airport personality?", options: ["Three hours early, lounge life", "Perfectly on time", "Sprinting to the gate", "Calm no matter what"], category: "travel", difficulty: "easy", timeLimitSeconds: 20 },

      // humor (10)
      { id: "humor_b3_1", questionText: "What makes you laugh hardest?", options: ["Unexpected physical comedy", "Perfectly timed one-liner", "Inside jokes with close friends", "Absurd hypothetical scenarios"], category: "humor", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "humor_b3_2", questionText: "Can you handle being roasted?", options: ["Love it — roast me harder", "Only from people I trust", "I dish it but can't take it", "I'm sensitive about it"], category: "humor", difficulty: "medium", timeLimitSeconds: 30 },
      { id: "humor_b3_3", questionText: "Your go-to way to make someone smile?", options: ["Send a perfect meme", "Tell a ridiculous story", "Do something unexpectedly sweet", "Make fun of myself"], category: "humor", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "humor_b3_4", questionText: "How important is humor compatibility?", options: ["Non-negotiable", "Very important but not everything", "Nice to have", "As long as they get my jokes"], category: "humor", difficulty: "hard", timeLimitSeconds: 45 },
      { id: "humor_b3_5", questionText: "Dark humor — where do you land?", options: ["Love it, nothing's off limits", "Appreciate it in the right context", "Has to be really clever", "Not my style at all"], category: "humor", difficulty: "medium", timeLimitSeconds: 30 },
      { id: "humor_b3_6", questionText: "Funniest person in your friend group?", options: ["That's me", "I'm the one laughing hardest", "We all take turns", "I'm more the straight man"], category: "humor", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "humor_b3_7", questionText: "What's funnier — wit or silliness?", options: ["Sharp wit every time", "Silliness is underrated", "Wit sets it up, silliness lands it", "Depends on my mood"], category: "humor", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "humor_b3_8", questionText: "A partner who makes you laugh is:", options: ["The most attractive thing", "Essential for long-term", "Great but depth matters more", "A bonus, not a requirement"], category: "humor", difficulty: "hard", timeLimitSeconds: 45 },
      { id: "humor_b3_9", questionText: "Sarcasm — your take?", options: ["My first language", "Use it sparingly", "Love receiving, less giving", "It can come off mean"], category: "humor", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "humor_b3_10", questionText: "Would you rather be funny or be with someone funny?", options: ["Be funny", "Be with someone funny", "Both — we feed off each other", "I just want genuine connection"], category: "humor", difficulty: "medium", timeLimitSeconds: 30 },

      // events (10)
      { id: "events_b3_1", questionText: "Ideal group size for a night out?", options: ["Just us two", "Small group of 4-6", "The more the merrier", "Depends on the event"], category: "events", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "events_b3_2", questionText: "How late do you stay out?", options: ["Until close", "Midnight is my limit", "I peak at 10pm", "Depends who I'm with"], category: "events", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "events_b3_3", questionText: "Favorite type of live performance?", options: ["Concert or DJ set", "Theater or dance", "Comedy special taping", "Poetry or spoken word"], category: "events", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "events_b3_4", questionText: "Would you go to an event alone?", options: ["Absolutely, I do it often", "If it's something I really want to see", "Only with a safety net friend nearby", "Never, I need company"], category: "events", difficulty: "medium", timeLimitSeconds: 30 },
      { id: "events_b3_5", questionText: "Your vibe at a networking event?", options: ["Working the room", "Find one good conversation", "Hovering near the food", "I avoid these entirely"], category: "events", difficulty: "medium", timeLimitSeconds: 30 },
      { id: "events_b3_6", questionText: "Best kind of party?", options: ["Themed costume party", "Chill house gathering", "Rooftop with a view", "Dance floor energy"], category: "events", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "events_b3_7", questionText: "How do you discover new events?", options: ["Instagram and socials", "Word of mouth from friends", "Stumble upon them", "Event apps and newsletters"], category: "events", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "events_b3_8", questionText: "Day event or night event?", options: ["Day — I love a daytime outing", "Night — that's when the magic happens", "Golden hour specifically", "No preference, just good company"], category: "events", difficulty: "easy", timeLimitSeconds: 20 },
      { id: "events_b3_9", questionText: "You're at a party and don't know anyone — you:", options: ["Introduce myself to the first person", "Find the host and branch out", "Posted up near the drinks, approachable", "Probably leave early"], category: "events", difficulty: "medium", timeLimitSeconds: 30 },
      { id: "events_b3_10", questionText: "How often do you say yes to plans?", options: ["Almost always", "More yes than no", "Selective — I protect my energy", "I'm a flake honestly"], category: "events", difficulty: "easy", timeLimitSeconds: 20 },

      // values (10)
      { id: "values_b3_1", questionText: "What does loyalty mean to you?", options: ["Having someone's back publicly", "Keeping their secrets sacred", "Choosing them consistently", "Honest even when it's hard"], category: "values", difficulty: "hard", timeLimitSeconds: 45 },
      { id: "values_b3_2", questionText: "How do you define a healthy relationship?", options: ["Trust and independence", "Deep communication", "Growing together, not apart", "Feeling safe to be yourself"], category: "values", difficulty: "hard", timeLimitSeconds: 45 },
      { id: "values_b3_3", questionText: "How do you feel about vulnerability?", options: ["It's strength", "It's hard but worth it", "I'm working on it", "I struggle with it"], category: "values", difficulty: "hard", timeLimitSeconds: 45 },
      { id: "values_b3_4", questionText: "What role does gratitude play in your life?", options: ["Daily practice", "I notice it in big moments", "Something I'm building", "I show it more than say it"], category: "values", difficulty: "medium", timeLimitSeconds: 30 },
      { id: "values_b3_5", questionText: "How important is alone time to you?", options: ["Essential — non-negotiable", "Important but I flex", "I prefer company mostly", "I get restless alone"], category: "values", difficulty: "medium", timeLimitSeconds: 30 },
      { id: "values_b3_6", questionText: "What motivates you day to day?", options: ["Purpose and meaning", "People I care about", "Building something for the future", "Enjoying the present moment"], category: "values", difficulty: "hard", timeLimitSeconds: 45 },
      { id: "values_b3_7", questionText: "How do you handle change?", options: ["Embrace it fully", "Adapt but it takes time", "Resist at first, then adjust", "Change stresses me out"], category: "values", difficulty: "medium", timeLimitSeconds: 30 },
      { id: "values_b3_8", questionText: "What does commitment look like to you?", options: ["All in from the start", "Built over time with consistency", "A conscious daily choice", "Different for every relationship"], category: "values", difficulty: "hard", timeLimitSeconds: 45 },
      { id: "values_b3_9", questionText: "How do you want to be remembered?", options: ["Kind and genuine", "Someone who made people laugh", "Someone who showed up", "Someone who lived fully"], category: "values", difficulty: "hard", timeLimitSeconds: 45 },
      { id: "values_b3_10", questionText: "What's more important — being understood or being accepted?", options: ["Understood — I want to be seen", "Accepted — just let me be", "Both equally", "Depends on the relationship"], category: "values", difficulty: "hard", timeLimitSeconds: 45 },
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
    console.error("seed_questions_batch3 error", err);
    res.set(corsHeaders).status(500).json({ error: err?.message || String(err) });
  }
});
