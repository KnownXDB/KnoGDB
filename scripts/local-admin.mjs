import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import pg from "pg";
import { localStatus } from "./local-services.mjs";
import { serviceHeaders } from "../dist/src/infrastructure/runtime-policy.js";

const database = await localStatus();
const prompt = createInterface({
  input: process.stdin,
  output: process.stdout,
});
const email = (await prompt.question("Local administrator email: "))
  .trim()
  .toLowerCase();
prompt.close();
if (!email.includes("@") || email.length > 254) throw Error("Invalid email.");
if (!process.stdin.isTTY)
  throw Error("Use an interactive terminal to enter a private password.");
process.stdout.write("Local administrator password (not echoed): ");
const silent = new Writable({
  write(_chunk, _encoding, done) {
    done();
  },
});
const passwordPrompt = createInterface({
  input: process.stdin,
  output: silent,
  terminal: true,
});
const password = await passwordPrompt.question("");
passwordPrompt.close();
process.stdout.write("\n");
if (password.length < 12)
  throw Error("Use a password of at least 12 characters.");
const client = new pg.Client({ connectionString: database.databaseUrl });
await client.connect();
try {
  await client.query(
    "insert into catalog.admin_allowlist(email) values($1) on conflict do nothing",
    [email],
  );
  const response = await fetch(`${database.projectUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      ...serviceHeaders(database.serviceKey, "local"),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
    redirect: "error",
  });
  if (!response.ok)
    throw Error(
      "Local account creation failed. If the account exists, manage it in local Studio.",
    );
  console.log(
    "Local administrator created. Sign in at https://127.0.0.1:5173/admin/. No password was saved to a file.",
  );
} finally {
  await client.end();
}
