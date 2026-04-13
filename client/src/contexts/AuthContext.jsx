import { createContext, useContext, useState, useEffect } from "react";
import axiosClient from "../api/axiosClient";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("accessToken"));
  const [loading, setLoading] = useState(true);

  const clearAuthState = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  const syncUser = (nextUser) => {
    setUser(nextUser);
    if (nextUser) {
      localStorage.setItem("user", JSON.stringify(nextUser));
    } else {
      localStorage.removeItem("user");
    }
  };

  useEffect(() => {
    const syncAuthFromStorage = () => {
      const nextToken = localStorage.getItem("accessToken");
      const cachedUser = JSON.parse(localStorage.getItem("user") || "null");

      setToken(nextToken);
      setUser(cachedUser);
    };

    window.addEventListener("auth-state-changed", syncAuthFromStorage);
    window.addEventListener("storage", syncAuthFromStorage);

    return () => {
      window.removeEventListener("auth-state-changed", syncAuthFromStorage);
      window.removeEventListener("storage", syncAuthFromStorage);
    };
  }, []);

  useEffect(() => {
    // Kiểm tra token khi mount
    if (token) {
      const cachedUser = JSON.parse(localStorage.getItem("user") || "null");
      if (cachedUser) {
        setUser(cachedUser);
      }

      // Đồng bộ profile mới nhất từ backend để tránh stale data (vd avatar).
      axiosClient
        .get("/users/profile")
        .then((res) => {
          const freshUser = res.data?.data;
          if (freshUser) {
            syncUser(freshUser);
          }
        })
        .catch((err) => {
          if (err.response?.status === 401) {
            clearAuthState();
            return;
          }

          // Giữ user cache nếu fetch profile lỗi tạm thời.
        });
    }
    setLoading(false);
  }, [token]);

  const login = async (email, password) => {
    const response = await axiosClient.post("/auth/login", { email, password });
    const { accessToken, refreshToken, user } = response.data;

    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);

    setToken(accessToken);
    syncUser(user);
    return user;
  };

  const register = async (name, email, password) => {
    await axiosClient.post("/auth/register", { name, email, password });
    return { success: true };
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    try {
      await axiosClient.post("/auth/logout", { refreshToken });
    } catch (err) {
      console.error("Logout error:", err);
    }

    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");

    clearAuthState();
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout, syncUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
