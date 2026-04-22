import path from "path";
import fs from "fs";
import { VoiceScraper } from "./voiceScraper";
import pc from "picocolors";

export default async function main(
  p: typeof import("@clack/prompts"),
  script: string,
) {
  const s = p.spinner();
  s.start(pc.cyan("Voice generation..."));

  const lines = script.split("\n").filter((line) => line.trim().includes(":"));
  const lenLines = lines.length;
  const scraper = VoiceScraper.getInstance();

  try {
    let index = 0;
    for (const textLine of lines) {
      const separatorIndex = textLine.indexOf(":");
      const character = textLine
        .substring(0, separatorIndex)
        .trim()
        .toLowerCase()
        .includes("stewie")
        ? "stewie-griffin"
        : "peter-griffin";
      const content = textLine.substring(separatorIndex + 1).trim();

      if (character && content) {
        const outputDir = path.join(process.cwd(), "temp/audio");
        const filename = `${index.toString().padStart(2, "0")}-${character}.mp3`;
        const outputFile = path.join(outputDir, filename);

        if (fs.existsSync(outputFile)) {
          s.message(
            pc.gray(
              `Voice already exists for ${character} (line ${index + 1}), skipping...`,
            ),
          );
        } else {
          s.message(
            pc.yellow(
              `Generating voice for ${character} (line ${index + 1}/${lenLines})...`,
            ),
          );
          await generateCharacterVoice(character, content, index);
        }
        index++;
      }
    }
    s.stop(pc.green("All voices are ready in temp/audio"));
  } catch (error) {
    s.stop(pc.red("Error during voice generation"));
    throw error;
  } finally {
    await scraper.shutdown();
  }
}

export async function generateCharacterVoice(
  character: string,
  line: string,
  index?: number,
): Promise<string> {
  const outputDir = path.join(process.cwd(), "temp/audio");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filename =
    index !== undefined
      ? `${index.toString().padStart(2, "0")}-${character}.mp3`
      : `${character}-${Date.now()}.mp3`;

  const outputFile = path.join(outputDir, filename);
  const scraper = VoiceScraper.getInstance();

  await scraper.generateVoice(character, line, outputFile);
  return outputFile;
}
