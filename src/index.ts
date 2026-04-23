import * as p from "@clack/prompts";
import pc from "picocolors";
import {
  GenerateScript,
  GenerateSubject,
  GenerateVoices,
  GenerateVideo,
} from "./engine/index.js";
import {
  hasSession,
  getSession,
  saveSubject,
  saveScript,
  clearSession,
} from "./utils/session.js";

async function main() {
  p.intro(pc.bgCyan(pc.black(" VIDEO GENERATOR ")));

  const options: any[] = [
    { value: "generate", label: "Start generating" },
    { value: "config", label: "Configure generator" },
  ];

  if (hasSession()) {
    options.push({ value: "session", label: "Manage Session" });
  }

  options.push({ value: "cancel", label: "Cancel" });

  let action = await p.select({
    message: "What do you want to do?",
    options,
  });

  if (p.isCancel(action) || action === "cancel") {
    process.exit(0);
  }

  let autoResume = false;

  if (action === "config") {
    const { ConfigMenu } = await import("./engine/index.js");
    const res = await ConfigMenu(p);
    if (res === "resume") {
      action = "generate";
      autoResume = true;
    } else {
      return main();
    }
  } else if (action === "session") {
    const { SessionMenu } = await import("./engine/index.js");
    const res = await SessionMenu(p);
    if (res === "resume") {
      action = "generate";
      autoResume = true;
    } else if (res === "cleared" || res === "back") {
      return main();
    }
  }

  let subject = "";
  let script = "";
  let characters: any[] = [];

  if (hasSession()) {
    let resume = autoResume;
    if (!autoResume) {
      resume = (await p.confirm({
        message: "An active session was found in /temp. Do you want to resume?",
      })) as boolean;
    }

    if (resume === true) {
      const session = getSession();
      subject = session.subject || "";
      script = session.script || "";
      characters = session.characters || [];
      console.log(pc.green("\nSession loaded!"));
    } else {
      clearSession();
    }
  } else {
    clearSession();
  }

  if (characters.length === 0) {
    const { getCharacters } = await import("./engine/config.js");
    const allChars = getCharacters();

    if (allChars.length === 0) {
      p.log.error(
        pc.red("No characters configured! Please go to configuration first."),
      );
      return main();
    }

    const selected = await p.multiselect({
      message: "Select characters to use (use space to select):",
      options: allChars.map((c) => ({ value: c, label: c.name })),
    });

    if (p.isCancel(selected)) return main();
    characters = selected as any[];
    const { saveSessionCharacters } = await import("./utils/session.js");
    saveSessionCharacters(characters);
  }

  if (!subject) {
    subject = await GenerateSubject(p);
    saveSubject(subject);
  }

  if (!script) {
    console.log(pc.green("\nSubject generated:"));
    console.log(pc.cyan(subject));

    script = await GenerateScript(p, subject, characters);
    saveScript(script);
  }

  console.log(pc.green("\nScript:"));
  console.log(pc.cyan(script));
  await GenerateVoices(p, script, characters);
  await GenerateVideo(p, characters);
}

main();
