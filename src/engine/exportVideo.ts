import { execSync } from "child_process";
import path from "path";
import fs from "fs";
import pc from "picocolors";

export default async function exportVideo(p: typeof import("@clack/prompts")) {
  const s = p.spinner();
  const sourceVideo = path.join(process.cwd(), "temp/video/video.mp4");

  if (!fs.existsSync(sourceVideo)) {
    p.log.error(pc.red("Generated video not found in temp/video/video.mp4"));
    return;
  }

  p.log.info(pc.cyan("Opening file explorer to choose save location..."));

  let exportPath = "";

  try {
    const result = execSync(
      'zenity --file-selection --save --confirm-overwrite --title="Save TikTok Video" --file-filter="MP4 Video | *.mp4" --filename="video.mp4"',
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
