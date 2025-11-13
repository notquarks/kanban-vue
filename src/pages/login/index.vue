<script setup lang="ts">
import { ref } from "vue";
import { Label } from "reka-ui";
import { useRouter } from "vue-router";
import { useAuthStore } from "../../stores/auth";
import { Eye, EyeOff } from "lucide-vue-next";

const router = useRouter();
const authStore = useAuthStore();

const email = ref("");
const password = ref("");
const isLoading = ref(false);
const errorMessage = ref("");
const passwordVisible = ref(false);

definePage({
  meta: {
    requiresAuth: true,
    title: 'Login'
  }
})

function showPassword() {
  const passwordInput = document.getElementById("password") as HTMLInputElement;
  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    passwordVisible.value = true;
  } else {
    passwordInput.type = "password";
    passwordVisible.value = false;
  }
}

function login() {
  if (!email.value || !password.value) {
    errorMessage.value = "Please fill in all fields";
    return;
  }

  isLoading.value = true;
  errorMessage.value = "";

  authStore
    .login(email.value, password.value)
    .then((result: { success: boolean; error?: string }) => {
      if (result.success) {
        const redirect = router.currentRoute.value.query.redirect as string;
        router.push(redirect || "/dashboard");
      } else {
        errorMessage.value = result.error || "Login failed";
      }
    })
    .catch((_error: unknown) => {
      errorMessage.value = "An unexpected error occurred";
    })
    .finally(() => {
      isLoading.value = false;
    });
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center">
    <div class="flex w-full max-w-sm flex-col gap-1 rounded-md border p-4">
      <h1 class="py-2 text-xl font-bold">Login</h1>
      <div class="flex w-full flex-col gap-y-2">
        <div class="flex flex-col justify-between">
          <Label for="email">Email</Label>
          <input id="email" type="email" v-model="email"
            class="rounded-xs border-b border-gray-300 focus:border-b-2 focus:border-b-gray-900 focus:outline-none"
            required />
        </div>
        <div class="flex flex-col justify-between">
          <Label for="password">Password</Label>
          <div class="flex w-full flex-row items-center border-b">
            <input id="password" type="password" v-model="password"
              class="flex-grow rounded-xs border-b border-gray-300 focus:border-b-2 focus:border-b-gray-900 focus:outline-none"
              minlength="8" autocomplete="current-password" required />
            <button type="button" class="text-sm text-(--color-text-muted) opacity-60 hover:underline"
              @click="showPassword">
              <Eye v-if="passwordVisible" class="h-5 w-5" />
              <EyeOff v-if="!passwordVisible" class="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
      <div class="my-1 min-h-[1.5rem] rounded-sm border border-red-600 bg-red-200 p-1 text-sm text-red-700"
        v-if="errorMessage">
        <p>{{ errorMessage }}</p>
      </div>
      <div class="mb-2 flex justify-between text-xs text-(--color-text-muted)">
        <p>
          Create new account ?
          <RouterLink to="/register">
            <span class="underline">Register</span>
          </RouterLink>
        </p>
      </div>
      <button @click="login"
        class="hover:bg-surface transition-color w-full rounded-md bg-(--color-ui-strong) px-2 py-1 text-(--color-text-on-accent) duration-150 ease-in hover:cursor-pointer hover:border hover:text-black disabled:opacity-50">
        Login
      </button>
    </div>
  </div>
</template>
