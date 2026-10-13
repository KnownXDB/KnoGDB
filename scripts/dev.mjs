import { createServer } from "vite";
import { startWorkspace } from "./serve-workspace.mjs";

const api = await startWorkspace();
try {
  const vite = await createServer();
  await vite.listen();
  console.log(
    "React admin: http://127.0.0.1:5173/admin/ — Fast Refresh enabled",
  );
  async function stop() {
    await vite.close();
    api.close(() => process.exit(0));
  }
  process.once("SIGINT", () => void stop());
  process.once("SIGTERM", () => void stop());
} catch (error) {
  api.close();
  throw error;
}
