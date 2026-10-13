import { request } from "node:http";
import { setTimeout as delay } from "node:timers/promises";

// Docker Desktop can ignore a network's default bind address. Explicitly rebind
// only this project's containers, keeping their configuration and data volumes.
export async function localDockerSocket(exec, docker) {
  const endpoint =
    process.env.DOCKER_HOST ??
    (
      await exec(docker, [
        "context",
        "inspect",
        "--format",
        "{{.Endpoints.docker.Host}}",
      ])
    ).stdout.trim();
  const socketPath = endpoint.startsWith("npipe://")
    ? endpoint.slice(8).replaceAll("/", "\\")
    : endpoint.startsWith("unix://")
      ? new URL(endpoint).pathname
      : null;
  if (!socketPath)
    throw Error(
      "Local development requires a local Docker socket, not a remote Docker endpoint.",
    );
  return socketPath;
}
export async function restrictPublishedPorts(exec, docker, names) {
  const socketPath = await localDockerSocket(exec, docker);
  function call(method, path, body, raw = false) {
    return new Promise((done, reject) => {
      const bytes =
        body === undefined
          ? null
          : Buffer.isBuffer(body)
            ? body
            : Buffer.from(JSON.stringify(body));
      const outgoing = request(
        {
          socketPath,
          path,
          method,
          headers: bytes
            ? {
                "Content-Type": Buffer.isBuffer(body)
                  ? "application/x-tar"
                  : "application/json",
                "Content-Length": bytes.length,
              }
            : {},
        },
        (incoming) => {
          const chunks = [];
          incoming.on("data", (chunk) => chunks.push(chunk));
          incoming.once("end", () => {
            if (incoming.statusCode >= 400) {
              reject(Error("Local container operation failed."));
              return;
            }
            const content = Buffer.concat(chunks);
            if (raw) {
              done(content);
              return;
            }
            const text = content.toString();
            done(text ? JSON.parse(text) : null);
          });
        },
      );
      outgoing.once("error", () =>
        reject(Error("Local Docker socket unavailable.")),
      );
      outgoing.setTimeout(30000, () => outgoing.destroy());
      outgoing.end(bytes);
    });
  }
  for (const name of names) {
    const current = await call("GET", `/containers/${name}/json`);
    if (
      current.Config.Labels?.["com.supabase.cli.project"] !==
        "knowngdb-local" ||
      !name.endsWith("_knowngdb-local") ||
      current.HostConfig.AutoRemove
    )
      throw Error("Container rebinding target is not this local project.");
    const ports = current.HostConfig.PortBindings ?? {};
    const actual = current.NetworkSettings.Ports ?? {};
    const unsafe =
      Object.values(actual).some((entries) =>
        entries?.some(
          (binding) => !["127.0.0.1", "::1"].includes(binding.HostIp),
        ),
      ) ||
      (!current.State.Running &&
        Object.values(ports).some((entries) =>
          entries?.some(
            (binding) => !["127.0.0.1", "::1"].includes(binding.HostIp),
          ),
        ));
    if (!unsafe) {
      if (!current.State.Running)
        await call("POST", `/containers/${current.Id}/start`);
      continue;
    }
    const backup = `${name}-binding-backup-${current.Id.slice(0, 8)}`;
    const bindings = Object.fromEntries(
      Object.entries(ports).map(([port, entries]) => [
        port,
        entries.map((binding) => ({ ...binding, HostIp: "127.0.0.1" })),
      ]),
    );
    const endpoints = Object.fromEntries(
      Object.entries(current.NetworkSettings.Networks).map(
        ([network, config]) => [network, { Aliases: config.Aliases ?? [] }],
      ),
    );
    await call("POST", `/containers/${current.Id}/stop?t=20`);
    await call("POST", `/containers/${current.Id}/rename?name=${backup}`);
    let replacement;
    try {
      replacement = await call("POST", `/containers/create?name=${name}`, {
        ...current.Config,
        HostConfig: { ...current.HostConfig, PortBindings: bindings },
        NetworkingConfig: { EndpointsConfig: endpoints },
      });
      if (
        current.Config.Env?.includes(
          "KONG_DECLARATIVE_CONFIG=/home/kong/kong.yml",
        )
      ) {
        const archive = await call(
          "GET",
          `/containers/${current.Id}/archive?path=/home/kong`,
          undefined,
          true,
        );
        await call(
          "PUT",
          `/containers/${replacement.Id}/archive?path=/home`,
          archive,
        );
      }
      await call("POST", `/containers/${replacement.Id}/start`);
      const deadline = Date.now() + 60000;
      let ready = false;
      while (Date.now() < deadline) {
        const state = (await call("GET", `/containers/${replacement.Id}/json`))
          .State;
        if (
          state.Running &&
          (!state.Health || state.Health.Status === "healthy")
        ) {
          ready = true;
          break;
        }
        await delay(500);
      }
      if (!ready) throw Error("Rebound container did not become healthy.");
      // No volume-delete flag: only the stopped, superseded container is removed.
      await call("DELETE", `/containers/${current.Id}`);
    } catch {
      if (replacement) {
        await call("POST", `/containers/${replacement.Id}/stop?t=10`).catch(
          () => {},
        );
        await call("DELETE", `/containers/${replacement.Id}`).catch(() => {});
      }
      await call("POST", `/containers/${current.Id}/rename?name=${name}`).catch(
        () => {},
      );
      throw Error(
        "Local binding setup failed; data volumes were retained and the old container remains stopped.",
      );
    }
  }
}
