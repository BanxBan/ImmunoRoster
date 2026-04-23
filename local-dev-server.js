import "dotenv/config";
import express from "express";
import adminLoginHandler from "./api/auth/admin-login.js";
import refreshHandler from "./api/auth/refresh.js";
import healthHandler from "./api/health.js";
import patientsHandler from "./api/patients.js";
import providersHandler from "./api/providers.js";

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json());

function mountApiRoute(path, handler) {
  app.all(path, async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });
}

mountApiRoute("/api/auth/admin-login", adminLoginHandler);
mountApiRoute("/api/auth/refresh", refreshHandler);
mountApiRoute("/api/health", healthHandler);
mountApiRoute("/api/patients", patientsHandler);
mountApiRoute("/api/providers", providersHandler);

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`Local backend server listening at http://localhost:${PORT}`);
});
