import { execSync } from "child_process";
import path from "path";
import fs from "fs";
import pc from "picocolors";
import { getSession } from "../utils/session.js";
import { getHashtags } from "./config.js";
import { generateThumbnail } from "../utils/video.js";
import { isPlatformConfigured } from "../utils/platforms/index.js";

export default async function exportVideo(p: typeof import("@clack/prompts")) {
  const s = p.spinner();
  const sourceVideo = path.join(process.cwd(), "temp/video/video.mp4");
  const session = getSession();
  const subject = session.subject || "Untitled Video";
  const hashtags = getHashtags();

  if (!fs.existsSync(sourceVideo)) {
    p.log.error(pc.red("Generated video not found in temp/video/video.mp4"));
    return;
  }

  const options: { value: string; label: string }[] = [
    { value: "save", label: "Save locally (File explorer)" },
  ];

  if (isPlatformConfigured("youtube"))
    options.push({ value: "youtube", label: "Upload to YouTube" });
  if (isPlatformConfigured("tiktok"))
    options.push({ value: "tiktok", label: "Upload to TikTok" });
  if (isPlatformConfigured("instagram"))
    options.push({ value: "instagram", label: "Upload to Instagram" });

  if (options.length > 2) {
    options.push({ value: "all", label: pc.bold("Upload to ALL platforms") });
  }

  options.push({ value: "back", label: "Back" });
  options.push({ value: "exit", label: "Exit" });

  const action = await p.select({
    message: "Where do you want to export the video?",
    options,
  });

  if (p.isCancel(action) || action === "exit") {
    const deleteTemp = await p.confirm({
      message: "Do you want to delete temporary files from this session?",
      initialValue: true,
    });

    const { clearSession } = await import("../utils/session.js");
    clearSession(p.isCancel(deleteTemp) ? true : deleteTemp);
    process.exit(0);
  }

  if (action === "back") return;

  if (action === "save") {
    await saveLocally(p, sourceVideo, s);
  } else if (action === "all") {
    if (isPlatformConfigured("youtube"))
      await handleUpload(p, "youtube", sourceVideo, subject, hashtags);
    if (isPlatformConfigured("tiktok"))
      await handleUpload(p, "tiktok", sourceVideo, subject, hashtags);
    if (isPlatformConfigured("instagram"))
      await handleUpload(p, "instagram", sourceVideo, subject, hashtags);
  } else {
    await handleUpload(p, action as any, sourceVideo, subject, hashtags);
  }
}

async function handleUpload(
  p: typeof import("@clack/prompts"),
  platform: "youtube" | "tiktok" | "instagram",
  videoPath: string,
  subject: string,
  hashtags: string[],
) {
  const s = p.spinner();
  const thumbnailPath = path.join(process.cwd(), "temp/thumbnail.jpg");
  generateThumbnail(videoPath, thumbnailPath);

  s.start(pc.cyan(`Preparing upload to ${platform}...`));

  try {
    if (platform === "youtube") {
      const { uploadToYouTube } = await import("../utils/platforms/youtube.js");
      await uploadToYouTube(
        videoPath,
        subject,
        `${subject}\n\n${hashtags.join(" ")}`,
      );
    } else if (platform === "tiktok") {
      const { uploadToTikTok } = await import("../utils/platforms/tiktok.js");
      await uploadToTikTok(videoPath, subject, hashtags);
    } else if (platform === "instagram") {
      const { uploadToInstagram } =
        await import("../utils/platforms/instagram.js");
      await uploadToInstagram(videoPath, `${subject}\n\n${hashtags.join(" ")}`);
    }
    s.stop(pc.green(`Successfully uploaded to ${platform}!`));
  } catch (err: any) {
    s.stop(pc.red(`Failed to upload to ${platform}`));
    p.log.error(pc.red(`Error: ${err.message}`));
  }
}

async function saveLocally(
  p: typeof import("@clack/prompts"),
  sourceVideo: string,
  s: any,
) {
  p.log.info(pc.cyan("Opening file explorer to choose save location..."));

  let exportPath = "";

  try {
    const result = execSync(
      'zenity --file-selection --save --confirm-overwrite --title="Save Video" --file-filter="MP4 Video | *.mp4" --filename="video.mp4"',
      { encoding: "utf-8" },
    ).trim();

    if (result) {
      exportPath = result;
      if (!exportPath.toLowerCase().endsWith(".mp4")) {
        exportPath += ".mp4";
      }
    }
  } catch (error: any) {
    p.log.warn(pc.yellow("File selection canceled or zenity not working."));

    const manualPath = await p.text({
      message:
        "Please enter the full path where you want to save the video (including .mp4 extension):",
      placeholder: path.join(process.cwd(), "final_video.mp4"),
      validate: (value) => {
        if (!value) return "Path is required";
        if (!value.toLowerCase().endsWith(".mp4"))
          return "Path must end with .mp4";
        return;
      },
    });

    if (p.isCancel(manualPath)) {
      p.log.warn(pc.yellow("Export canceled."));
      return;
    }

    exportPath = manualPath as string;
  }

  if (exportPath) {
    s.start(pc.cyan(`Exporting video to ${exportPath}...`));
    try {
      const destDir = path.dirname(exportPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      fs.copyFileSync(sourceVideo, exportPath);
      s.stop(pc.green("Video exported successfully!"));
      p.log.info(pc.bgGreen(pc.black(` Saved to: ${exportPath} `)));
    } catch (err: any) {
      s.stop(pc.red("Failed to export video"));
      p.log.error(pc.red(`Error: ${err.message}`));
    }
  }
}
