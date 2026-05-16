import "dotenv/config";
import express from "express";
import adminLoginHandler from "./api/auth/admin-login.js";
import refreshHandler from "./api/auth/refresh.js";
import registerHandler from "./api/auth/register.js";
import updateHandler from "./api/auth/update.js";
import healthHandler from "./api/health.js";
import patientsHandler from "./api/patients.js";
import providersHandler from "./api/providers.js";
import immunizationsHandler from "./api/immunizations.js";
import animalBitesHandler from "./api/animal_bites.js";
import communityHandler from "./api/community.js";
import censusHandler from "./api/census.js";

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json());

function mountApiRoute(path, handler) {
  app.all(path, async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error("API Error at " + req.path + ":", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });
}

mountApiRoute("/api/auth/admin-login", adminLoginHandler);
mountApiRoute("/api/auth/register", registerHandler);
mountApiRoute("/api/auth/update", updateHandler);
mountApiRoute("/api/auth/refresh", refreshHandler);
mountApiRoute("/api/health", healthHandler);
mountApiRoute("/api/patients", patientsHandler);
mountApiRoute("/api/providers", providersHandler);
mountApiRoute("/api/immunizations", immunizationsHandler);
mountApiRoute("/api/animal_bites", animalBitesHandler);
mountApiRoute("/api/community", communityHandler);
mountApiRoute("/api/census", censusHandler);

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`Local backend server listening at http://localhost:${PORT}`);
});
