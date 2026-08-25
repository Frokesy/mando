export const PASSWORD_RESET_EMAIL_KEY = "mando_password_reset_email";
export const PASSWORD_RESET_TOKEN_KEY = "mando_password_reset_token";

export const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000").replace(/\/+$/, "");

export async function readApiMessage(response: Response, fallback: string) {
  const result = await response.json().catch(() => null);
  return typeof result?.message === "string" ? result.message : fallback;
}
