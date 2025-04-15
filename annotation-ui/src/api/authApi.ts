import axios from 'axios';
import { API_URL, User } from '../config/api';

interface LoginResponse {
  access_token: string;
  token_type: string;
}

interface RegisterData {
  email: string;
  password: string;
  is_admin?: boolean;
}

export async function loginUser(email: string, password: string): Promise<{ token: string; user: User }> {
  try {
    console.log("Attempting login with API URL:", API_URL);
    
    // Create form data for token request (FastAPI OAuth2 format)
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    const tokenResponse = await axios.post<LoginResponse>(
      `${API_URL}/auth/token`,
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    console.log("Login token response:", tokenResponse.status);
    const token = tokenResponse.data.access_token;

    // Get user info with token
    const userResponse = await axios.get<User>(
      `${API_URL}/auth/me`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log("User info response:", userResponse.status, userResponse.data);
    
    return {
      token,
      user: userResponse.data,
    };
  } catch (error: any) {
    console.error('Login error:', error);
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Failed to login. Please check your credentials.');
  }
}

export async function registerUser(registerData: RegisterData): Promise<User> {
  try {
    console.log("Attempting registration with API URL:", API_URL);
    console.log("Registration data:", {...registerData, password: "[REDACTED]"});
    
    const response = await axios.post<User>(
      `${API_URL}/auth/register`,
      registerData,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    console.log("Registration response:", response.status, response.data);
    return response.data;
  } catch (error: any) {
    console.error('Registration error:', error);
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Failed to register user. This email may already be registered.');
  }
}

export async function getUserInfo(token: string): Promise<User> {
  try {
    console.log("Fetching user info with API URL:", API_URL);
    
    const response = await axios.get<User>(
      `${API_URL}/auth/me`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    console.log("User info response:", response.status, response.data);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching user info:', error);
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Failed to fetch user information.');
  }
} 