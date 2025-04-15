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
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        
        console.log("Initial auth check - token:", storedToken ? "exists" : "none");
        console.log("Initial auth check - user:", storedUser ? "exists" : "none");
        
        if (storedToken && storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                // Verify this is an admin account
                if (!parsedUser.is_admin) {
                    console.log("Stored user is not an admin, clearing auth state");
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    setIsAuthenticated(false);
                    return;
                }
                
                setToken(storedToken);
                setUser(parsedUser);
                setIsAuthenticated(true);
                console.log("Auth restored from localStorage:", parsedUser.email);
            } catch (err) {
                console.error("Failed to parse stored user:", err);
                // Clear invalid data
                localStorage.removeItem('token');
                localStorage.removeItem('user');
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
            if (event.key === 'token') {
                const newToken = event.newValue;
                if (!newToken) {
                    console.log('Auth token removed from storage, logging out.');
                    setToken(null);
                    setUser(null);
                    setIsAuthenticated(false);
                } else {
                    const storedUser = localStorage.getItem('user');
                    if (storedUser) {
                        try {
                            const parsedUser = JSON.parse(storedUser);
                            // Verify this is an admin account
                            if (!parsedUser.is_admin) {
                                console.log("Updated user is not an admin, clearing auth state");
                                localStorage.removeItem('token');
                                localStorage.removeItem('user');
                                setIsAuthenticated(false);
                                return;
                            }
                            
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
        
        // Verify this is an admin account
        if (!newUser.is_admin) {
            console.log("Login rejected: not an admin account");
            throw new Error('This account does not have admin privileges.');
        }
        
        // Save to localStorage
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
        
        // Update state
        setToken(newToken);
        setUser(newUser);
        setIsAuthenticated(true);
        
        console.log("Admin user successfully logged in:", newUser.email);
    };

    const logout = () => {
        console.log("Logout called");
        
        // Clear localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
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