const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:3000" : "");
const AUTH_STORAGE_KEY = "immunoroster_admin_auth";

function getStoredAuth() {
  const rawValue = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!rawValue) return null;

  try {
    return JSON.parse(rawValue);
  } catch {
    return null;
  }
}

function setStoredAuth(authPayload) {
  if (!authPayload) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authPayload));
}

async function refreshAccessToken(refreshToken) {
  const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken })
  });

  if (!response.ok) return null;
  const data = await response.json();
  return data.access_token || null;
}

async function request(path, options = {}) {
  const auth = getStoredAuth();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(auth?.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {}),
      ...(options.headers || {})
    },
    ...options
  });

  if (response.status === 401 && auth?.refreshToken) {
    const nextAccessToken = await refreshAccessToken(auth.refreshToken);
    if (nextAccessToken) {
      const nextAuth = { ...auth, accessToken: nextAccessToken };
      setStoredAuth(nextAuth);
      return request(path, options);
    }

    setStoredAuth(null);
  }

  if (!response.ok) {
    let message = "Request failed";
    console.error(`API Error [${response.status}] at ${API_BASE_URL}${path}`);
    try {
      const data = await response.json();
      message = data.error || message;
    } catch {
      // keep default message
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function adminLogin({ identifier, password }) {
  const response = await fetch(`${API_BASE_URL}/api/auth/admin-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password })
  });

  if (!response.ok) {
    let message = "Login failed";
    console.error(`Login Error [${response.status}] at ${API_BASE_URL}/api/auth/admin-login`);
    try {
      const data = await response.json();
      message = data.error || message;
    } catch {
      // keep default
    }
    throw new Error(message);
  }

  const data = await response.json();
  setStoredAuth({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    user: data.user
  });

  return data.user;
}

export function getAdminSession() {
  const auth = getStoredAuth();
  return auth?.user || null;
}

export function adminLogout() {
  setStoredAuth(null);
}

export async function searchPatients(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.barangay) query.set("barangay", params.barangay);
  if (params.municipality) query.set("municipality", params.municipality);
  const suffix = query.toString() ? `?${query}` : "";
  return request(`/api/patients${suffix}`);
}

export async function createPatient(payload) {
  return request("/api/patients", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
