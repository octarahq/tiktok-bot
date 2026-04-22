import * as p from "@clack/prompts";
import pc from "picocolors";
import { GenerateScript, GenerateSubject, GenerateVoices } from "./engine";
import {
  hasSession,
  getSession,
  saveSubject,
  saveScript,
  clearSession,
} from "./utils/session";

async function main() {
  p.intro(pc.bgCyan(pc.black(" ORION HOSTING - VIDEO GENERATOR ")));

  const action = await p.select({
    message: "What do you want to do?",
    options: [
      { value: "generate", label: "Start generating" },
      { value: "cancel", label: "Cancel" },
    ],
  });

  if (p.isCancel(action) || action === "cancel") {
    process.exit(0);
  }

  let subject = "";
  let script = "";

  if (hasSession()) {
    const resume = await p.confirm({
      message: "An active session was found in /temp. Do you want to resume?",
    });

    if (resume === true) {
      const session = getSession();
      subject = session.subject || "";
      script = session.script || "";
      console.log(pc.green("\nSession loaded!"));
    } else {
      clearSession();
    }
  } else {
    clearSession();
  }

  if (!subject) {
    subject = await GenerateSubject(p);
    saveSubject(subject);
  }

  if (!script) {
    console.log(pc.green("\nSubject generated:"));
    console.log(pc.cyan(subject));

    script = await GenerateScript(p, subject);
    saveScript(script);
  }

  console.log(pc.green("\nScript:"));
  console.log(pc.cyan(script));

  await GenerateVoices(p, script);
}

main();
