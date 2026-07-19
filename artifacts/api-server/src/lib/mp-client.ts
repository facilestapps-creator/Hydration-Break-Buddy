// Shared Mercado Pago auth helpers — single source of truth for all routes.
// MP_ENV=production → real credentials; any other value → sandbox test-seller.

export const IS_MP_PROD = process.env.MP_ENV === "production";

export function getMpToken(): string {
  if (IS_MP_PROD) {
    return process.env.MP_ACCESS_TOKEN_PROD ?? process.env.MP_ACCESS_TOKEN ?? "";
  }
  return process.env.MP_ACCESS_TOKEN_TEST_SELLER ?? process.env.MP_ACCESS_TOKEN ?? "";
}
