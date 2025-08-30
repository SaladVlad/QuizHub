import { API_BASE_URL } from '../api'
import {
  LeaderboardEntryDto,
  ResultDto,
  UserStatsDto
} from '../models/Result'
import { PaginatedResponse } from '../models/Quiz'
import { buildHeaders, handleApiError } from '../utils/http'

export const getUserResults = async (
  userId: string,
  page = 1,
  pageSize = 10
): Promise<PaginatedResponse<ResultDto>> => {
  const res = await fetch(
    `${API_BASE_URL}/results/user/${userId}?page=${page}&pageSize=${pageSize}`,
    {
      method: 'GET',
      headers: buildHeaders(true),
      credentials: 'include'
    }
  )
  if (!res.ok) await handleApiError(res)
  return res.json()
}

// Admin function to get all results with pagination and optional search
export const getAllResults = async (
  page = 1,
  pageSize = 20,
  search?: string
): Promise<PaginatedResponse<ResultDto>> => {
  const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
  const res = await fetch(
    `${API_BASE_URL}/results?page=${page}&pageSize=${pageSize}${searchParam}`,
    {
      method: 'GET',
      headers: buildHeaders(true),
      credentials: 'include'
    }
  )
  if (!res.ok) await handleApiError(res)
  return res.json()
}

export const getResultById = async (id: string): Promise<ResultDto> => {
  const res = await fetch(`${API_BASE_URL}/results/${id}`, {
    method: 'GET',
    headers: buildHeaders(true),
    credentials: 'include'
  })
  if (!res.ok) await handleApiError(res)
  return res.json()
}

export const getGlobalLeaderboard = async (
  top = 100
): Promise<LeaderboardEntryDto[]> => {
  const res = await fetch(
    `${API_BASE_URL}/results/leaderboard/global?top=${top}`,
    {
      method: 'GET',
      headers: buildHeaders(true),
      credentials: 'include'
    }
  )
  if (!res.ok) await handleApiError(res)
  const data = await res.json()
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.entries)) return data.entries
  return []
}

export const getUserStats = async (userId: string): Promise<UserStatsDto> => {
  const res = await fetch(`${API_BASE_URL}/results/stats/${userId}`, {
    method: 'GET',
    headers: buildHeaders(true),
    credentials: 'include'
  })
  if (!res.ok) await handleApiError(res)
  return res.json()
}

// Submit quiz result
export interface SubmitResultRequest {
  quizId: string
  timeTakenSeconds: number
  answers: { questionId: string; givenAnswer: string }[]
  score: number
}

export const submitResult = async (
  payload: SubmitResultRequest
): Promise<ResultDto> => {
  const dto = {
    QuizId: payload.quizId,
    Score: payload.score,
    TimeTakenSeconds: payload.timeTakenSeconds,
    Answers: payload.answers.map((a) => ({
      QuestionId: a.questionId,
      GivenAnswer: a.givenAnswer
    }))
  }
  const res = await fetch(`${API_BASE_URL}/results`, {
    method: 'POST',
    headers: { ...buildHeaders(true), 'Content-Type': 'application/json' },
    credentials: 'include',
    // Backend expects the DTO at the root with PascalCase properties
    body: JSON.stringify(dto)
  })
  if (!res.ok) await handleApiError(res)
  return res.json()
}

export {}
