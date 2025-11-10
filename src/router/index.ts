import { createRouter, createWebHistory } from "vue-router";
import { routes, handleHotUpdate } from 'vue-router/auto-routes'
import { useAuthStore } from "../stores/auth";

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes,
	scrollBehavior(to, from, savedPosition) {
		return savedPosition || { top: 0 };
	},
});

if (import.meta.hot) { 
  handleHotUpdate(router) 
} 

// Authentication guard
router.beforeEach(async (to, from, next) => {
	const authStore = useAuthStore();
	document.title = `${to.meta.title} | Kanban App` || "Kanban App";
	const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);

	if (!requiresAuth) {
		if ((to.name === "login" || to.name === "register") && authStore.isAuthenticated) {
			next({ name: "dashboard" });
			return;
		}
		next();
		return;
	}

	if (!authStore.isAuthenticated) {
		const storedToken =
			typeof window !== "undefined" ? localStorage.getItem("token") : null;

		if (storedToken && !authStore.token) {
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
		next({ name: "login", query: { redirect: to.fullPath } });
		return;
	}
	next();
});

export default router;
