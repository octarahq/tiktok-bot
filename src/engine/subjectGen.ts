import { fetchGemini } from "@/utils/gemini";
import loadOldSubjects from "@/utils/loadOldSubjects";
import "dotenv/config";
import pc from "picocolors";

import { getAIPrompts } from "./config.js";

export default async function main(p: typeof import("@clack/prompts")) {
  const oldSubjects = await loadOldSubjects();
  const aiPrompts = getAIPrompts();

  const s = p.spinner();
  s.start(pc.cyan("Topic generation"));
  let accepted = false;
  let subject = "";
  const system = aiPrompts.subject;
  while (!accepted) {
    subject = await GenerateSubject(oldSubjects, {
      system,
    });

    const choice = await p.select({
      message: pc.yellow(`Topic : "${subject}"`),
      options: [
        { value: "yes", label: "Validate and continue" },
        { value: "guide", label: "Guide AI (Give instructions)" },
        { value: "retry", label: "Regenerate another topic" },
      ],
    });

    if (choice === "guide") {
      const hint = await p.text({
        message: "What guidance would you like to give the AI?",
      });
      const safeHint = p.isCancel(hint) ? "" : String(hint ?? "");
      subject = await GenerateSubject(oldSubjects, {
        system:
          system +
          ` Here is some additional guidance from the user: ${safeHint}`,
      });
    } else if (choice === "yes") {
      accepted = true;
    }
  }
  s.stop();

  return subject;
}

async function GenerateSubject(
  oldSubjects: string[],
  options?: { system?: string },
): Promise<string> {
  const apiKey = process.env.GEMINI_API_TOKEN || "";

  const res = await fetchGemini({
    system: options?.system || "You are a helpful assistant.",
    messages: oldSubjects.map((s) => ({ role: "user", content: s })),
    accesToken: apiKey,
  });

  return res;
}
