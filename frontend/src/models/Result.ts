// Result-related TypeScript models used by services and pages

export interface ResultAnswerDto {
  id: string
  questionId: string
  givenAnswer: string
  pointsAwarded?: number
  isCorrect?: boolean
  explanation?: string
}

export interface ResultDto {
  id: string
  userId: string
  quizId: string
  score: number
  maxPossibleScore: number
  percentageScore: number
  timeTakenSeconds: number
  completedAt: string
  passed: boolean
  passingScore?: number
  answers?: ResultAnswerDto[]
  // Optional fields that may be present in some responses
  quizTitle?: string
}

export interface LeaderboardEntryDto {
  rank: number
  username: string
  score: number
}

export interface UserStatsDto {
  totalQuizzesTaken: number
  averageScore: number
  bestScore: number
  lastTakenAt?: string
}
