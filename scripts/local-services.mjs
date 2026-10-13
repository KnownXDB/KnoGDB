import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { generateKeyPairSync, createPrivateKey } from "node:crypto";
import { generate } from "selfsigned";
import { restrictPublishedPorts, localDockerSocket } from "./local-network.mjs";

const exec = promisify(execFile);
const network = "knowngdb-local-loopback";
export const localOrigin = "https://127.0.0.1:5173";
export function dockerExecutable() {
  const installed =
    process.platform === "win32"
      ? join(
          process.env.LOCALAPPDATA ?? "",
          "Programs/DockerDesktop/resources/bin/docker.exe",
        )
      : "";
  return installed && existsSync(installed) ? installed : "docker";
}
export async function checkDocker() {
  try {
    await localDockerSocket(exec, dockerExecutable());
    await exec(dockerExecutable(), ["info", "--format", "{{.ServerVersion}}"], {
      timeout: 15000,
    });
  } catch {
    throw Error(
      "Docker is unavailable. Install and start Docker Desktop (Linux containers), then retry npm run dev.",
    );
  }
}
export async function cli(args) {
  // Capture both streams: CLI start/status can contain server credentials.
  try {
    const result = await exec(
      process.execPath,
      ["node_modules/supabase/dist/supabase.js", ...args],
      {
        maxBuffer: 8 * 1024 * 1024,
        env: {
          ...process.env,
          PATH: [
            resolve(dockerExecutable(), ".."),
            process.env.PATH ?? "",
          ].join(process.platform === "win32" ? ";" : ":"),
        },
      },
    );
    return result.stdout;
  } catch {
    throw Error(
      `Local database command failed (${args[0]}). Check Docker and the local configuration. No remote command was executed.`,
    );
  }
}
export async function localStatus() {
  const status = JSON.parse(await cli(["status", "-o", "json"]));
  const projectUrl = status.API_URL ?? status.api_url ?? status.api?.url;
  const serviceKey =
    status.SECRET_KEY ??
    status.secret_key ??
    status.SERVICE_ROLE_KEY ??
    status.service_role_key;
  const databaseUrl = status.DB_URL ?? status.db_url;
  const publicKey =
    status.PUBLISHABLE_KEY ??
    status.publishable_key ??
    status.ANON_KEY ??
    status.anon_key;
  if (
    !projectUrl ||
    new URL(projectUrl).hostname !== "127.0.0.1" ||
    !serviceKey ||
    !databaseUrl ||
    new URL(databaseUrl).hostname !== "127.0.0.1"
  )
    throw Error(
      "Local service configuration is incomplete or is not loopback-only.",
    );
  return { projectUrl, serviceKey, databaseUrl, publicKey };
}
export async function localCertificates() {
  mkdirSync(".local", { recursive: true, mode: 0o700 });
  if (!existsSync(".local/tls.key") || !existsSync(".local/tls.crt")) {
    const result = await generate(
      [{ name: "commonName", value: "127.0.0.1" }],
      {
        keySize: 2048,
        algorithm: "sha256",
        extensions: [
          {
            name: "subjectAltName",
            altNames: [
              { type: 7, ip: "127.0.0.1" },
              { type: 2, value: "localhost" },
            ],
          },
        ],
      },
    );
    writeFileSync(".local/tls.key", result.private, { mode: 0o600 });
    writeFileSync(".local/tls.crt", result.cert, { mode: 0o600 });
  }
  return {
    key: readFileSync(".local/tls.key"),
    cert: readFileSync(".local/tls.crt"),
  };
}
export function localSigning() {
  mkdirSync(".local", { recursive: true, mode: 0o700 });
  if (!existsSync(".local/signing.key")) {
    const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
    writeFileSync(
      ".local/signing.key",
      keys.privateKey.export({ type: "pkcs8", format: "pem" }),
      { mode: 0o600 },
    );
    writeFileSync(
      ".local/signing-public.json",
      JSON.stringify(keys.publicKey.export({ format: "jwk" })),
      { mode: 0o600 },
    );
  }
  const privateKey = createPrivateKey(readFileSync(".local/signing.key"))
    .export({ type: "pkcs8", format: "der" })
    .toString("base64");
  return {
    privateKey,
    publicKey: JSON.parse(readFileSync(".local/signing-public.json", "utf8")),
  };
}
export async function startDatabase() {
  await checkDocker();
  let options;
  try {
    options = JSON.parse(
      (
        await exec(dockerExecutable(), [
          "network",
          "inspect",
          network,
          "--format",
          "{{json .Options}}",
        ])
      ).stdout,
    );
  } catch {
    await exec(dockerExecutable(), [
      "network",
      "create",
      "--driver",
      "bridge",
      "--opt",
      "com.docker.network.bridge.host_binding_ipv4=127.0.0.1",
      network,
    ]);
    options = { "com.docker.network.bridge.host_binding_ipv4": "127.0.0.1" };
  }
  if (options?.["com.docker.network.bridge.host_binding_ipv4"] !== "127.0.0.1")
    throw Error(
      "The local Docker network does not restrict published ports to loopback.",
    );
  console.log(
    "Starting local PostgreSQL/Auth/Studio. First start downloads container images.",
  );
  const timer = setInterval(
    () =>
      console.log(
        "Local services are starting; hosted services are untouched.",
      ),
    45000,
  );
  try {
    await cli(["start", "--network-id", network]);
    const names = (
      await exec(dockerExecutable(), [
        "ps",
        "-a",
        "--filter",
        "name=knowngdb-local",
        "--format",
        "{{.Names}}",
      ])
    ).stdout
      .trim()
      .split(/\r?\n/)
      .filter((name) => name.endsWith("_knowngdb-local"));
    if (!names.length) throw Error("Local containers were not found.");
    try {
      await restrictPublishedPorts(exec, dockerExecutable(), names);
    } catch (error) {
      await stopDatabase();
      throw error;
    }
    const bindings = (
      await exec(dockerExecutable(), [
        "inspect",
        ...names,
        "--format",
        "{{json .NetworkSettings.Ports}}",
      ])
    ).stdout
      .trim()
      .split(/\r?\n/)
      .map((value) => JSON.parse(value));
    if (
      bindings.some((ports) =>
        Object.values(ports ?? {}).some((entries) =>
          entries?.some(
            (binding) => !["127.0.0.1", "::1"].includes(binding.HostIp),
          ),
        ),
      )
    ) {
      await stopDatabase();
      throw Error(
        "Local services were stopped because a container exposed a non-loopback port.",
      );
    }
    await cli(["db", "push", "--local", "--yes"]);
    return await localStatus();
  } finally {
    clearInterval(timer);
  }
}
export async function stopDatabase() {
  await cli(["stop", "--project-id", "knowngdb-local"]);
  console.log("Local database stopped; volumes preserved.");
}
