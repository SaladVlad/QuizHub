// context/AuthContext.jsx
import { createContext, useState, useEffect } from "react";
import { ReactNode } from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("jwt");
    setAuthenticated(!!token);
  }, []);

  const login = (token: string) => {
    localStorage.setItem("jwt", token);
    setAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem("jwt");
    setAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
