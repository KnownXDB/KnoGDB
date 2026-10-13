import { startDatabase, stopDatabase, checkDocker } from "./local-services.mjs";
try {
  if (process.argv[2] === "stop") await stopDatabase();
  else if (process.argv[2] === "check") {
    await checkDocker();
    console.log("Docker is ready.");
  } else await startDatabase();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
