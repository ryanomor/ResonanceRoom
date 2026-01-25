# EchoMatch - Social Trivia Gaming App Architecture

## Executive Summary
EchoMatch is a real-time social trivia application that enables users to connect through shared answers in city-based game rooms. The architecture prioritizes real-time synchronization, security, scalability, and a modular payment integration system.

---

## 1. HIGH-LEVEL ARCHITECTURE

### Tech Stack Recommendation

#### Frontend (Mobile)
- **Framework**: Flutter (Dart)
- **State Management**: Provider
- **Navigation**: GoRouter
- **Local Storage**: SharedPreferences (MVP), upgradeable to Firestore/Supabase
- **Real-Time**: WebSockets (Socket.IO) / Firebase Realtime Database / Supabase Realtime

#### Backend (Production-Ready Recommendation)
- **Primary**: Firebase or Supabase
  - Firebase: Firestore + Firebase Auth + Cloud Functions
  - Supabase: PostgreSQL + PostgREST + Realtime subscriptions
- **Alternative**: Node.js + Socket.IO + PostgreSQL/MongoDB + Redis

#### Database
- **MVP (Local)**: SharedPreferences with JSON serialization
- **Production**: 
  - Firebase Firestore (NoSQL, real-time listeners)
  - Supabase PostgreSQL (SQL with real-time subscriptions)

#### Real-Time Communication Strategy
- **Game State Sync**: Real-time listeners on game session document
- **Matchmaking**: Real-time updates on user selections
- **Chat**: Real-time message streaming with read receipts
- **Notifications**: Push notifications via Firebase Cloud Messaging

---

## 2. DATABASE SCHEMA (ER DIAGRAM DESCRIPTION)

### Core Entities

#### Users Table/Collection
```
users {
  id: string (PK)
  email: string (unique)
  username: string (unique)
  display_name: string
  avatar_url: string (optional)
  city: string (indexed for search)
  bio: string (optional)
  created_at: timestamp
  updated_at: timestamp
  is_active: boolean
  total_games_played: int
  total_matches: int
}
```

#### Rooms Table/Collection
```
rooms {
  id: string (PK)
  host_id: string (FK -> users.id)
  city: string (indexed)
  title: string
  description: string
  max_participants: int (default: 10)
  status: enum ['waiting', 'in_progress', 'completed']
  entry_fee: decimal (for future payment integration)
  scheduled_start: timestamp
  actual_start: timestamp (nullable)
  actual_end: timestamp (nullable)
  created_at: timestamp
  updated_at: timestamp
}
```

#### Questions Table/Collection
```
questions {
  id: string (PK)
  question_text: string
  options: array<string> (4 choices: A, B, C, D)
  category: string
  difficulty: enum ['easy', 'medium', 'hard']
  time_limit: int (seconds, default: 30)
  created_at: timestamp
}
```

#### Room_Participants (Join Requests & Active Players)
```
room_participants {
  id: string (PK)
  room_id: string (FK -> rooms.id, indexed)
  user_id: string (FK -> users.id)
  status: enum ['pending', 'approved', 'rejected', 'paid', 'in_game']
  requested_at: timestamp
  approved_at: timestamp (nullable)
  paid_at: timestamp (nullable)
  payment_reference: string (nullable, for future payment gateway)
  score: int (default: 0)
  created_at: timestamp
  updated_at: timestamp
  
  UNIQUE INDEX: (room_id, user_id)
}
```

#### Game_Sessions (Active Game State)
```
game_sessions {
  id: string (PK)
  room_id: string (FK -> rooms.id, unique)
  current_question_index: int (default: 0)
  question_ids: array<string> (ordered list of question IDs)
  game_state: enum ['question', 'selection', 'transition', 'ended']
  question_start_time: timestamp (nullable)
  question_end_time: timestamp (nullable)
  created_at: timestamp
  updated_at: timestamp
}
```

#### User_Answers (Temporary - Per Question)
```
user_answers {
  id: string (PK)
  game_session_id: string (FK -> game_sessions.id, indexed)
  user_id: string (FK -> users.id)
  question_id: string (FK -> questions.id)
  selected_option: string (A/B/C/D)
  answered_at: timestamp
  
  UNIQUE INDEX: (game_session_id, user_id, question_id)
}
```

