// Shared Lemon Squeezy auth helper — single source of truth for all routes.

export function getLsApiKey(): string {
  return process.env.LEMONSQUEEZY_API_KEY ?? "";
}

export const LS_STORE_ID = process.env.LEMONSQUEEZY_STORE_ID ?? "";

export const LS_VARIANT_ID: Record<"team" | "company", string> = {
  team: process.env.LEMONSQUEEZY_VARIANT_ID_TEAM ?? "",
  company: process.env.LEMONSQUEEZY_VARIANT_ID_COMPANY ?? "",
};
