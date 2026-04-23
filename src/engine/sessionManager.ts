import * as p from "@clack/prompts";
import pc from "picocolors";
import { hasSession, getSession, clearSession } from "../utils/session.js";
import fs from "fs";

export default async function sessionMenu(
  prompts: typeof p,
): Promise<"resume" | "back" | "cleared"> {
  if (!hasSession()) {
    console.log(pc.yellow("No active session found."));
    return "back";
  }

  const session = getSession();

  const action = await prompts.select({
    message: "Session Management",
    options: [
      { value: "resume", label: "Resume session" },
      { value: "info", label: "View session info" },
      { value: "clear", label: "Delete / Clear session" },
      { value: "back", label: "Back" },
    ],
  });

  if (prompts.isCancel(action) || action === "back") {
    return "back";
  }

  if (action === "resume") {
    return "resume";
  }

  if (action === "info") {
    let audioStatus = pc.red("Not generated");
    if (session.script) {
      const segments = session.script
        .split("\n")
        .filter((l: string) => l.trim().includes(":")).length;
      const audioFiles = fs.existsSync("temp/audio")
        ? fs
            .readdirSync("temp/audio")
            .filter((f) => f.endsWith(".mp3") || f.endsWith(".wav")).length
        : 0;

      if (audioFiles === 0) {
        audioStatus = pc.red("Not generated");
      } else if (audioFiles < segments) {
        audioStatus = pc.yellow(
          `Partially generated (${audioFiles}/${segments})`,
        );
      } else {
        audioStatus = pc.green(`All generated (${audioFiles}/${segments})`);
      }
    } else if (session.hasAudio) {
      audioStatus = pc.green("Generated");
    }

    console.log(pc.cyan("\n--- Session Info ---"));
    console.log(
      pc.white(
        `Subject: ${session.subject ? pc.green(session.subject) : pc.red("Not generated")}`,
      ),
    );
    console.log(
      pc.white(
        `Script: ${session.script ? pc.green("Generated") : pc.red("Not generated")}`,
      ),
    );
    console.log(pc.white(`Audio: ${audioStatus}`));
    console.log(
      pc.white(
        `Video: ${session.hasVideo ? pc.green("Generated") : pc.red("Not generated")}`,
      ),
    );
    console.log(pc.cyan("--------------------\n"));
    return sessionMenu(prompts);
  } else if (action === "clear") {
    const confirm = await prompts.confirm({
      message:
        "Are you sure you want to delete the current session? This cannot be undone.",
    });

    if (confirm === true) {
      clearSession();
      console.log(pc.red("Session cleared."));
      return "cleared";
    }
  }

  return "back";
}
