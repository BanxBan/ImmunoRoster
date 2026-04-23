import { randomBytes } from "node:crypto";

function generateSecret() {
  return randomBytes(64).toString("hex");
}

console.log(`JWT_ACCESS_SECRET=${generateSecret()}`);
console.log(`JWT_REFRESH_SECRET=${generateSecret()}`);
