export type Gender = 'male' | 'female';

export type RoomStatus = 'waiting' | 'inProgress' | 'completed';

export type GameState = 'question' | 'selection' | 'transition' | 'ended';

export type MatchStatus = 'active' | 'chatted' | 'expired';

export type ParticipantStatus = 'pending' | 'approved' | 'rejected' | 'paid' | 'inGame';

export type ParticipantRole = 'player' | 'host';

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export type AppNotificationType = 'gameStartingSoon' | 'joinRequestUpdate' | 'newCityGame';

export interface User {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string;
  photos?: string[];
  city: string;
  bio?: string;
  gender: Gender;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  isActive: boolean;
  totalGamesPlayed: number;
  totalMatches: number;
  favoriteCities: string[];
  lastNotificationsSeenAt?: string;
  dismissedNotificationIds: string[];
}

export interface Room {
  id: string;
  hostId: string;
  city: string;
  title: string;
  description: string;
  maxParticipants: number;
  status: RoomStatus;
  entryFee: number;
  scheduledStart: string;
  actualStart?: string;
  actualEnd?: string;
  scheduledEnd?: string;
  createdAt: string;
  updatedAt: string;
  currentParticipants: number;
  questionIds: string[];
  venueAddress?: string;
  requiresGenderParity: boolean;
}

export interface Question {
  id: string;
  questionText: string;
  options: string[];
  category: string;
  difficulty: QuestionDifficulty;
  timeLimitSeconds: number;
  createdAt: string;
}

export interface GameSession {
  id: string;
  roomId: string;
  currentQuestionIndex: number;
  questionIds: string[];
  gameState: GameState;
  questionStartTime?: string;
  questionEndTime?: string;
  createdAt: string;
  updatedAt: string;
  isTest: boolean;
}

export interface RoomParticipant {
  id: string;
  roomId: string;
  avatarUrl: string;
  userId: string;
  username: string;
  status: ParticipantStatus;
  role: ParticipantRole;
  requestedAt: string;
  approvedAt?: string;
  paidAt?: string;
  paymentReference?: string;
  score: number;
  createdAt: string;
  updatedAt: string;
}

export interface Match {
  id: string;
  gameSessionId: string;
  uid1: string;
  uid2: string;
  matchedAt: string;
  expiresAt: string;
  status: MatchStatus;
  firstChatAt?: string;
}

export interface ChatMessage {
  id: string;
  matchId: string;
  senderId: string;
  messageText: string;
  sentAt: string;
  readAt?: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  type: AppNotificationType;
  title: string;
  message?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserAnswer {
  id: string;
  gameSessionId: string;
  userId: string;
  questionId: string;
  selectedOption: number;
  answeredAt: string;
}

export interface UserSelection {
  id: string;
  gameSessionId: string;
  questionId: string;
  selectorUserId: string;
  selectedUserId: string;
  createdAt: string;
}
