import axios from "axios";

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000/api";
export const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, "");

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || "Network error";
    return Promise.reject(new Error(message));
  },
);

export default api;
