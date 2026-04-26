import { execSync } from "child_process";
import fs from "fs";
import path from "path";

export function getDuration(filePath: string): number {
  try {
    const output = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
    ).toString();
    return parseFloat(output);
  } catch (error) {
    console.error(`Error getting duration for ${filePath}:`, error);
    return 0;
  }
}

export function getRandomBackground(): string {
  const bgDir = path.join(process.cwd(), "src/assets/background");
  const files = fs.readdirSync(bgDir).filter((f) => f.endsWith(".mp4"));
  if (files.length === 0)
    throw new Error("No background videos found in src/assets/background");
  const randomFile = files[Math.floor(Math.random() * files.length)];
  return path.join(bgDir, randomFile!);
}

export function generateThumbnail(videoPath: string, outputPath: string): void {
  try {
    execSync(
      `ffmpeg -i "${videoPath}" -ss 00:00:00 -vframes 1 -q:v 2 "${outputPath}" -y`,
      { stdio: "ignore" },
    );
  } catch (error) {
    console.error(`Error generating thumbnail for ${videoPath}:`, error);
  }
}