#### User_Selections (Temporary - Per Question Round)
```
user_selections {
  id: string (PK)
  game_session_id: string (FK -> game_sessions.id, indexed)
  question_id: string (FK -> questions.id)
  selector_user_id: string (FK -> users.id) // Who is selecting
  selected_user_id: string (FK -> users.id) // Who is being selected
  created_at: timestamp
  
  UNIQUE INDEX: (game_session_id, question_id, selector_user_id, selected_user_id)
  INDEX: (game_session_id, question_id) for efficient queries
}
```

#### Matches (Permanent - Mutual Selections)
```
matches {
  id: string (PK)
  game_session_id: string (FK -> game_sessions.id)
  user_1_id: string (FK -> users.id)
  user_2_id: string (FK -> users.id)
  matched_at: timestamp
  expires_at: timestamp (matched_at + 24 hours)
  status: enum ['active', 'chatted', 'expired']
  first_chat_at: timestamp (nullable)
  
  UNIQUE INDEX: (game_session_id, user_1_id, user_2_id) // user_1_id < user_2_id always
  INDEX: (expires_at) for TTL/expiration queries
  INDEX: (user_1_id), (user_2_id) for user match queries
}
```

#### Chat_Messages
```
chat_messages {
  id: string (PK)
  match_id: string (FK -> matches.id, indexed)
  sender_id: string (FK -> users.id)
  message_text: string
  sent_at: timestamp
  read_at: timestamp (nullable)
  created_at: timestamp
}
```

### Data Flow: Temporary vs Permanent

**Temporary Data (Cleared After Game):**
- `user_answers`: Stored during game, used to group users by same answer
- `user_selections`: Stored during selection phase, used to calculate mutual matches

**Permanent Data:**
- `matches`: Only created when User A selected User B AND User B selected User A
- `chat_messages`: Persists for 24 hours (or longer if needed for chat history)

---

## 3. KEY LOGIC FLOWS

### 3.1 Room Discovery & Entry Flow

```
1. USER BROWSES ROOMS
   - Client: Fetch rooms filtered by city (query: status = 'waiting')
   - UI: Display room cards with host info, participant count, entry fee

2. USER REQUESTS TO JOIN
   - Client: POST /rooms/{roomId}/join-requests
   - Server: Create room_participant (status = 'pending')
   - Real-time: Notify host of new join request

3. HOST APPROVES REQUEST
   - Host UI: View pending requests, approve/reject
   - Server: Update room_participant (status = 'approved')
   - Real-time: Notify user of approval

4. USER CONFIRMS PAYMENT (Modular Payment Hook)
   - Client: Initiate payment flow (Stripe/PayPal/etc)
   - Server: Validate payment via webhook
   - Server: Update room_participant (status = 'paid', payment_reference)
   - Real-time: Add user to active participants list

5. HOST STARTS GAME
   - Server: Update room (status = 'in_progress')
   - Server: Create game_session with question_ids
   - Real-time: All participants transition to game screen
```

### 3.2 Game State Machine

```
STATE DIAGRAM:

[WAITING] 
   ↓ (Host starts game)
[QUESTION] → Timer counting down (30s default)
   ↓ (Timer expires OR all answered)
[SELECTION] → Show users who chose same answer
   ↓ (All selections made OR timeout)
[TRANSITION] → Brief animation/scoreboard (3s)
   ↓ (Auto-advance)
[QUESTION] → Next question
   ↓ (All questions completed)
[ENDED] → Calculate matches, show results


DETAILED FLOW:

1. QUESTION PHASE
   Server:
   - Increment current_question_index
   - Set game_state = 'question'
   - Set question_start_time = now()
   - Set question_end_time = now() + time_limit
   
   Client (Real-time Listener):
   - Display question and options
   - Start countdown timer (client-side for UX, server-side for authority)
   - Lock in user's answer to user_answers table
   
   Transition Trigger:
   - Timer expires (question_end_time reached) OR
   - All active participants have answered

2. SELECTION PHASE
   Server:
   - Query user_answers for current question
   - Group users by selected_option
   - Set game_state = 'selection'
   
   Client (Real-time Listener):
   - Display list of users who chose same answer as current user
   - Allow user to select/deselect other users
   - Store selections in user_selections table
   
   Transition Trigger:
   - All participants have completed selections OR
   - Timeout (30s)

3. TRANSITION PHASE
   Server:
   - Set game_state = 'transition'
   - Calculate and display scores
   - Wait 3 seconds
   
   Client:
   - Show animated scoreboard
   - Highlight correct answer
   
   Transition Trigger:
   - Auto-advance after 3 seconds

4. END GAME
   Server:
   - Set game_state = 'ended'
   - Run matching algorithm (see below)
   - Update room status = 'completed'
   
   Client:
   - Display final results
   - Show notification of matches
```

