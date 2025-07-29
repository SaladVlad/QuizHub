import { API_BASE_URL } from '../api';
import { 
  UserDto, 
  LoginRequestDto, 
  LoginResponseDto, 
  RegisterRequestDto, 
  ApiError 
} from '../models/AuthDtos';

const handleApiError = async (response: Response): Promise<never> => {
  let errorData: ApiError = { message: 'An unexpected error occurred' };
  
  try {
    const data = await response.json();
    if (data && typeof data === 'object') {
      errorData = { message: data.message || 'Request failed', errors: data.errors };
    }
  } catch (e) {
    // If we can't parse the error response, use the status text
    errorData.message = response.statusText || 'Network error';
  }
  
  const error = new Error(errorData.message) as Error & ApiError;
  error.status = response.status;
  if (errorData.errors) {
    error.errors = errorData.errors;
  }
  
  throw error;
};

export const loginUser = async (usernameOrEmail: string, password: string): Promise<LoginResponseDto> => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ usernameOrEmail, password }),
      credentials: 'include',
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    const data = await response.json();
    return {
      token: data.token,
      user: data.user
    };
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const registerUser = async (userData: RegisterRequestDto): Promise<LoginResponseDto> => {
  const formData = new FormData();
  formData.append('username', userData.username);
  formData.append('email', userData.email);
  formData.append('password', userData.password);
  formData.append('confirmPassword', userData.confirmPassword);
  
  if (userData.avatarImage) {
    formData.append('avatarImage', userData.avatarImage);
  }

  const response = await fetch(`${API_BASE_URL}/users/auth/register`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  const data = await response.json();
  return {
    token: data.Token || data.token,
    user: data.User || data.user
  };
};

export const getCurrentUser = async (): Promise<UserDto> => {
  const response = await fetch(`${API_BASE_URL}/users/auth/currentUser`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('jwt')}`,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
};
