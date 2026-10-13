import { startApi } from "./local-api.mjs";
let server;
process.once("message", async (configuration) => {
  try {
    server = await startApi(configuration);
    process.send?.({ ready: true });
  } catch {
    process.send?.({ ready: false });
    process.exit(1);
  }
});
process.once("SIGTERM", () =>
  server ? server.close(() => process.exit(0)) : process.exit(0),
);
process.once("disconnect", () =>
  server ? server.close(() => process.exit(0)) : process.exit(0),
);