### 3.3 Matching Algorithm (Efficient Mutual Match Calculation)

```typescript
// Pseudocode for efficient matching

function calculateMatches(gameSessionId: string): Match[] {
  // Step 1: Get all selections for this game session
  const selections = query(`
    SELECT selector_user_id, selected_user_id 
    FROM user_selections 
    WHERE game_session_id = ?
  `, [gameSessionId])
  
  // Step 2: Build adjacency map (O(n) time complexity)
  const selectionMap = new Map<string, Set<string>>()
  for (const selection of selections) {
    if (!selectionMap.has(selection.selector_user_id)) {
      selectionMap.set(selection.selector_user_id, new Set())
    }
    selectionMap.get(selection.selector_user_id).add(selection.selected_user_id)
  }
  
  // Step 3: Find mutual matches (O(n) time complexity)
  const matches: Match[] = []
  const processedPairs = new Set<string>()
  
  for (const [userA, selectedByA] of selectionMap.entries()) {
    for (const userB of selectedByA) {
      // Create canonical pair key (smaller ID first to avoid duplicates)
      const pairKey = userA < userB ? `${userA}:${userB}` : `${userB}:${userA}`
      
      if (processedPairs.has(pairKey)) continue
      processedPairs.add(pairKey)
      
      // Check if B also selected A (mutual match)
      if (selectionMap.has(userB) && selectionMap.get(userB).has(userA)) {
        matches.push({
          game_session_id: gameSessionId,
          user_1_id: userA < userB ? userA : userB,
          user_2_id: userA < userB ? userB : userA,
          matched_at: now(),
          expires_at: now() + 24_HOURS,
          status: 'active'
        })
      }
    }
  }
  
  // Step 4: Batch insert matches (single DB operation)
  insertMatches(matches)
  
  // Step 5: Send real-time notifications to matched users
  for (const match of matches) {
    sendNotification(match.user_1_id, 'New Match!', match.user_2_id)
    sendNotification(match.user_2_id, 'New Match!', match.user_1_id)
  }
  
  return matches
}

// Time Complexity: O(n) where n = number of selections
// Space Complexity: O(n) for the selection map
// Database Operations: 2 (1 read, 1 batch write)
```

### 3.4 24-Hour Match Expiration System

**Strategy 1: TTL Indexes (Recommended for Firebase/MongoDB)**
```javascript
// Firestore: Use scheduled Cloud Function
exports.expireMatches = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now()
    const expiredMatches = await db.collection('matches')
      .where('expires_at', '<=', now)
      .where('status', '==', 'active')
      .get()
    
    const batch = db.batch()
    expiredMatches.forEach(doc => {
      batch.update(doc.ref, { status: 'expired' })
    })
    await batch.commit()
  })

// Supabase: Use pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'expire-matches',
  '*/5 * * * *', -- Every 5 minutes
  $$
  UPDATE matches 
  SET status = 'expired' 
  WHERE expires_at <= NOW() 
  AND status = 'active'
  $$
);
```

