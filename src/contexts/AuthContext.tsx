import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { loginUser as apiLogin, registerUser as apiRegister } from "@/lib/api";

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("st_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("st_token");
    const savedUser = localStorage.getItem("st_user");
    if (savedToken && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      } catch {
        localStorage.removeItem("st_token");
        localStorage.removeItem("st_user");
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const data = await apiLogin(email, password);
    const userData = {
      _id: data.user._id,
      name: data.user.name,
      email: data.user.email,
      role: data.user.role,
    };
    localStorage.setItem("st_token", data.token);
    localStorage.setItem("st_user", JSON.stringify(userData));
    setToken(data.token);
    setUser(userData);
  };

  const register = async (name: string, email: string, password: string) => {
    const data = await apiRegister(name, email, password);
    const userData = {
      _id: data.user._id,
      name: data.user.name,
      email: data.user.email,
      role: data.user.role,
    };
    localStorage.setItem("st_token", data.token);
    localStorage.setItem("st_user", JSON.stringify(userData));
    setToken(data.token); 
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("st_token");
    localStorage.removeItem("st_user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        isAdmin: user?.role === "admin",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
