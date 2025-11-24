import { defineStore } from "pinia";
import { ref } from "vue";
import { api } from "../utils/api";
import router from "@/router";

interface User {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  status: string;
  createdAt: string;
  lastLoginAt?: string;
}

export const useAuthStore = defineStore("auth", () => {
  const storedToken =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const storedUser =
    typeof window !== "undefined" ? localStorage.getItem("user") : null;

  let parsedUser: User | null = null;
  if (storedUser) {
    try {
      parsedUser = JSON.parse(storedUser);
    } catch {
      localStorage.removeItem("user");
    }
  }

  const user = ref<User | null>(parsedUser);
  const token = ref<string | null>(storedToken);
  const isAuthenticated = ref(!!storedToken && !!parsedUser);

  async function register(name: string, email: string, password: string) {
    try {
      const response = await api.post("/auth/register", {
        name,
        email,
        password,
      });

      const { user: userData, token: authToken } = response;

      token.value = authToken;
      user.value = userData;
      isAuthenticated.value = true;

      localStorage.setItem("token", authToken);
      localStorage.setItem("user", JSON.stringify(userData));

      return { success: true, user: userData };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Registration failed",
      };
    }
  }

  async function login(email: string, password: string) {
    try {
      const response = await api.post("/auth/login", { email, password });

      const { user: userData, token: authToken } = response;

      token.value = authToken;
      user.value = userData;
      isAuthenticated.value = true;

      localStorage.setItem("token", authToken);
      localStorage.setItem("user", JSON.stringify(userData));

      return { success: true, user: userData };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Login failed",
      };
    }
  }

  async function logout() {
    try {
      if (token.value) {
        await api.post("/auth/logout", {});
      }
    } catch (error) {
      console.error("Server logout failed:", error);
    } finally {
      clearAuth();
      await router.push("/login");
    }
  }

  function clearAuth() {
    token.value = null;
    user.value = null;
    isAuthenticated.value = false;
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  async function checkAuth(): Promise<boolean> {
    if (!token.value) {
      clearAuth();
      return false;
    }

    try {
      const response = await api.get("/auth/me");

      if (response.user) {
        user.value = response.user;
        isAuthenticated.value = true;
        localStorage.setItem("user", JSON.stringify(response.user));
        return true;
      }
    } catch (error) {
      clearAuth();
      return false;
    }

    clearAuth();
    return false;
  }

  return {
    user,
    token,
    isAuthenticated,
    register,
    login,
    logout,
    checkAuth,
  };
});
