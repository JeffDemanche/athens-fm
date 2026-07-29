/**
 * Whether deploy/boot should apply pending Mongo migrations.
 * Skipped on Vercel Preview and when SKIP_DB_MIGRATIONS=1.
 */
export function shouldRunMigrations(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (env.SKIP_DB_MIGRATIONS === "1") {
    return false;
  }
  // Vercel sets VERCEL_ENV to "production" | "preview" | "development"
  if (env.VERCEL_ENV === "preview") {
    return false;
  }
  return true;
}

export function migrationsSkipReason(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  if (env.SKIP_DB_MIGRATIONS === "1") {
    return "SKIP_DB_MIGRATIONS=1";
  }
  if (env.VERCEL_ENV === "preview") {
    return "VERCEL_ENV=preview";
  }
  return null;
}
