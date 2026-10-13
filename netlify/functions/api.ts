import { createApplication } from "../../src/api/application.js";
export default async function handler(
  request: Request,
  context?: { ip?: string },
): Promise<Response> {
  try {
    return await createApplication({
      projectUrl: process.env.SUPABASE_URL,
      serviceKey: process.env.SUPABASE_SECRET_KEY,
      fileOrigin: process.env.ASSET_GATEWAY_ORIGIN,
      signingKey: process.env.ASSET_SIGNING_PRIVATE_KEY,
      adminOrigin: process.env.ADMIN_ORIGIN,
    })(request, context?.ip);
  } catch {
    return Response.json(
      { error: "service_not_configured" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
export const config = { path: ["/api/v1/*", "/admin/api/v1/*"] };
