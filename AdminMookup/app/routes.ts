import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("charge-points", "routes/charge-points.tsx"),
  route("charge-points/add", "routes/charge-points-add.tsx"),
  route("charge-points/:id/edit", "routes/charge-points-edit.tsx"),
  route("dashboard", "routes/dashboard.tsx"),
  route("users", "routes/users.tsx"),
  route("settings", "routes/settings.tsx"),
  // Catch-all route for Chrome DevTools and other unknown paths
  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
