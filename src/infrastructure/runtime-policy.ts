export type RuntimeMode = "hosted" | "local";
export function serviceOrigin(
  value: string,
  mode: RuntimeMode = "hosted",
): URL {
  const url = new URL(value);
  const allowed =
    mode === "local"
      ? url.hostname === "127.0.0.1" &&
        ["http:", "https:"].includes(url.protocol)
      : url.protocol === "https:";
  if (
    !allowed ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error("service_not_configured");
  return url;
}
export function serviceHeaders(
  secret: string,
  mode: RuntimeMode = "hosted",
): Record<string, string> {
  if (secret.startsWith("sb_secret_") && secret.length >= 20)
    return { apikey: secret };
  if (mode === "local")
    try {
      const parts = secret.split("."),
        claims = JSON.parse(
          Buffer.from(parts[1] ?? "", "base64url").toString(),
        );
      if (
        parts.length === 3 &&
        claims.role === "service_role" &&
        claims.iss === "supabase"
      )
        return { apikey: secret, Authorization: `Bearer ${secret}` };
    } catch {}
  throw new Error("service_not_configured");
}
