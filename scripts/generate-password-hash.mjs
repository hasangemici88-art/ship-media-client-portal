import bcrypt from "bcryptjs";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const rl = readline.createInterface({ input, output });
const password = await rl.question("Portal password to hash: ");
rl.close();

if (!password || password.length < 12) {
  throw new Error("Use a strong password with at least 12 characters.");
}

const hash = await bcrypt.hash(password, 12);
console.log(`PORTAL_PASSWORD_HASH=${hash}`);
