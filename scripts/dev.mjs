import { createServer } from "vite";
import { watch } from "node:fs";
import { spawn, fork } from "node:child_process";
import {
  startDatabase,
  localCertificates,
  localSigning,
  localOrigin,
} from "./local-services.mjs";
import { startAssets } from "./local-assets.mjs";

let api, worker, vite, watcher;
async function startApi(configuration) {
  const child = fork("scripts/local-api-worker.mjs", [], {
    stdio: ["ignore", "inherit", "inherit", "ipc"],
  });
  await new Promise((done, reject) => {
    const timeout = setTimeout(() => {
      child.kill();
      reject(Error("Local API startup timed out."));
    }, 15000);
    child.once("message", (message) => {
      clearTimeout(timeout);
      message.ready ? done() : reject(Error("Local API startup failed."));
    });
    child.once("error", () => {
      clearTimeout(timeout);
      reject(Error("Local API process failed."));
    });
    child.once("exit", (code) => {
      clearTimeout(timeout);
      if (code) reject(Error("Local API process exited."));
    });
    child.send(configuration);
  });
  return child;
}
async function stopApi() {
  if (!api || api.exitCode !== null) return;
  await new Promise((done) => {
    api.once("exit", done);
    api.kill();
  });
}
try {
  const database = await startDatabase(),
    tls = await localCertificates(),
    signing = localSigning();
  const config = {
    projectUrl: database.projectUrl,
    serviceKey: database.serviceKey,
    fileOrigin: "http://127.0.0.1:8789",
    signingKey: signing.privateKey,
  };
  worker = await startAssets(signing.publicKey);
  api = await startApi(config);
  vite = await createServer({ server: { https: tls } });
  await vite.listen();
  console.log(`Full local application: ${localOrigin}/admin/`);
  console.log(
    "PostgreSQL/Auth: http://127.0.0.1:54321 · Studio: http://127.0.0.1:54323 · Mail: http://127.0.0.1:54324",
  );
  console.log(
    "Local data and assets persist. No hosted services or deploy commands are used.",
  );
  console.log(
    "The local TLS certificate is self-signed. Trust .local/tls.crt locally or accept it in your development browser.",
  );
  let scheduled,
    updating = false;
  async function rebuild() {
    if (updating) {
      scheduled = setTimeout(rebuild, 400);
      return;
    }
    updating = true;
    try {
      await new Promise((done, reject) => {
        const child = spawn(
          process.execPath,
          ["node_modules/typescript/bin/tsc"],
          { stdio: "inherit" },
        );
        child.once("exit", (code) =>
          code === 0 ? done() : reject(Error("Build failed")),
        );
        child.once("error", reject);
      });
      await stopApi();
      await worker.dispose();
      worker = await startAssets(signing.publicKey);
      api = await startApi(config);
      console.log("Local backend rebuilt.");
    } catch {
      console.error("Backend reload failed. Fix the build and retry.");
    } finally {
      updating = false;
    }
  }
  const reload = () => {
    clearTimeout(scheduled);
    scheduled = setTimeout(rebuild, 300);
  };
  watcher = watch("src", { recursive: true }, reload);
  const assetWatcher = watch("workers", { recursive: true }, reload);
  async function stop() {
    watcher?.close();
    assetWatcher.close();
    clearTimeout(scheduled);
    await vite?.close();
    await stopApi();
    await worker?.dispose();
    process.exit(0);
  }
  process.once("SIGINT", () => void stop());
  process.once("SIGTERM", () => void stop());
} catch (error) {
  await vite?.close();
  await stopApi();
  await worker?.dispose();
  console.error(error.message);
  process.exitCode = 1;
}
