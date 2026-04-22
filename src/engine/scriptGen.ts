import { fetchGemini } from "@/utils/gemini";
import loadOldSubjects from "@/utils/loadOldSubjects";
import "dotenv/config";
import pc from "picocolors";

export default async function main(
  p: typeof import("@clack/prompts"),
  subject: string,
) {
  const oldSubjects = await loadOldSubjects();

  const s = p.spinner();
  s.start(pc.cyan("Script generation"));
  let accepted = false;
  const characters = ["Peter Griffin", "Stewie Griffin"];
  const systemPrompt = `You are a scriptwriter for a viral Family Guy TikTok series. Write a short, simple, and funny dialogue script (around 45-60 seconds) based on the provided topic. 
Format: "Character: Message".
Available characters: ${characters.join(", ")}.
Style: 
- Peter: Confused, uses funny metaphors for tech (e.g., comparing a compiler to a blender), complains about confusing things.
- Stewie: Arrogant, explains things simply but with a condescending attitude. 
Goal: Information should be interesting but easy to follow for a general audience. If the topic is about hosting, mention Orion Hosting naturally. If it's about CS concepts (like compilers or databases), make it relatable and funny. 
Constraints: Punchy dialogue, avoid long technical blocks, NO "brain-rot" slang. Finish with a funny closing line. Output ONLY the script lines.`;
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
