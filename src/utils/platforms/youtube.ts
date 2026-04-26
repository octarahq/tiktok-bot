import { google } from "googleapis";
import fs from "fs";
import { getOAuthCode } from "../oauth.js";
import { getTokens, updatePlatformTokens } from "./index.js";
import pc from "picocolors";

export async function uploadToYouTube(
  videoPath: string,
  title: string,
  description: string,
) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    process.env.YOUTUBE_REDIRECT_URI,
  );

  let tokens = getTokens().youtube;

  if (!tokens) {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/youtube.upload"],
      prompt: "consent",
    });

    const code = await getOAuthCode(authUrl, 3000, "/callback/youtube");
    const { tokens: newTokens } = await oauth2Client.getToken(code);

    const newPlatformTokens = {
      accessToken: newTokens.access_token!,
      refreshToken: newTokens.refresh_token!,
      expiresAt: newTokens.expiry_date || undefined,
    };
    tokens = newPlatformTokens;
    updatePlatformTokens("youtube", newPlatformTokens);
  }

  const finalTokens = tokens!;

  oauth2Client.setCredentials({
    access_token: finalTokens.accessToken,
    refresh_token: finalTokens.refreshToken || null,
    expiry_date: finalTokens.expiresAt || null,
  });

  const youtube = google.youtube({ version: "v3", auth: oauth2Client });

  console.log(pc.cyan("Uploading to YouTube Shorts..."));

  const shortsTitle =
    title.length > 92
      ? title.substring(0, 92) + " #shorts"
      : `${title} #shorts`;
  const shortsDescription = description.includes("#shorts")
    ? description
    : `${description}\n\n#shorts`;

  const res = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: shortsTitle,
        description: shortsDescription,
        categoryId: "22",
        tags: shortsDescription.match(/#\w+/g) || [],
      },
      status: {
        privacyStatus: "public",
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      body: fs.createReadStream(videoPath),
    },
  });

  console.log(
    pc.green(
      `Video uploaded successfully to YouTube! url: https://www.youtube.com/watch?v=${res.data.id}`,
    ),
  );
  return res.data;
}
