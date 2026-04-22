import { chromium, Browser } from "playwright";
import fs from "fs";
import path from "path";
import https from "https";
import ffmpeg from "fluent-ffmpeg";
import pc from "picocolors";

export class VoiceScraper {
  private static instance: VoiceScraper;
  private browser: Browser | null = null;

  private constructor() {}

  public static getInstance(): VoiceScraper {
    if (!VoiceScraper.instance) {
      VoiceScraper.instance = new VoiceScraper();
    }
    return VoiceScraper.instance;
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: false });
    }
    return this.browser;
  }

  public async generateVoice(
    character: string,
    text: string,
    outputPath: string,
  ): Promise<string> {
    const chunks = this.splitText(text, 150);
    const audioFiles: string[] = [];
    const tempDir = path.dirname(outputPath);

    try {
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]!;
        const partPath = path.join(tempDir, `part-${index_hash()}-${i}.mp3`);

        console.log(
          pc.cyan(
            `Generating part ${i + 1}/${chunks.length} (${chunk.length} chars)...`,
          ),
        );
        await this.generateChunk(character, chunk, partPath);
        audioFiles.push(partPath);
      }

      if (audioFiles.length === 1) {
        fs.renameSync(audioFiles[0]!, outputPath);
      } else {
        console.log(pc.yellow(`Merging ${audioFiles.length} audio parts...`));
        await this.mergeAudioFiles(audioFiles, outputPath);
      }

      return outputPath;
    } finally {
      for (const file of audioFiles) {
        if (fs.existsSync(file) && file !== outputPath) {
          fs.unlinkSync(file);
        }
      }
    }
  }

  private splitText(text: string, limit: number): string[] {
    const chunks: string[] = [];
    let current = text;

    while (current.length > limit) {
      let splitAt = current.lastIndexOf(".", limit);
      if (splitAt === -1 || splitAt < limit / 2)
        splitAt = current.lastIndexOf(",", limit);
      if (splitAt === -1 || splitAt < limit / 2)
        splitAt = current.lastIndexOf("!", limit);
      if (splitAt === -1 || splitAt < limit / 2)
        splitAt = current.lastIndexOf("?", limit);
      if (splitAt === -1 || splitAt < limit / 2)
        splitAt = current.lastIndexOf(" ", limit);

      if (splitAt === -1) splitAt = limit;

      chunks.push(current.substring(0, splitAt + 1).trim());
      current = current.substring(splitAt + 1).trim();
    }
    if (current.length > 0) chunks.push(current);
    return chunks;
  }

  private async generateChunk(
    character: string,
    text: string,
    outputPath: string,
  ): Promise<void> {
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      const browser = await this.getBrowser();
      const context = await browser.newContext({
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      });
      const page = await context.newPage();

      try {
        const characterSlug = character.toLowerCase().replace(" ", "-");
        const url = `https://nicevoice.org/ai-voice-generator/${characterSlug}/`;

        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });

        const textareaSelector = "textarea.textarea";
        await page.waitForSelector(textareaSelector, { timeout: 20000 });

        await page.click(textareaSelector);
        await page.evaluate((sel) => {
          const el = document.querySelector(sel) as HTMLTextAreaElement;
          if (el) el.value = "";
        }, textareaSelector);

        await page.type(textareaSelector, text, { delay: 20 });

        await page.evaluate((selector) => {
          const el = document.querySelector(selector) as HTMLTextAreaElement;
          if (el) {
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }, textareaSelector);

        await page.waitForTimeout(1000);
        await page.click('button:has-text("Generate Voiceover")');

        let audioUrl = "";
        for (let i = 0; i < 300; i++) {
          audioUrl = await page.evaluate(() => {
            const audio = document.querySelector("audio");
            const source = document.querySelector("audio source");
            if (source) return (source as HTMLSourceElement).src;
            if (audio && audio.src) return audio.src;
            return "";
          });

          if (audioUrl && audioUrl.startsWith("http")) break;

          const errorMessage = await page.evaluate(() => {
            const body = document.body.innerText;
            if (body.includes("too many requests")) return "Rate limited";
            if (body.includes("An error occurred")) return "Site error";
            return null;
          });
          if (errorMessage) throw new Error(`Site message: ${errorMessage}`);

          await page.waitForTimeout(2000);
        }

        if (!audioUrl) throw new Error("Audio source not found after timeout");

        await this.downloadFile(audioUrl, outputPath);

        await context.close();
        return;
      } catch (error) {
        attempts++;
        console.error(
          pc.red(
            `NiceVoice error (part: ${text.substring(0, 20)}... attempt ${attempts}/${maxAttempts}):`,
          ),
          error instanceof Error ? error.message : error,
        );
        await context.close();
        if (attempts >= maxAttempts) throw error;
        await this.shutdown();
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  private mergeAudioFiles(files: string[], output: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const command = ffmpeg();
      files.forEach((file) => command.input(file));
      command
        .on("error", (err) => reject(err))
        .on("end", () => resolve())
        .mergeToFile(output, path.dirname(output));
    });
  }

  private downloadFile(url: string, dest: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(dest);
      https
        .get(url, (response) => {
          response.pipe(file);
          file.on("finish", () => {
            file.close();
            resolve();
          });
        })
        .on("error", (err) => {
          fs.unlink(dest, () => reject(err));
        });
    });
  }

  private extractAudio(input: string, output: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(input)
        .toFormat("mp3")
        .audioFilters([
          "silenceremove=1:0:-50dB",
          "silenceremove=stop_periods=-1:stop_duration=0.5:stop_threshold=-50dB",
        ])
        .on("end", () => resolve())
        .on("error", (err) => reject(err))
        .save(output);
    });
  }

  public async shutdown() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

function index_hash() {
  return Math.random().toString(36).substring(7);
}
