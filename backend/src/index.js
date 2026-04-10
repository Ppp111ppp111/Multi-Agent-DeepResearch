import { CopilotRuntime, copilotRuntimeNodeExpressEndpoint } from "@copilotkit/runtime";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createResearchAgent } from "./deep-research-agent.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..", "..");
const frontendDistDir = path.resolve(rootDir, "frontend", "dist");
const rootEnvPath = path.resolve(rootDir, ".env");
const backendEnvPath = path.resolve(__dirname, "..", ".env");

dotenv.config({ path: rootEnvPath });
dotenv.config({ path: backendEnvPath, override: true });

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(
  cors({
    origin: process.env.FRONTEND_URL ? [process.env.FRONTEND_URL, "http://localhost:5173", "http://127.0.0.1:5173"] : true,
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "deep-research-assistant-js",
    date: new Date().toISOString(),
  });
});

const runtime = new CopilotRuntime({
  agents: {
    research_assistant: createResearchAgent(),
  },
});

const copilotHandler = copilotRuntimeNodeExpressEndpoint({
  endpoint: "/",
  runtime,
});

app.use("/api/copilotkit", copilotHandler);

app.use(express.static(frontendDistDir));

app.use((req, res, next) => {
  if (req.path.startsWith("/api/") || (process.env.NODE_ENV === "production" && !process.env.SERVE_FRONTEND)) {
    next();
    return;
  }

  const indexPath = path.join(frontendDistDir, "index.html");
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).send("Frontend build not found. Please build the frontend first or deploy it separately.");
    }
  });
});


const server = app.listen(port, () => {
  console.log(`Deep Research Assistant server listening on http://localhost:${port}`);
});

server.on("error", (error) => {
  if (error?.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Stop the existing process or change PORT.`);
  } else {
    console.error("Server failed to start:", error);
  }

  process.exit(1);
});

function shutdown(signal) {
  console.log(`${signal} received, shutting down server...`);

  server.close(() => {
    process.exit(0);
  });

  setTimeout(() => {
    console.error("Forced shutdown after timeout.");
    process.exit(1);
  }, 5000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));




