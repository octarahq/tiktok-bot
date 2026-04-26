import axios from "axios";
import fs from "fs";
import { getOAuthCode } from "../oauth.js";
import { getTokens, updatePlatformTokens } from "./index.js";
import pc from "picocolors";

export async function uploadToTikTok(
  videoPath: string,
  title: string,
  hashtags: string[],
) {
  let tokens = getTokens().tiktok;

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI;

  if (!tokens) {
    const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&scope=video.upload&response_type=code&redirect_uri=${encodeURIComponent(redirectUri!)}`;

    const code = await getOAuthCode(authUrl, 3000, "/callback/tiktok");

    const tokenRes = await axios.post(
      "https://open.tiktokapis.com/v2/oauth/token/",
      new URLSearchParams({
        client_key: clientKey!,
        client_secret: clientSecret!,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri!,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );

    tokens = {
      accessToken: tokenRes.data.access_token,
      refreshToken: tokenRes.data.refresh_token,
      expiresAt: Date.now() + tokenRes.data.expires_in * 1000,
    };
    updatePlatformTokens("tiktok", tokens);
  }

  if (!tokens) throw new Error("Failed to obtain tokens");

  if (tokens.expiresAt && Date.now() > tokens.expiresAt - 60000) {
    const refreshRes = await axios.post(
      "https://open.tiktokapis.com/v2/oauth/token/",
      new URLSearchParams({
        client_key: clientKey!,
        client_secret: clientSecret!,
        refresh_token: tokens.refreshToken!,
        grant_type: "refresh_token",
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );
    tokens = {
      accessToken: refreshRes.data.access_token,
      refreshToken: refreshRes.data.refresh_token,
      expiresAt: Date.now() + refreshRes.data.expires_in * 1000,
    };
    updatePlatformTokens("tiktok", tokens);
  }

  console.log(pc.cyan("Uploading to TikTok..."));

  const initRes = await axios.post(
    "https://api.tiktok.com/v2/post/publish/video/init/",
    {
      post_info: {
        title: `${title} ${hashtags.join(" ")}`,
        privacy_level: "PUBLIC_TO_EVERYONE",
        is_ai_generated: true,
      },
      source_info: {
        source: "FILE_UPLOAD",
        video_size: fs.statSync(videoPath).size,
        chunk_size: fs.statSync(videoPath).size,
        total_chunk_count: 1,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        "Content-Type": "application/json",
      },
    },
  );

  const uploadUrl = initRes.data.data.upload_url;

  await axios.put(uploadUrl, fs.readFileSync(videoPath), {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Range": `bytes 0-${fs.statSync(videoPath).size - 1}/${fs.statSync(videoPath).size}`,
    },
  });

  console.log(pc.green("Video uploaded successfully to TikTok!"));
}