**Strategy 2: Lazy Expiration (Backup/Complement)**
```typescript
// Check expiration on every match query
function getUserMatches(userId: string): Match[] {
  const matches = query(`
    SELECT * FROM matches 
    WHERE (user_1_id = ? OR user_2_id = ?)
    AND status = 'active'
  `, [userId, userId])
  
  const now = Date.now()
  const validMatches = []
  const expiredIds = []
  
  for (const match of matches) {
    if (match.expires_at <= now) {
      expiredIds.push(match.id)
    } else {
      validMatches.push(match)
    }
  }
  
  // Async cleanup (don't block response)
  if (expiredIds.length > 0) {
    updateMatches(expiredIds, { status: 'expired' })
  }
  
  return validMatches
}
```

---

## 4. SCALABILITY & SECURITY

### Scalability Considerations

1. **Real-Time Game State:**
   - Use Firebase Realtime Database or Supabase Realtime for sub-100ms latency
   - Implement exponential backoff for reconnection logic
   - Limit game room size (10-20 users) to prevent message storms

2. **Database Indexing:**
   ```sql
   -- Critical indexes for performance
   CREATE INDEX idx_rooms_city_status ON rooms(city, status);
   CREATE INDEX idx_room_participants_room ON room_participants(room_id);
   CREATE INDEX idx_user_selections_session_question ON user_selections(game_session_id, question_id);
   CREATE INDEX idx_matches_expiry ON matches(expires_at, status);
   CREATE INDEX idx_matches_users ON matches(user_1_id, user_2_id);
   ```

3. **Caching Strategy:**
   - Cache room listings per city (5-minute TTL)
   - Cache user profiles (10-minute TTL)
   - Cache questions (never expire, invalidate on update)

4. **Horizontal Scaling:**
   - Stateless API servers behind load balancer
   - Redis for distributed session management
   - WebSocket servers with sticky sessions

### Security Measures

1. **Prevent User List Scraping:**
   - **No Global User Search:** Remove any endpoints that return user lists
   - **Game-Scoped Visibility:** Users only see participants in their current game
   - **Rate Limiting:** Max 10 room queries per minute per user
   - **Authentication Required:** All endpoints require valid JWT token

2. **Data Access Rules (Firestore Example):**
   ```javascript
   // Firestore Security Rules
   match /users/{userId} {
     allow read: if request.auth.uid == userId;
     allow write: if request.auth.uid == userId;
   }
   
   match /room_participants/{participantId} {
     allow read: if request.auth.uid in resource.data.user_id;
     allow write: if request.auth.uid == resource.data.user_id;
   }
   
   match /matches/{matchId} {
     allow read: if request.auth.uid in [resource.data.user_1_id, resource.data.user_2_id];
     allow write: if false; // Only server can create matches
   }
   ```

3. **Payment Security (Modular Design):**
   - Never store raw payment credentials
   - Use payment gateway webhooks for verification
   - Implement idempotency keys for duplicate prevention
   - Log all payment attempts for audit trail

4. **Input Validation:**
   - Sanitize all user inputs (username, messages)
   - Validate question answers on server (prevent client manipulation)
   - Rate limit answer submissions (max 1 per question)

---

## 5. MODULAR PAYMENT INTEGRATION DESIGN

### Payment Architecture (Future-Proof)

```typescript
// Payment abstraction layer
interface PaymentGateway {
  initiatePayment(amount: number, userId: string, roomId: string): Promise<PaymentIntent>
  verifyPayment(paymentReference: string): Promise<PaymentVerification>
  refund(paymentReference: string, amount: number): Promise<RefundResult>
}

// Implementations
class StripePaymentGateway implements PaymentGateway { ... }
class PayPalPaymentGateway implements PaymentGateway { ... }
class ApplePayPaymentGateway implements PaymentGateway { ... }

// Dependency injection in service layer
class RoomService {
  constructor(private paymentGateway: PaymentGateway) {}
  
  async confirmJoinPayment(roomId: string, userId: string) {
    const room = await this.getRoom(roomId)
    const payment = await this.paymentGateway.initiatePayment(
      room.entry_fee,
      userId,
      roomId
    )
    // Store payment reference, update participant status
  }
}
```

### MVP Implementation (No Payment)
- Entry fee displayed as \$0.00
- "Confirm Spot" button immediately transitions to 'paid' status
- Payment gateway = NoOpPaymentGateway (returns instant success)

---

## 6. MVP IMPLEMENTATION PLAN (LOCAL STORAGE)

