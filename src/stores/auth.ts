import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { api } from '../utils/api'

export const useAuthStore = defineStore("auth", () => {
  const storedToken =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const storedUser =
    typeof window !== "undefined" ? localStorage.getItem("user") : null;

  let parsedUser = null;
  if (storedUser) {
    try {
      parsedUser = JSON.parse(storedUser);
    } catch (error) {
      localStorage.removeItem("user");
    }
  }

  const user = ref(parsedUser);
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
        try {
          await api.post("/auth/logout", {});
        } catch (error) {
          throw error instanceof Error ? error : new Error("Logout failed");
        }
      }
    } catch (error) {
      throw error instanceof Error ? error : new Error("Logout failed");
    }
  }
  return {
    user,
    token,
    isAuthenticated,
    register,
    login,
    logout,
  };
});
