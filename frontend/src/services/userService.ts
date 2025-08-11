import { API_BASE_URL } from '../api'
import { UserDto, UpdateUserRequestDto, ResetPasswordRequestDto } from '../dtos/user'
import { buildHeaders, handleApiError } from '../utils/http'

export const getAllUsers = async (
  includeImages = false
): Promise<UserDto[]> => {
  const response = await fetch(
    `${API_BASE_URL}/users?includeImages=${includeImages}`,
    {
      method: 'GET',
      headers: buildHeaders(true),
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
      headers: buildHeaders(true),
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
      headers: buildHeaders(true),
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
      headers: buildHeaders(true),
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
  if (!userData.userId || !userData.username || !userData.email) {
    throw new Error('User ID, username, and email are required fields.')
  }
  formData.append('userId', userData.userId!)
  formData.append('username', userData.username!)
  formData.append('email', userData.email!)
  if (userData.avatarImage) {
    formData.append('avatarImage', userData.avatarImage)
  }
  const response = await fetch(`${API_BASE_URL}/users/update`, {
    method: 'PUT',
    headers: buildHeaders(false),
    body: formData,
    credentials: 'include'
  })
  if (!response.ok) await handleApiError(response)
  return 'User updated successfully.'
}

export const promoteUserToAdmin = async (id: string): Promise<string> => {
  const response = await fetch(`${API_BASE_URL}/users/${id}/promote`, {
    method: 'PUT',
    headers: buildHeaders(false),
    credentials: 'include'
  })
  if (!response.ok) await handleApiError(response)
  return 'User promoted to Admin.'
}

export const deleteUser = async (id: string): Promise<string> => {
  const response = await fetch(`${API_BASE_URL}/users/${id}`, {
    method: 'DELETE',
    headers: buildHeaders(false),
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
      ...buildHeaders(true),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data),
    credentials: 'include'
  })
  if (!response.ok) await handleApiError(response)
  return 'Password changed successfully.'
}
