async function testCensus() {
  try {
    // 1. Login
    const loginRes = await fetch("http://localhost:3000/api/auth/admin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "admin", password: "password" })
    });
    const loginData = await loginRes.json();
    const token = loginData.access_token;

    // 2. Fetch Patients
    const res = await fetch("http://localhost:3000/api/patients", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Data:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Test error:", err.message);
  }
}
testCensus();
