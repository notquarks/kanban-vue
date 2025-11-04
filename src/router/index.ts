import { createRouter, createWebHistory } from "vue-router";
import Dashboard from "../views/Dashboard.vue";
import Task from "../views/Task.vue";
import Teams from "../views/Teams.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "dashboard",
      component: Dashboard,
      meta: { title: "Dashboard" },
    },
    {
      path: "/task",
      name: "task",
      component: Task,
      meta: { title: "Task" },
    },
    {
      path: "/teams",
      name: "teams",
      component: Teams,
      meta: { title: "Teams" },
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

router.beforeEach((to, from, next) => {
  document.title = `${to.meta.title} | Kanban App` || "Kanban App";
  next();
});

export default router;
