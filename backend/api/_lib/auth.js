import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { supabaseAdmin } from "./supabase.js";

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_ISSUER = process.env.JWT_ISSUER || "immunoroster-api";
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "immunoroster-admin";
const ACCESS_TOKEN_TTL = process.env.JWT_ACCESS_TTL || "1h";
const REFRESH_TOKEN_TTL = process.env.JWT_REFRESH_TTL || "7d";

function mustGetSecret(secretName, fallback) {
  if (fallback) return fallback;
  throw new Error(`Missing ${secretName} environment variable`);
}

function readBearerToken(authorizationHeader) {
  if (!authorizationHeader) return null;
  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export async function authenticateAdminLogin(identifier, password) {
  const normalizedIdentifier = String(identifier || "").trim().toLowerCase();
  if (!normalizedIdentifier || !password) return null;

  const identifierAsEmail =
    normalizedIdentifier === "admin" ? "admin@immunoroster.local" : normalizedIdentifier;

  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .select("id, email, full_name, password_hash, is_active")
    .eq("email", identifierAsEmail)
    .maybeSingle();

  if (error) throw error;
  if (!data || !data.is_active) return null;

  const passwordMatches = await bcrypt.compare(password, data.password_hash);
  if (!passwordMatches) return null;

  return {
    id: data.id,
    email: data.email,
    full_name: data.full_name,
    role: "admin"
  };
}

export function issueAdminTokens(adminUser) {
  const accessSecret = mustGetSecret("JWT_ACCESS_SECRET", JWT_ACCESS_SECRET);
  const refreshSecret = mustGetSecret("JWT_REFRESH_SECRET", JWT_REFRESH_SECRET);

  const jwtPayload = {
    sub: adminUser.id,
    email: adminUser.email,
    role: "admin"
  };

  const accessToken = jwt.sign(jwtPayload, accessSecret, {
    expiresIn: ACCESS_TOKEN_TTL,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE
  });

  const refreshToken = jwt.sign(jwtPayload, refreshSecret, {
    expiresIn: REFRESH_TOKEN_TTL,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE
  });

  return { accessToken, refreshToken };
}

export function verifyAdminAccessToken(token) {
  const accessSecret = mustGetSecret("JWT_ACCESS_SECRET", JWT_ACCESS_SECRET);
  return jwt.verify(token, accessSecret, {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE
  });
}

export function refreshAdminAccessToken(refreshToken) {
  const refreshSecret = mustGetSecret("JWT_REFRESH_SECRET", JWT_REFRESH_SECRET);
  const decoded = jwt.verify(refreshToken, refreshSecret, {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE
  });

  const accessSecret = mustGetSecret("JWT_ACCESS_SECRET", JWT_ACCESS_SECRET);
  const accessToken = jwt.sign(
    {
      sub: decoded.sub,
      email: decoded.email,
      role: decoded.role
    },
    accessSecret,
    {
      expiresIn: ACCESS_TOKEN_TTL,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    }
  );

  return accessToken;
}

export function requireAdminAuth(req, res) {
  try {
    const token = readBearerToken(req.headers.authorization);
    if (!token) {
      res.status(401).json({ error: "Missing bearer token" });
      return false;
    }

    const decoded = verifyAdminAccessToken(token);
    if (decoded.role !== "admin") {
      res.status(403).json({ error: "Insufficient permissions" });
      return false;
    }

    req.admin = decoded;
    return true;
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token" });
    return false;
  }
}
