import { API_BASE_URL } from '../api'
import { GetQuizzesByCategoryParams, GetQuizzesParams, PaginatedResponse, QuizDto } from '../models/Quiz'
import { buildHeaders, handleApiError } from '../utils/http'

export interface UpdateQuizRequest extends CreateQuizRequest {}

export const updateQuiz = async (
  id: string,
  payload: UpdateQuizRequest
): Promise<QuizDto> => {
  const body = toPascalCaseCreateQuiz({
    title: payload.title,
    description: payload.description,
    category: payload.category,
    difficulty: payload.difficulty,
    timeLimitSeconds: payload.timeLimitSeconds,
    questions: payload.questions ?? [],
  })
  const res = await fetch(`${API_BASE_URL}/quizzes/${id}`, {
    method: 'PUT',
    headers: {
      ...buildHeaders(true),
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify(body)
  })
  if (!res.ok) await handleApiError(res)
  if (res.status === 204) {
    return getQuizById(id)
  }
  return res.json()
}

export interface UpsertAnswerRequest {
  id?: string
  text: string
  isCorrect?: boolean
}

export interface UpsertQuestionRequest {
  id?: string
  text: string
  questionType: number
  answers: UpsertAnswerRequest[]
}

 

export const getQuizById = async (id: string): Promise<QuizDto> => {
  const res = await fetch(`${API_BASE_URL}/quizzes/${id}`, {
    method: 'GET',
    headers: buildHeaders(true),
    credentials: 'include'
  })
  if (!res.ok) await handleApiError(res)
  return res.json()
}

export const getQuizWithQuestions = async (id: string): Promise<QuizDto> => {
  const res = await fetch(`${API_BASE_URL}/quizzes/${id}/with-questions`, {
    method: 'GET',
    headers: buildHeaders(true),
    credentials: 'include'
  })
  if (!res.ok) await handleApiError(res)
  return res.json()
}

export const getQuizzes = async (
  params: GetQuizzesParams = {}
): Promise<PaginatedResponse<QuizDto>> => {
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 10
  const res = await fetch(
    `${API_BASE_URL}/quizzes?page=${page}&pageSize=${pageSize}`,
    {
      method: 'GET',
      headers: buildHeaders(true),
      credentials: 'include'
    }
  )
  if (!res.ok) await handleApiError(res)
  return res.json()
}

export const getQuizzesByCategory = async (
  params: GetQuizzesByCategoryParams
): Promise<PaginatedResponse<QuizDto>> => {
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 10
  const res = await fetch(
    `${API_BASE_URL}/quizzes/category/${encodeURIComponent(
      params.category
    )}?page=${page}&pageSize=${pageSize}`,
    {
      method: 'GET',
      headers: buildHeaders(true),
      credentials: 'include'
    }
  )
  if (!res.ok) await handleApiError(res)
  return res.json()
}

export interface CreateQuizRequest {
  title: string
  description?: string
  category?: string
  difficulty?: number
  timeLimitSeconds?: number
  questions?: UpsertQuestionRequest[]
}

const toPascalCaseCreateQuiz = (p: CreateQuizRequest) => {
  const mapAnswer = (a: UpsertAnswerRequest) => ({
    Text: a.text,
    IsCorrect: a.isCorrect ?? false,
  })
  const mapQuestion = (q: UpsertQuestionRequest) => ({
    Text: q.text,
    QuestionType: q.questionType,
    Answers: (q.answers || []).map(mapAnswer),
  })
  return {
    Title: p.title,
    Description: p.description,
    Category: p.category,
    Difficulty: p.difficulty,
    TimeLimitSeconds: p.timeLimitSeconds,
    Questions: (p.questions ?? []).map(mapQuestion),
  }
}

const defaultQuestion = (): UpsertQuestionRequest => ({
  text: 'Placeholder question',
  questionType: 0,
  answers: [
    { text: 'Option 1', isCorrect: true },
    { text: 'Option 2', isCorrect: false },
  ],
})

export const createQuiz = async (
  payload: CreateQuizRequest
): Promise<QuizDto> => {
  const provided = payload.questions ?? []
  const base: CreateQuizRequest = {
    title: payload.title,
    description: payload.description,
    category: payload.category,
    difficulty: payload.difficulty,
    timeLimitSeconds: payload.timeLimitSeconds,
    questions: provided.length > 0 ? provided : [defaultQuestion()],
  }
  const pascal = toPascalCaseCreateQuiz(base)
  const res = await fetch(`${API_BASE_URL}/quizzes`, {
    method: 'POST',
    headers: { ...buildHeaders(true), 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(pascal),
  })
  if (!res.ok) await handleApiError(res)
  return res.json()
}

export {}
