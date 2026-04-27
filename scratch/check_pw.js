import bcrypt from "bcryptjs";

const hash = "$2b$10$lXYVdYB9GPzWfXvfnfoRKO9tpaV9TcBQ.QSLpGxeVa0tL50kYx/gO";
const passwords = ["password", "admin", "admin123", "123456"];

for (const pw of passwords) {
  if (await bcrypt.compare(pw, hash)) {
    console.log(`Password is: ${pw}`);
    process.exit(0);
  }
}
console.log("No match found");
