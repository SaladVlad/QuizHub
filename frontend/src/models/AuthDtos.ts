import { UserDto } from './UserDtos'

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
  password: string
  confirmPassword: string
  avatarImage?: File
}

export interface ApiError {
  message: string
  errors?: Record<string, string[]>
  status?: number
}
