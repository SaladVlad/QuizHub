import { API_BASE_URL } from '../api'
import { LoginResponseDto, RegisterRequestDto } from '../dtos/auth'
import { UserDto } from '../dtos/user'
import { handleApiError } from '../utils/http'

 

export const loginUser = async (
  usernameOrEmail: string,
  password: string
): Promise<LoginResponseDto> => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({ usernameOrEmail, password }),
      credentials: 'include'
    })

    if (!response.ok) {
      await handleApiError(response)
    }

    const data = await response.json()
    return {
      token: data.token,
      user: data.user
    }
  } catch (error) {
    throw error
  }
}

export const registerUser = async (
  userData: RegisterRequestDto
): Promise<LoginResponseDto> => {
  const formData = new FormData()
  formData.append('username', userData.username)
  formData.append('firstName', userData.firstName)
  formData.append('lastName', userData.lastName)
  formData.append('email', userData.email)
  formData.append('password', userData.password)
  formData.append('confirmPassword', userData.confirmPassword)

  if (userData.avatarImage) {
    formData.append('avatarImage', userData.avatarImage)
  }

  const response = await fetch(`${API_BASE_URL}/users/auth/register`, {
    method: 'POST',
    body: formData,
    credentials: 'include'
  })

  if (!response.ok) {
    await handleApiError(response)
  }

  const data = await response.json()
  return {
    token: data.Token || data.token,
    user: data.User || data.user
  }
}

export const getCurrentUser = async (): Promise<UserDto> => {
  const response = await fetch(`${API_BASE_URL}/users/auth/currentUser`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${localStorage.getItem('jwt')}`
    },
    credentials: 'include'
  })

  if (!response.ok) {
    await handleApiError(response)
  }

  return response.json()
}
