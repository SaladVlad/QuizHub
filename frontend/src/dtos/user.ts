export interface UserDto {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  role: string
  avatarImage?: string
}

export interface UpdateUserRequestDto {
  userId: string
  username?: string
  email?: string
  firstName?: string
  lastName?: string
  avatarImage?: File
  removeImage?: boolean
}

export interface ResetPasswordRequestDto {
  userId: string
  newPassword: string
  confirmPassword: string
}

export interface ApiError {
  message: string
  errors?: string[]
  status?: number
}
