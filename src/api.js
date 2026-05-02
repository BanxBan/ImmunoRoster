const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
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
    let message = `Request failed (${response.status})`;
    const targetUrl = `${API_BASE_URL}${path}`;
    console.error(`API Error [${response.status}] at ${targetUrl}`);

    if (response.status === 404) {
      message = `API not found at ${targetUrl}. Please verify your backend deployment and VITE_API_BASE_URL.`;
    } else {
      try {
        const data = await response.json();
        message = data.error || message;
      } catch { /* keep default */ }
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function adminLogin({ identifier, password, currentShift }) {
  const response = await fetch(`${API_BASE_URL}/api/auth/admin-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password })
  });

  if (!response.ok) {
    let message = `Login failed (${response.status})`;
    const targetUrl = `${API_BASE_URL}/api/auth/admin-login`;
    console.error(`Login Error [${response.status}] at ${targetUrl}`);
    
    // Clear any potentially corrupted session on failure as requested
    setStoredAuth(null);

    if (response.status === 404) {
      message = `Connection Error: Could not find the login service at ${targetUrl}. Please check your VITE_API_BASE_URL environment variable.`;
    } else if (response.status === 500) {
      message = `Server Error (500): The backend server encountered an error or is not responding. Please ensure your local-dev-server is running on port 3000.`;
    } else {
      try {
        const data = await response.json();
        message = data.error || message;
      } catch { /* keep default */ }
    }
    throw new Error(message);
  }

  const { access_token, refresh_token, user } = await response.json();
  const userWithShift = { ...user, shift: currentShift || user.shift };
  setStoredAuth({ accessToken: access_token, refreshToken: refresh_token, user: userWithShift });
  return userWithShift;
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

export async function updatePatient(id, payload) {
  return request(`/api/patients?id=${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function deletePatient(id) {
  return request(`/api/patients?id=${id}`, {
    method: "DELETE"
  });
}

// Immunizations
export async function getImmunizations(params = {}) {
  const query = new URLSearchParams();
  if (params.patient_id) query.set("patient_id", params.patient_id);
  if (params.status) query.set("status", params.status);
  const suffix = query.toString() ? `?${query}` : "";
  return request(`/api/immunizations${suffix}`);
}

export async function createImmunization(payload) {
  return request("/api/immunizations", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateImmunization(id, payload) {
  return request(`/api/immunizations?id=${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function deleteImmunization(id) {
  return request(`/api/immunizations?id=${id}`, {
    method: "DELETE"
  });
}

// Animal Bites
export async function getAnimalBites(params = {}) {
  const query = new URLSearchParams();
  if (params.patient_id) query.set("patient_id", params.patient_id);
  if (params.status) query.set("status", params.status);
  const suffix = query.toString() ? `?${query}` : "";
  return request(`/api/animal_bites${suffix}`);
}

export async function createAnimalBite(payload) {
  return request("/api/animal_bites", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateAnimalBite(id, payload) {
  return request(`/api/animal_bites?id=${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function deleteAnimalBite(id) {
  return request(`/api/animal_bites?id=${id}`, {
    method: "DELETE"
  });
}

export async function getCommunityData() {
  return request("/api/community");
}

export async function registerNurse(data) {
  return request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function getCensus() {
  return request("/api/census");
}

