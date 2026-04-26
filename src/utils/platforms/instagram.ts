import axios from "axios";
import { getOAuthCode } from "../oauth.js";
import { getTokens, updatePlatformTokens } from "./index.js";
import pc from "picocolors";

export async function uploadToInstagram(videoPath: string, caption: string) {
  let tokens = getTokens().instagram;

  const clientId = process.env.INSTAGRAM_CLIENT_ID;
  const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;

  if (!tokens) {
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri!)}&scope=instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement`;

    const code = await getOAuthCode(authUrl, 3000, "/callback/instagram");

    const tokenRes = await axios.get(
      "https://graph.facebook.com/v18.0/oauth/access_token",
      {
        params: {
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          code,
        },
      },
    );

    const longLivedRes = await axios.get(
      "https://graph.facebook.com/v18.0/oauth/access_token",
      {
        params: {
          grant_type: "fb_exchange_token",
          client_id: clientId,
          client_secret: clientSecret,
          fb_exchange_token: tokenRes.data.access_token,
        },
      },
    );

    tokens = {
      accessToken: longLivedRes.data.access_token,
      expiresAt: Date.now() + (longLivedRes.data.expires_in || 5184000) * 1000,
    };
    updatePlatformTokens("instagram", tokens);
  }

  if (!tokens) throw new Error("Failed to obtain tokens");

  console.log(
    pc.yellow(
      "Note: Instagram Publishing API typically requires a public URL for the video.",
    ),
  );
  console.log(pc.cyan("Attempting to create media container..."));

  const accountsRes = await axios.get(
    `https://graph.facebook.com/v18.0/me/accounts?access_token=${tokens.accessToken}`,
  );
  const pageId = accountsRes.data.data[0].id;

  const igAccountRes = await axios.get(
    `https://graph.facebook.com/v18.0/${pageId}?fields=instagram_business_account&access_token=${tokens.accessToken}`,
  );
  const igId = igAccountRes.data.instagram_business_account.id;

  console.log(
    pc.red(
      "Instagram upload via official API requires a public URL. Please ensure your video is hosted or use a different method.",
    ),
  );
}
