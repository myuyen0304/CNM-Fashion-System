import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const notifyAuthStateChanged = () => {
  window.dispatchEvent(new Event("auth-state-changed"));
};

const axiosClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

const AUTH_PATHS_TO_SKIP_REFRESH = [
  "/auth/login",
  "/auth/register",
  "/auth/verify-registration-otp",
  "/auth/resend-registration-otp",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email",
  "/auth/refresh-token",
];

const shouldSkipRefresh = (requestUrl = "") => {
  return AUTH_PATHS_TO_SKIP_REFRESH.some((path) => requestUrl.includes(path));
};

const normalizeAuthErrorMessage = (status, requestUrl = "", message = "") => {
  const raw = String(message || "").trim();
  const lowered = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đð]/g, "d")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const isLoginRequest = String(requestUrl || "").includes("/auth/login");

  if (
    lowered.includes("chua dang nhap") ||
    lowered.includes("vui long dang nhap") ||
    lowered.includes("token khong hop le") ||
    lowered.includes("token da het han")
  ) {
    return "Chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.";
  }

  if (status === 401 && !isLoginRequest) {
    return "Chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.";
  }

  return raw;
};

// Request interceptor: gắn token vào header
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: xử lý 401, refresh token
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const normalizedMessage = normalizeAuthErrorMessage(
      error.response?.status,
      originalRequest?.url,
      error.response?.data?.message,
    );

    if (normalizedMessage && error.response) {
      error.response.data = {
        ...(error.response.data || {}),
        message: normalizedMessage,
      };
    }

    const refreshToken = localStorage.getItem("refreshToken");
    const canTryRefresh =
      error.response?.status === 401 &&
      !originalRequest?._retry &&
      Boolean(refreshToken) &&
      !shouldSkipRefresh(originalRequest?.url);

    if (canTryRefresh) {
      originalRequest._retry = true;

      try {
        const response = await axios.post(`${BASE_URL}/auth/refresh-token`, {
          refreshToken,
        });

        const { accessToken } = response.data;
        localStorage.setItem("accessToken", accessToken);
        notifyAuthStateChanged();

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return axiosClient(originalRequest);
      } catch (err) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        notifyAuthStateChanged();

        // Tránh reload cứng ngay tại trang login để thông báo lỗi còn hiển thị.
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }

        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  },
);

export default axiosClient;
