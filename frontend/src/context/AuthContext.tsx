import { createContext, useState, useEffect } from "react";
import { ReactNode } from "react";
import { UserDto } from "../dtos/user";

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserDto | null;
  login: (token: string, user: UserDto) => void;
  logout: () => void;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  login: () => {},
  logout: () => {},
  loading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem("jwt");
      const userData = localStorage.getItem("user");

      if (token && userData) {
        try {
          const parsedUser = JSON.parse(userData);
          // Verify the token is still valid by making an API call
          const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/validate-token`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            setUser(parsedUser);
            setAuthenticated(true);
          } else {
            // Token is invalid, clear local storage
            localStorage.removeItem("jwt");
            localStorage.removeItem("user");
          }
        } catch (error) {
          console.error("Auth initialization error:", error);
          localStorage.removeItem("jwt");
          localStorage.removeItem("user");
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'jwt' && !e.newValue) {
        setUser(null)
        setAuthenticated(false)
      }
      if (e.key === 'user' && !e.newValue) {
        setUser(null)
        setAuthenticated(false)
      }
    }
    const onForcedLogout = () => {
      setUser(null)
      setAuthenticated(false)
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('auth:logout', onForcedLogout as EventListener)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('auth:logout', onForcedLogout as EventListener)
    }
  }, [])

  const login = (token: string, user: UserDto) => {
    localStorage.setItem("jwt", token);
    localStorage.setItem("user", JSON.stringify(user));
    setUser(user);
    setAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem("jwt");
    localStorage.removeItem("user");
    setUser(null);
    setAuthenticated(false);
  };

  const value = {
    isAuthenticated,
    user,
    login,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
