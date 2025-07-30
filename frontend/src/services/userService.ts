import { API_BASE_URL } from '../api'
import {
  UserDto,
  UpdateUserRequestDto,
  ResetPasswordRequestDto,
  ApiError
} from '../models/UserDtos'

const handleApiError = async (response: Response): Promise<never> => {
  let errorData: ApiError = { message: 'An unexpected error occurred' }
  try {
    const data = await response.json()
    errorData = {
      message: data.message || response.statusText,
      errors: data.errors
    }
  } catch {
    errorData.message = response.statusText || 'Network error'
  }
  const error = new Error(errorData.message) as Error & ApiError
  error.status = response.status
  if (errorData.errors) error.errors = errorData.errors
  throw error
}

export const getAllUsers = async (
  includeImages = false
): Promise<UserDto[]> => {
  const response = await fetch(
    `${API_BASE_URL}/users?includeImages=${includeImages}`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${localStorage.getItem('jwt')}` },
      credentials: 'include'
    }
  )
  if (!response.ok) await handleApiError(response)
  return response.json()
}

export const getUserById = async (
  id: string,
  includeImage = false
): Promise<UserDto> => {
  const response = await fetch(
    `${API_BASE_URL}/users/${id}?includeImage=${includeImage}`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${localStorage.getItem('jwt')}` },
      credentials: 'include'
    }
  )
  if (!response.ok) await handleApiError(response)
  return response.json()
}

export const getUserByUsername = async (
  username: string,
  includeImage = false
): Promise<UserDto> => {
  const response = await fetch(
    `${API_BASE_URL}/users/by-username/${username}?includeImage=${includeImage}`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${localStorage.getItem('jwt')}` },
      credentials: 'include'
    }
  )
  if (!response.ok) await handleApiError(response)
  return response.json()
}

export const getUserByEmail = async (
  email: string,
  includeImage = false
): Promise<UserDto> => {
  const response = await fetch(
    `${API_BASE_URL}/users/by-email/${email}?includeImage=${includeImage}`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${localStorage.getItem('jwt')}` },
      credentials: 'include'
    }
  )
  if (!response.ok) await handleApiError(response)
  return response.json()
}

export const updateUser = async (
  userData: UpdateUserRequestDto
): Promise<string> => {
  const formData = new FormData()
  formData.append('userId', userData.userId)
  formData.append('username', userData.username ?? '')
  formData.append('email', userData.email ?? '')
  if (userData.avatarImage) {
    formData.append('avatarImage', userData.avatarImage)
  }

  const response = await fetch(`${API_BASE_URL}/users/update`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('jwt')}`
    },
    body: formData,
    credentials: 'include'
  })
  if (!response.ok) await handleApiError(response)
  return 'User updated successfully.'
}

export const promoteUserToAdmin = async (id: string): Promise<string> => {
  const response = await fetch(`${API_BASE_URL}/users/${id}/promote`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('jwt')}`
    },
    credentials: 'include'
  })
  if (!response.ok) await handleApiError(response)
  return 'User promoted to Admin.'
}

export const deleteUser = async (id: string): Promise<string> => {
  const response = await fetch(`${API_BASE_URL}/users/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('jwt')}`
    },
    credentials: 'include'
  })
  if (!response.ok) await handleApiError(response)
  return 'User deleted successfully.'
}

export const resetPassword = async (
  data: ResetPasswordRequestDto
): Promise<string> => {
  const response = await fetch(`${API_BASE_URL}/users/reset-password`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('jwt')}`
    },
    body: JSON.stringify(data),
    credentials: 'include'
  })
  if (!response.ok) await handleApiError(response)
  return 'Password changed successfully.'
}
