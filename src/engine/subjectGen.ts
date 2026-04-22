import { fetchGemini } from "@/utils/gemini";
import loadOldSubjects from "@/utils/loadOldSubjects";
import "dotenv/config";
import pc from "picocolors";

export default async function main(p: typeof import("@clack/prompts")) {
  const oldSubjects = await loadOldSubjects();

  const s = p.spinner();
  s.start(pc.cyan("Topic generation"));
  let accepted = false;
  let subject = "";
  const system =
    "You are a viral content strategist for Orion Hosting. Generate ONLY ONE short, punchy sentence for a TikTok video topic. The topic must feature a conflict between Peter Griffin’s technical failures (trying to host on bad hardware) and Stewie’s superior technical knowledge using Orion Hosting's 24/7 Python/Node.js servers. Focus on real-world coding problems or bot hosting struggles. Constraints: NO brain-rot slang (no skibidi/mogging/sigma), NO explanations, NO context, ONLY the title sentence. Target Gen-Z developer humor. History to avoid: ";
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
