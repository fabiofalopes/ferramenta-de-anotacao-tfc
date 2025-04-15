import axios from 'axios';
import { API_BASE_URL } from '../config/api';

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Check if the token is expired
const isTokenExpired = (token: string | null): boolean => {
    if (!token) return true;
    
    try {
        // JWT tokens are in format: header.payload.signature
        const payload = token.split('.')[1];
        const decodedPayload = JSON.parse(atob(payload));
        
        // Check if token has expired
        const expirationTime = decodedPayload.exp * 1000; // Convert to milliseconds
        return Date.now() >= expirationTime;
    } catch (error) {
        console.error('Error checking token expiration:', error);
        return true; // Assume expired if we can't decode
    }
};

// Add authentication token to requests
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    
    // If token exists and is not expired, add it to the request
    if (token && !isTokenExpired(token)) {
        config.headers.Authorization = `Bearer ${token}`;
    } else if (token && isTokenExpired(token)) {
        // Token is expired, clear it from storage
        console.warn('Token is expired. Clearing from storage.');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        
        // Rely on ProtectedRoute or other component logic to handle redirect
        // based on cleared auth state.
    }
    
    return config;
});

// Handle 401 responses
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Clear auth data
            console.warn('Received 401 Unauthorized. Clearing auth data.');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            
            // Rely on ProtectedRoute or other component logic to handle redirect
            // based on cleared auth state.
        }
        return Promise.reject(error);
    }
); 