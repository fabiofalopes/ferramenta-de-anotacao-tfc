import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../config/api';

interface AuthContextType {
    isAuthenticated: boolean;
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);

    // Load auth state from localStorage on init
    useEffect(() => {
        const storedToken = localStorage.getItem('auth_token');
        const storedUser = localStorage.getItem('auth_user');
        
        console.log("Initial auth check - token:", storedToken ? "exists" : "none");
        console.log("Initial auth check - user:", storedUser ? "exists" : "none");
        
        if (storedToken && storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                setToken(storedToken);
                setUser(parsedUser);
                setIsAuthenticated(true);
                console.log("Auth restored from localStorage:", parsedUser.email);
            } catch (err) {
                console.error("Failed to parse stored user:", err);
                // Clear invalid data
                localStorage.removeItem('auth_token');
                localStorage.removeItem('auth_user');
                setIsAuthenticated(false);
            }
        } else {
            setToken(null);
            setUser(null);
            setIsAuthenticated(false);
            console.log("No stored auth found - user is not authenticated");
        }
    }, []);

    // Listen for storage events (logout in other tabs)
    useEffect(() => {
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === 'auth_token') {
                const newToken = event.newValue;
                if (!newToken) {
                    console.log('Auth token removed from storage, logging out.');
                    setToken(null);
                    setUser(null);
                    setIsAuthenticated(false);
                } else {
                    const storedUser = localStorage.getItem('auth_user');
                    if (storedUser) {
                        try {
                            const parsedUser = JSON.parse(storedUser);
                            setToken(newToken);
                            setUser(parsedUser);
                            setIsAuthenticated(true);
                            console.log("Auth updated from storage event:", parsedUser.email);
                        } catch (err) {
                            console.error("Failed to parse user from storage event:", err);
                        }
                    }
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    const login = (newToken: string, newUser: User) => {
        console.log("Login called with user:", newUser.email);
        
        // Save to localStorage
        localStorage.setItem('auth_token', newToken);
        localStorage.setItem('auth_user', JSON.stringify(newUser));
        
        // Update state
        setToken(newToken);
        setUser(newUser);
        setIsAuthenticated(true);
        
        console.log("User successfully logged in:", newUser.email);
    };

    const logout = () => {
        console.log("Logout called");
        
        // Clear localStorage
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        
        // Update state
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        
        console.log("User successfully logged out");
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, user, token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
} 