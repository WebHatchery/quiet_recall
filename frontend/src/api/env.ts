type EnvKey = "VITE_API_BASE_URL" | "VITE_APP_NAME" | "VITE_BASE_PATH";

export function requiredEnv(key: EnvKey): string {
  const value = import.meta.env[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${key} environment variable is required.`);
  }

  return value;
}
