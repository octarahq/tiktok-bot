<div align="center">
  <img src="https://tools.octara.xyz/favicon.png" alt="Octara Logo" width="200" />
</div>

<p align="center">
  <b>Automated viral video generation for TikTok</b>
</p>

<p align="center">
  <a href="https://discord.gg/octara">
    <img src="https://img.shields.io/discord/1330635185590632489?color=5865F2&label=Discord&logo=discord&logoColor=white" alt="Discord" />
  </a>
  <img src="https://img.shields.io/github/last-commit/octarahq/tiktok-bot" alt="Last Commit" />
  <a href="https://tools.octara.xyz"><img src="https://img.shields.io/badge/Website-tools.octara.xyz-blue.svg" alt="Website" /></a>
</p>

## 📖 About

**TikTok Bot** is an automated video generation platform designed to create viral TikTok content in minutes. Built by **Octara**, it automates the entire pipeline from scriptwriting to final video assembly, featuring AI-generated scripts, realistic voice-overs, and dynamic character animations.

## ✨ Features

- 📝 **AI Script Generation**: Powered by Google Gemini to create engaging and trending scripts.
- 🎙️ **Voice Synthesis**: Automatic voice-over generation with character-specific voices.
- 🎭 **Dynamic Character Overlays**: Automatically syncs character visuals (like Peter and Stewie Griffin) with speaking segments.
- 🎬 **Automatic Video Assembly**: Mixes background footage, audio tracks, and word-highlighting subtitles seamlessly.
- 💾 **Session Management**: Built-in system to save and resume progress, ensuring you never lose your work.
- 🖌️ **Pro Subtitles**: High-quality `.ass` subtitles with dynamic word highlighting.

## 🚀 Getting Started

### Prerequisites

- **Node.js**: Version 22 or higher.
- **FFmpeg**: Installed and available in your system path.
- **Gemini API Key**: A valid API token from Google AI Studio.

### Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/octarahq/tiktok-bot.git
   cd tiktok-bot
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory and add your Gemini API key:
   ```env
   GEMINI_API_TOKEN="your_api_token_here"
   ```

### Running the Bot

To start the interactive video generation process:

```bash
npm run start
```

## 🛠️ Usage Tutorial

Using the TikTok Bot is simple and guided by an interactive CLI.

1. **Launch the Bot**: Run `npm run start`.
2. **Select Action**: Choose **"Start generating"** to begin a new project.
3. **Session Recovery**: If you have a previous session, the bot will ask if you want to resume. This is useful if a generation was interrupted.
4. **Subject Generation**: The bot will automatically generate a trending subject. You can accept it or modify it.
5. **Script Writing**: Gemini will craft a script based on the subject.
6. **Voice Synthesis**: The bot will generate voices for each character in the script.
7. **Final Rendering**: FFmpeg will assemble the video, overlays, and subtitles.
8. **Output**: Your final video will be saved in `video/video.mp4`, ready for upload!

## 🔗 Links

- **Official Website**: [tools.octara.xyz](https://tools.octara.xyz)
- **GitHub Repository**: [octarahq/tiktok-bot](https://github.com/octarahq/tiktok-bot)
- **Octara HQ**: [octara.xyz](https://octara.xyz)

## 🆘 Help

If you encounter any issues or have questions, feel free to join our **[Discord Server](https://octara.xyz/api/discord)** or open an issue on GitHub.
