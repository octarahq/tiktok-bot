import { execSync, spawnSync } from "child_process";
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
  const assetsDir = path.join(process.cwd(), "src/assets/caracters");

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

    const segments: { character: string; start: number; end: number }[] = [];
    let currentTime = 0;
    for (const file of audioFiles) {
      const fullPath = path.join(audioDir, file);
      let duration = getDuration(fullPath);
      if (isNaN(duration)) duration = 0;

      const character = file.split("-").slice(1).join("-").replace(".mp3", "");

      segments.push({
        character,
        start: Number(currentTime.toFixed(3)),
        end: Number((currentTime + duration).toFixed(3)),
      });

      currentTime += duration + 0.5;
    }

    const totalAudioDuration =
      segments.length > 0 ? segments[segments.length - 1]!.end : 0;

    const backgroundPath = getRandomBackground();
    let backgroundDuration = getDuration(backgroundPath);
    if (isNaN(backgroundDuration)) backgroundDuration = 0;

    if (backgroundDuration < totalAudioDuration) {
      throw new Error("Background video is shorter than combined audio");
    }

    const maxStartTime = backgroundDuration - totalAudioDuration;
    const startTime = Math.random() * maxStartTime;

    const outputVideo = path.join(videoDir, "video.mp4");
    const tempAudio = path.join(videoDir, "temp_combined_audio.mp3");

    await mergeAudiosWithDelay(fullAudioPaths, tempAudio);

    const peterPath = path.join(assetsDir, "peter-griffin.png");
    const stewiePath = path.join(assetsDir, "stewie-griffin.png");

    const usedChars = new Set(segments.map((s) => s.character));
    const hasPeter = usedChars.has("peter-griffin");
    const hasStewie = usedChars.has("stewie-griffin");

    let hasBgAudio = false;
    try {
      const probe = execSync(
        `ffprobe -v error -select_streams a -show_entries stream=index -of default=noprint_wrappers=1:nokey=1 "${backgroundPath}"`,
      )
        .toString()
        .trim();
      hasBgAudio = probe.length > 0;
    } catch (e) {
      hasBgAudio = false;
    }

    let peterCount = 0;
    let stewieCount = 0;
    for (const seg of segments) {
      if (seg.character.includes("peter")) peterCount++;
      else stewieCount++;
    }

    const videoFilters: string[] = [];
    videoFilters.push(
      "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[bg]",
    );

    if (hasPeter && peterCount > 0) {
      const peterPads = Array.from(
        { length: peterCount },
        (_, i) => `[p${i}]`,
      ).join("");
      videoFilters.push(`[2:v]scale=4000:-2,split=${peterCount}${peterPads}`);
    }
    if (hasStewie && stewieCount > 0) {
      const stewiePads = Array.from(
        { length: stewieCount },
        (_, i) => `[s${i}]`,
      ).join("");
      videoFilters.push(`[3:v]scale=2400:-2,split=${stewieCount}${stewiePads}`);
    }

    let peterIdx = 0;
    let stewieIdx = 0;
    let lastVideoTag = "[bg]";
    segments.forEach((seg, i) => {
      const isPeter = seg.character.includes("peter");

      if ((isPeter && !hasPeter) || (!isPeter && !hasStewie)) return;

      const charTag = isPeter ? `[p${peterIdx++}]` : `[s${stewieIdx++}]`;
      const nextTag = i === segments.length - 1 ? "[v_final]" : `[v${i}]`;
      videoFilters.push(
        `${lastVideoTag}${charTag}overlay=x=(W-w)/2:y=H-h-50:enable='between(t,${seg.start},${seg.end})'${nextTag}`,
      );
      lastVideoTag = nextTag;
    });

    if (lastVideoTag !== "[v_final]") {
      videoFilters.push(`${lastVideoTag}copy[v_final]`);
    }

    let audioFilterStr: string;
    if (hasBgAudio) {
      audioFilterStr =
        "[0:a]volume=0.15[bg_music];[1:a]volume=1.0[voiceover];[bg_music][voiceover]amix=inputs=2:duration=first:dropout_transition=2[a_final]";
    } else {
      audioFilterStr = "[1:a]volume=1.0[a_final]";
    }

    const fullFilter = videoFilters.join(";") + ";" + audioFilterStr;

    const ffmpegArgs = [
      "-y",
      "-ss",
      startTime.toFixed(3),
      "-i",
      backgroundPath,
      "-i",
      tempAudio,
      "-loop",
      "1",
      "-i",
      peterPath,
      "-loop",
      "1",
      "-i",
      stewiePath,
      "-filter_complex",
      fullFilter,
      "-t",
      totalAudioDuration.toFixed(3),
      "-map",
      "[v_final]",
      "-map",
      "[a_final]",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "23",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-pix_fmt",
      "yuv420p",
      outputVideo,
    ];

    const result = spawnSync("ffmpeg", ffmpegArgs, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    if (result.status !== 0) {
      const errMsg = result.stderr?.toString() || "Unknown FFmpeg error";
      throw new Error(`FFmpeg failed (exit ${result.status}):\n${errMsg}`);
    }

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
