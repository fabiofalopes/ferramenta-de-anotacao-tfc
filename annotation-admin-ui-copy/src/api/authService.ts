import axios from 'axios';
import { API_URL, User } from '../config/api';

interface LoginResponse {
  access_token: string;
  token_type: string;
}

interface RegisterData {
  email: string;
  password: string;
  is_admin: boolean;
}

export async function loginUser(email: string, password: string): Promise<{ token: string; user: User }> {
  try {
    // Create form data for token request (FastAPI OAuth2 format)
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    console.log("Attempting login with API URL:", API_URL);
    
    const tokenResponse = await axios.post<LoginResponse>(
      `${API_URL}/auth/token`,
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    console.log("Login response:", tokenResponse.status, tokenResponse.data);
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
  } catch (error) {
    console.error('Login error:', error);
    throw new Error('Failed to login. Please check your credentials.');
  }
}

export async function registerUser(registerData: RegisterData): Promise<User> {
  try {
    console.log("Attempting registration with API URL:", API_URL);
    
    // First, register the user
    const registerResponse = await axios.post(
      `${API_URL}/auth/register`,
      registerData,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    console.log("Registration response:", registerResponse.status, registerResponse.data);
    
    // The actual backend might return a token or user data directly
    // If it returns a token directly, we'll just return a placeholder user object
    // The caller will use loginUser to get actual user data
    if (registerResponse.data.access_token) {
      console.log("Register endpoint returned a token, user will need to log in");
      // If the API returns a token, we'll just create a temporary user object
      return {
        id: 0,
        email: registerData.email,
        is_admin: registerData.is_admin
      };
    }
    
    // If the API returned user data directly
    return registerResponse.data;
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
  } catch (error) {
    console.error('Error fetching user info:', error);
    throw new Error('Failed to fetch user information.');
  }
} 