import { fetchGemini } from "@/utils/gemini";
import loadOldSubjects from "@/utils/loadOldSubjects";
import "dotenv/config";
import pc from "picocolors";

import { getAIPrompts } from "./config.js";

export default async function main(
  p: typeof import("@clack/prompts"),
  subject: string,
  characters: { name: string; description: string }[],
) {
  const oldSubjects = await loadOldSubjects();
  const aiPrompts = getAIPrompts();

  const s = p.spinner();
  s.start(pc.cyan("Script generation"));
  let accepted = false;

  const charDetails = characters
    .map((c) => `- ${c.name}: ${c.description}`)
    .join("\n");

  const systemPrompt = `${aiPrompts.script}\n\nTopic: "${subject}"\n\nCharacters:\n${charDetails}`;
  while (!accepted) {
    subject = await GenerateScript(oldSubjects, {
      system: systemPrompt,
    });

    const choice = await p.select({
      message: pc.yellow(`Script : "${subject}"`),
      options: [
        { value: "yes", label: "Validate and continue" },
        { value: "guide", label: "Guide AI (Give instructions)" },
        { value: "retry", label: "Regenerate another script" },
      ],
    });

    if (choice === "guide") {
      const hint = await p.text({
        message: "What guidance would you like to give the AI?",
      });
      const safeHint = p.isCancel(hint) ? "" : String(hint ?? "");
      subject = await GenerateScript(oldSubjects, {
        system:
          systemPrompt +
          ` Here is some additional guidance from the user: ${safeHint}`,
      });
    } else if (choice === "yes") {
      accepted = true;
    }
  }
  s.stop();

  return subject;
}

async function GenerateScript(
  subject: string,
  options?: { system?: string },
): Promise<string> {
  const apiKey = process.env.GEMINI_API_TOKEN || "";

  try {
    const res = await fetchGemini({
      system: options?.system || "You are a helpful assistant.",
      messages: [
        {
          role: "user",
          content: Array.isArray(subject) ? subject.join(", ") : subject,
        },
      ],
      accesToken: apiKey,
      temperature: 0.9,
    });

    return res;
  } catch (error) {
    console.error("Error generating script:", error);
    throw new Error("Error generating script. Please try again.");
  }
}
