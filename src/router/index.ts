import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		{
			path: "/login",
			name: "login",
			component: () => import("../views/LoginView.vue"),
			meta: { title: "Login", requiresAuth: false },
		},
		{
			path: "/register",
			name: "register",
			component: () => import("../views/RegisterView.vue"),
			meta: { title: "Register", requiresAuth: false },
		},
		{
			path: "/",
			name: "home",
			component: () => import("../views/DashboardView.vue"),
			meta: { title: "Dashboard", requiresAuth: true },
		},
		{
			path: "/dashboard",
			name: "dashboard",
			component: () => import("../views/DashboardView.vue"),
			meta: { title: "Dashboard", requiresAuth: true },
		},
		{
		  path: "/projects/:id",
			name: "project-board",
			component: () => import("../views/KanbanView.vue"),
			meta: { title: "Project Board", requiresAuth: true },
		},
		{
			path: "/task",
			name: "task",
			component: () => import("../views/TaskView.vue"),
			meta: { title: "Task", requiresAuth: true },
		},
		{
			path: "/teams",
			name: "teams",
			component: () => import("../views/TeamsView.vue"),
			meta: { title: "Teams", requiresAuth: true },
		},
		{
			path: "/:pathMatch(.*)*",
			name: "NotFound",
			component: () => import("../views/NotFoundView.vue"),
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
	const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);

	// If route doesn't require auth, allow access
	if (!requiresAuth) {
		// If user is logged in and trying to access login, redirect to dashboard
		if (to.name === "login" && authStore.isAuthenticated) {
			next({ name: "dashboard" });
			return;
		}
		next();
		return;
	}

	// Route requires authentication
	if (!authStore.isAuthenticated) {
		const storedToken =
			typeof window !== "undefined" ? localStorage.getItem("token") : null;

		if (storedToken && !authStore.token) {
			console.log(
				"Router guard: Found token but no auth state, checking auth...",
			);
			try {
				const isValid = await authStore.checkAuth();
				if (isValid) {
					next();
					return;
				}
			} catch (error) {
				console.error("Auth check failed in router guard:", error);
			}
		} else if (!storedToken) {
			console.log("Router guard: No token found, redirecting to login");
		}

		// No valid auth, redirect to login

		next({ name: "login", query: { redirect: to.fullPath } });
		return;
	}

	// User is authenticated, allow access

	next();
});

export default router;
