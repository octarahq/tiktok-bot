import { execSync } from "child_process";
import path from "path";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import { getDuration, getRandomBackground } from "../utils/video";
import pc from "picocolors";

export default async function main(p: typeof import("@clack/prompts")) {
  const s = p.spinner();
  s.start(pc.cyan("Generating final video..."));

  const audioDir = path.join(process.cwd(), "temp/audio");
  const videoDir = path.join(process.cwd(), "temp/video");
  if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir, { recursive: true });

  const audioFiles = fs
    .readdirSync(audioDir)
    .filter((f) => f.endsWith(".mp3"))
    .sort();

  if (audioFiles.length === 0) {
    s.stop(pc.red("No audio files found in temp/audio"));
    throw new Error("No audio files found");
  }

  try {
    const fullAudioPaths = audioFiles.map((f) => path.join(audioDir, f));

    let totalAudioDuration = 0;
    for (const audio of fullAudioPaths) {
      totalAudioDuration += getDuration(audio);
    }
    totalAudioDuration += (audioFiles.length - 1) * 0.5;

    const backgroundPath = getRandomBackground();
    const backgroundDuration = getDuration(backgroundPath);

    if (backgroundDuration < totalAudioDuration) {
      throw new Error("Background video is shorter than combined audio");
    }

    const maxStartTime = backgroundDuration - totalAudioDuration;
    const startTime = Math.random() * maxStartTime;

    const outputVideo = path.join(videoDir, "video.mp4");
    const tempAudio = path.join(videoDir, "temp_combined_audio.mp3");

    await mergeAudiosWithDelay(fullAudioPaths, tempAudio);

    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(backgroundPath)
        .inputOptions(["-ss", startTime.toString()])
        .input(tempAudio)
        .complexFilter([
          "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v]",
          "[0:a]volume=0.2[bg_music]",
          "[1:a]volume=1.0[voiceover]",
          "[bg_music][voiceover]amix=inputs=2:duration=first:dropout_transition=2[a]",
        ])
        .outputOptions([
          "-t",
          totalAudioDuration.toString(),
          "-map [v]",
          "-map [a]",
          "-c:v libx264",
          "-preset fast",
          "-crf 23",
          "-c:a aac",
          "-b:a 192k",
          "-pix_fmt yuv420p",
        ])
        .save(outputVideo)
        .on("end", () => resolve())
        .on("error", (err) => reject(err));
    });

    if (fs.existsSync(tempAudio)) fs.unlinkSync(tempAudio);

    s.stop(pc.green("Video generated successfully in temp/video/video.mp4"));
  } catch (error) {
    s.stop(pc.red("Error during video generation"));
    throw error;
  }
}

async function mergeAudiosWithDelay(
  files: string[],
  output: string,
): Promise<void> {
  const videoDir = path.dirname(output);
  const silenceFile = path.join(videoDir, "silence_gap.mp3");
  const listFile = path.join(videoDir, "concat_list.txt");

  try {
    const sampleRate =
      execSync(
        `ffprobe -v error -select_streams a:0 -show_entries stream=sample_rate -of default=noprint_wrappers=1:nokey=1 "${files[0]}"`,
      )
        .toString()
        .trim() || "24000";
    const channels =
      execSync(
        `ffprobe -v error -select_streams a:0 -show_entries stream=channels -of default=noprint_wrappers=1:nokey=1 "${files[0]}"`,
      )
        .toString()
        .trim() || "1";
    const channelLayout = channels === "1" ? "mono" : "stereo";

    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(`anullsrc=r=${sampleRate}:cl=${channelLayout}:d=0.5`)
        .inputFormat("lavfi")
        .save(silenceFile)
        .on("end", () => resolve())
        .on("error", (err) => reject(err));
    });

    let listContent = "";
    files.forEach((f, i) => {
      listContent += `file '${f}'\n`;
      if (i < files.length - 1) {
        listContent += `file '${silenceFile}'\n`;
      }
    });
    fs.writeFileSync(listFile, listContent);

    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(listFile)
        .inputOptions(["-f", "concat", "-safe", "0"])
        .save(output)
        .on("end", () => resolve())
        .on("error", (err) => reject(err));
    });
  } finally {
    if (fs.existsSync(silenceFile)) fs.unlinkSync(silenceFile);
    if (fs.existsSync(listFile)) fs.unlinkSync(listFile);
  }
}
