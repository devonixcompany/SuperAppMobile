import { cors } from "@elysiajs/cors";

export const corsConfig = cors({
  origin: true, // Allow all origins in development
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
  maxAge: 86400, // 24 hours
});