### Phase 1: Core Data Models & Services (Day 1-2)
- [x] Create User, Room, Question, GameSession, Match models
- [x] Implement UserService with local storage + sample data
- [x] Implement RoomService with local storage + sample data
- [x] Implement QuestionService with local storage + sample data
- [x] Implement GameService for game state management
- [x] Implement MatchService for mutual match calculation

### Phase 2: Authentication & User Management (Day 2-3)
- [x] Create AuthService (simple local auth for MVP)
- [x] Build login/signup screens
- [x] Implement user profile management

### Phase 3: Room Discovery & Entry (Day 3-4)
- [x] Build room browsing/search UI (filter by city)
- [x] Implement room creation flow (host)
- [x] Build join request flow (user requests → host approves → user confirms)

### Phase 4: Real-Time Game Loop (Day 5-7)
- [x] Implement game state machine (Question → Selection → Transition)
- [x] Build question display UI with timer
- [x] Build selection UI (show users with same answer)
- [x] Implement scoring system

### Phase 5: Matching & Chat (Day 7-8)
- [x] Implement matching algorithm
- [x] Build match notification system
- [x] Create chat UI for matched users
- [x] Implement 24-hour expiration logic

### Phase 6: Polish & Testing (Day 9-10)
- [x] Add animations and transitions
- [x] Implement error handling and loading states
- [x] Test all user flows end-to-end
- [x] Fix bugs and optimize performance

---

## 7. MIGRATION PATH TO PRODUCTION

### From Local Storage → Firebase/Supabase

1. **Keep Service Layer Unchanged:**
   - Services already abstract storage logic
   - Only swap storage implementation (SharedPreferences → Firestore/Supabase)

2. **Add Real-Time Listeners:**
   ```dart
   // Before (Local Storage)
   List<Room> rooms = await roomService.getRoomsByCity(city);
   
   // After (Firestore)
   Stream<List<Room>> roomStream = roomService.watchRoomsByCity(city);
   roomStream.listen((rooms) {
     setState(() => this.rooms = rooms);
   });
   ```

3. **Enable Authentication:**
   - Replace local AuthService with FirebaseAuth/Supabase Auth
   - Add email verification, password reset flows

4. **Deploy Backend Functions:**
   - Game state machine logic → Cloud Functions
   - Matching algorithm → Serverless function
   - Match expiration → Scheduled function

---

## 8. UI/UX DESIGN PRINCIPLES

### Color Palette (Vibrant & Energetic)
- **Primary**: Electric Blue (#2563EB)
- **Secondary**: Vibrant Purple (#9333EA)
- **Accent**: Energetic Orange (#F97316)
- **Background (Light)**: Clean White (#FFFFFF)
- **Background (Dark)**: Rich Dark Gray (#1A1A1A)

### Typography
- **Primary Font**: Inter (already configured)
- **Hierarchy**: Bold headlines, regular body, light captions

### Key Screens
1. **Home/Room Discovery**: Grid of room cards with city tags
2. **Room Detail**: Host info, participant avatars, join button
3. **Game Screen**: Full-screen question, large timer, answer buttons
4. **Selection Screen**: Horizontal scrollable user cards
5. **Match Screen**: Celebration animation, chat button
6. **Chat Screen**: Modern bubble chat UI

### Animations
- **Screen Transitions**: Smooth fade + slide
- **Button Press**: Scale down slightly (0.95x)
- **Match Animation**: Confetti + heart pulse
- **Timer**: Linear progress indicator with color change (green → yellow → red)

---

## CONCLUSION

This architecture provides:
✅ **Real-Time Capabilities**: Game state sync via local polling (MVP) or real-time listeners (production)
✅ **Security**: No global user search, game-scoped visibility only
✅ **Scalability**: Efficient matching algorithm O(n), indexed queries, scheduled expiration
✅ **Modularity**: Payment abstraction layer, service-based architecture
✅ **Future-Proof**: Easy migration from local storage to Firebase/Supabase

The MVP implementation uses local storage with sample data, allowing rapid development and testing without backend dependencies. The architecture is designed to seamlessly transition to a production backend when ready.
