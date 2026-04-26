# Guide: Setting up OAuth for Video Publishing

To enable automatic uploading to YouTube, TikTok, and Instagram, you need to create "Apps" on each platform's developer portal.

## 1. YouTube (Google Cloud Console)

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project.
3. Search for **YouTube Data API v3** and enable it.
4. Go to **APIs & Services > OAuth consent screen**.
   - Choose "External".
   - Fill in app name, user support email, etc.
   - Add the scope: `https://www.googleapis.com/auth/youtube.upload`.
5. Go to **APIs & Services > Credentials**.
   - Click **Create Credentials > OAuth client ID**.
   - Select **Web application**.
   - Add Authorized redirect URI: `http://localhost:3000/callback/youtube`.
6. Copy the **Client ID** and **Client Secret** to your `.env` file.

## 2. TikTok (TikTok for Developers)

1. Go to the [TikTok for Developers](https://developers.tiktok.com/).
2. Register as a developer and create a new app.
3. Under **Products**, add **Content Posting API**.
4. Configure your app:
   - Redirect URI: `https://localhost:3000/callback/tiktok` (TikTok often requires HTTPS, you might need to use a tunnel or a bypass).
5. Copy the **Client Key** and **Client Secret** to your `.env` file.

## 3. Instagram (Meta for Developers)

1. Go to the [Meta for Developers](https://developers.facebook.com/).
2. Create a new "Business" or "Consumer" app (Business is preferred for API access).
3. Add **Instagram Graph API** to your app.
4. You will need:
   - An Instagram Business or Creator account.
   - A Facebook Page linked to that Instagram account.
5. In **App Settings > Basic**, get your App ID/Secret.
6. In **Instagram > Basic Display**, add your Redirect URI: `https://localhost:3000/callback/instagram`.
7. Copy the **App ID** (Client ID) and **App Secret** (Client Secret) to your `.env` file.

## General Setup

Once the `.env` is filled, the bot will automatically show the upload options in the export menu.
If you are not logged in, it will open your browser to authorize the application during the first upload.
Your tokens will be saved locally in `src/data/tokens.json`.
