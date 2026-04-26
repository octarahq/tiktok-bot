import fs from "fs";
import path from "path";
import "dotenv/config";

const TOKENS_PATH = path.join(process.cwd(), "src/data/tokens.json");

export interface PlatformTokens {
  accessToken: string;
  refreshToken?: string | undefined;
  expiresAt?: number | undefined;
}

export interface AllTokens {
  youtube?: PlatformTokens;
  tiktok?: PlatformTokens;
  instagram?: PlatformTokens;
}

export function getTokens(): AllTokens {
  if (!fs.existsSync(TOKENS_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(TOKENS_PATH, "utf-8"));
  } catch {
    return {};
  }
}

export function saveTokens(tokens: AllTokens) {
  const dir = path.dirname(TOKENS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2));
}

export function updatePlatformTokens(
  platform: keyof AllTokens,
  tokens: PlatformTokens,
) {
  const all = getTokens();
  all[platform] = tokens;
  saveTokens(all);
}

export function isPlatformConfigured(
  platform: "youtube" | "tiktok" | "instagram",
): boolean {
  switch (platform) {
    case "youtube":
      return !!process.env.YOUTUBE_CLIENT_ID;
    case "tiktok":
      return !!process.env.TIKTOK_CLIENT_KEY;
    case "instagram":
      return !!process.env.INSTAGRAM_CLIENT_ID;
    default:
      return false;
  }
}
