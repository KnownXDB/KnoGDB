import { createHandler } from "./handler.js";
import { createAdminHandler } from "./admin-handler.js";
import { createCatalogReader } from "../infrastructure/catalog-reader.js";
import { createAdminGateway } from "../infrastructure/admin-gateway.js";
import { createAssetService } from "../infrastructure/asset-service.js";
import type { RuntimeMode } from "../infrastructure/runtime-policy.js";
export interface ApplicationConfig {
  projectUrl?: string | undefined;
  serviceKey?: string | undefined;
  fileOrigin?: string | undefined;
  signingKey?: string | undefined;
  adminOrigin?: string | undefined;
}
export function createApplication(
  config: ApplicationConfig,
  mode: RuntimeMode = "hosted",
) {
  const { projectUrl, serviceKey, fileOrigin, signingKey, adminOrigin } =
    config;
  const assets =
    projectUrl && serviceKey && fileOrigin && signingKey
      ? createAssetService(projectUrl, serviceKey, fileOrigin, signingKey, mode)
      : undefined;
  const admin =
    projectUrl && serviceKey
      ? createAdminHandler(
          createAdminGateway(projectUrl, serviceKey, mode),
          adminOrigin,
          assets,
        )
      : undefined;
  const catalog =
    projectUrl && serviceKey
      ? createCatalogReader(projectUrl, serviceKey, mode)
      : undefined;
  const publicApi = createHandler(catalog);
  return async (request: Request, ip?: string) => {
    const path = new URL(request.url).pathname;
    if (/^\/(?:admin\/)?api\/v1\/admin\//.test(path)) {
      if (admin) return admin(request, ip);
    } else if (
      /^\/api\/v1\/(games\/[^/]+\/assets|assets\/[^/]+\/file)$/.test(path)
    ) {
      if (assets) return assets.public(request);
    } else return publicApi(request);
    return Response.json(
      { error: "service_not_configured" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  };
}
