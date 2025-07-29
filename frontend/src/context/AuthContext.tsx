// context/AuthContext.tsx
import { createContext, useState, useEffect } from "react";
import { ReactNode } from "react";
import { UserDto } from "../models/AuthDtos";

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
    const token = localStorage.getItem("jwt");
    const userData = localStorage.getItem("user");
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setAuthenticated(true);
      } catch (error) {
        console.error("Error parsing user data:", error);
        localStorage.removeItem("jwt");
        localStorage.removeItem("user");
      }
    }
    setLoading(false);
  }, []);

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
