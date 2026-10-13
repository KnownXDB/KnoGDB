export interface Localization {
  language: string;
  title: string;
  description?: string | null;
  source_reference: string;
  confidence: number;
  is_primary: boolean;
  moderation_status?: string;
}
export interface Game {
  id: string;
  status: string;
  updated_at: string;
  localizations: Localization[];
}
export const roleNames = {
  header: "Header",
  capsule: "Capsule",
  hero: "Hero",
  logo: "Logo",
  icon: "Icon",
  client_icon: "Client icon",
};
export type Role = keyof typeof roleNames;
export interface Asset {
  id: string;
  game_id: string;
  role: Role;
  language_kind: "global" | "localized";
  language_tags: string[];
  provenance: string;
  moderation_status: string;
  publication_status: string;
  width: number;
  height: number;
  byte_size: number;
}
const errors: Record<string, string> = {
  unauthorized: "Sign in with an approved administrator account.",
  admin_forbidden: "This account does not have administrator access.",
  rights_required: "Enter a distribution rights reference to publish.",
  invalid_asset: "The original could not be validated.",
  invalid_request: "Check the fields and try again.",
  edit_conflict: "This title changed. Reload before saving.",
  publication_requires_review:
    "Publishing requires an approved primary translation.",
  rate_limited: "Too many attempts. Wait one minute.",
  storage_budget_reached: "The development storage budget is full.",
  duplicate_asset: "This original is already registered.",
};
export class ApiError extends Error {
  constructor(
    public status: number,
    code: string,
  ) {
    super(errors[code] ?? "The service is temporarily unavailable. Try again.");
  }
}
export async function api<T>(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`/admin/api/v1/admin/${path}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    headers:
      body === undefined
        ? {}
        : { "Content-Type": "application/json", "X-KnownGDB-Action": "admin" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    ...(signal ? { signal } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new ApiError(response.status, data.error);
  return data;
}
export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "The request failed.";
