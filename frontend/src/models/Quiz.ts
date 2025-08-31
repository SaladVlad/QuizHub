// Quiz-related TypeScript models used by services and pages

export interface AnswerDto {
  id: string
  text: string
  isCorrect?: boolean
}

export interface QuestionDto {
  id: string
  text: string
  questionType: number
  points?: number
  answers: AnswerDto[]
}

export interface QuizDto {
  id: string
  title: string
  description?: string
  category?: string
  difficulty?: number
  timeLimitSeconds?: number
  questions?: QuestionDto[]
}

export interface PaginatedResponse<T> {
  items: T[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface GetQuizzesParams {
  page?: number
  pageSize?: number
}

export interface GetQuizzesByCategoryParams extends GetQuizzesParams {
  category: string
}
