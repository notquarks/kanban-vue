import { createRouter, createWebHistory } from "vue-router";
import Dashboard from "../views/Dashboard.vue";
import Task from "../views/Task.vue";
import Teams from "../views/Teams.vue";
import { useAuthStore } from "../stores/auth";
import Login from "../views/Login.vue";
import Register from "../views/Register.vue";


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/login",
      name: "login",
      component: Login,
      meta: { title: "Login", requiresAuth: false },
    },    {
      path: "/register",
      name: "register",
      component: Register,
      meta: { title: "Register", requiresAuth: false },
    },
    {
      path: "/",
      name: "home",
      component: Dashboard,
      meta: { title: "Dashboard", requiresAuth: true },
    },
    {
      path: "/dashboard",
      name: "dashboard",
      component: Dashboard,
      meta: { title: "Dashboard", requiresAuth: true },
    },
    {
      path: "/task",
      name: "task",
      component: Task,
      meta: { title: "Task", requiresAuth: true },
    },
    {
      path: "/teams",
      name: "teams",
      component: Teams,
      meta: { title: "Teams", requiresAuth: true },
    },
    {
      path: "/:pathMatch(.*)*",
      name: "NotFound",
      component: () => import("../views/NotFound.vue"),
      meta: { title: "Page Not Found" },
    },
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 };
    }
  },
});

// Authentication guard
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  // Set page title
  document.title = `${to.meta.title} | Kanban App` || "Kanban App";

  // Check if route requires authentication
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);

  // If route doesn't require auth, allow access
  if (!requiresAuth) {
    // If user is logged in and trying to access login, redirect to dashboard
    if (to.name === 'login' && authStore.isAuthenticated) {
      next({ name: 'dashboard' });
      return;
    }
    next();
    return;
  }

  // Route requires authentication
  if (!authStore.isAuthenticated) {
    // Check if we have a token in localStorage that might not be reflected in state yet
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;



    if (storedToken && !authStore.token) {
      // We have a token but authStore hasn't initialized it yet
      // This can happen during app initialization
      console.log('Router guard: Found token but no auth state, checking auth...');
      try {
        const isValid = await authStore.checkAuth();
        if (isValid) {

          next();
          return;
        }
      } catch (error) {
        console.error('Auth check failed in router guard:', error);
      }
    } else if (!storedToken) {
      console.log('Router guard: No token found, redirecting to login');
    }

    // No valid auth, redirect to login

    next({ name: 'login', query: { redirect: to.fullPath } });
    return;
  }

  // User is authenticated, allow access

  next();
});

export default router;
