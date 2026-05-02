import "dotenv/config";

async function triggerError() {
  const loginRes = await fetch("http://localhost:3000/api/auth/admin-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: "test@test.com", password: "password" })
  });
  
  const loginData = await loginRes.json();
  if (!loginData.access_token) {
    console.error("Login failed:", loginData);
    return;
  }
  
  console.log("Logged in. Calling census...");
  
  const res = await fetch("http://localhost:3000/api/census", {
    headers: { "Authorization": `Bearer ${loginData.access_token}` }
  });
  
  const data = await res.json();
  console.log("Census Status:", res.status);
  if (res.status !== 200) {
    console.log("Census Error Body:", JSON.stringify(data, null, 2));
  } else {
    console.log("Census successful.");
  }

  console.log("Calling animal_bites...");
  const resBites = await fetch("http://localhost:3000/api/animal_bites", {
    headers: { "Authorization": `Bearer ${loginData.access_token}` }
  });
  const dataBites = await resBites.json();
  console.log("Animal Bites Status:", resBites.status);
  if (resBites.status !== 200) {
    console.log("Animal Bites Error Body:", JSON.stringify(dataBites, null, 2));
  } else {
    console.log("Animal Bites successful.");
  }
}

triggerError();
