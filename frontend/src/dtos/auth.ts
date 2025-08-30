import type { UserDto } from './user'

export interface LoginRequestDto {
  usernameOrEmail: string
  password: string
}

export interface LoginResponseDto {
  token: string
  user: UserDto
}

export interface RegisterRequestDto {
  username: string
  email: string
  firstName: string
  lastName: string
  password: string
  confirmPassword: string
  avatarImage?: File
}

export interface ApiError {
  message: string
  errors?: Record<string, string[]>
  status?: number
}
