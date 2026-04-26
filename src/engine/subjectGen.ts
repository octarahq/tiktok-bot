import { fetchGemini } from "@/utils/gemini";
import loadOldSubjects from "@/utils/loadOldSubjects";
import "dotenv/config";
import pc from "picocolors";
import { getAIPrompts, getGlobalConfig } from "./config.js";
import { fetchSitemapLinks } from "@/utils/sitemap";

export default async function main(p: typeof import("@clack/prompts")) {
  const oldSubjects = await loadOldSubjects();
  const aiPrompts = getAIPrompts();
  const config = getGlobalConfig();

  const s = p.spinner();
  s.start(pc.cyan("Topic generation"));

  let docsContext = "";
  if (config.docs?.sitemapUrl) {
    try {
      const links = await fetchSitemapLinks(config.docs.sitemapUrl);
      if (links.length > 0) {
        docsContext = `\n\nAVAILABLE DOCUMENTATION TOPICS (USE THESE TO INSPIRE NEW TUTORIALS):\n${links.join("\n")}`;
      }
    } catch (e) {
      console.warn(pc.yellow("Could not fetch sitemap for subject generation"));
    }
  }

  let accepted = false;
  let subject = "";
  const system = aiPrompts.subject + docsContext;

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

  const historyContext =
    oldSubjects.length > 0
      ? `\n\nPAST TOPICS (AVOID THESE AND THEIR STYLE):\n${oldSubjects.map((s) => `- ${s}`).join("\n")}`
      : "";

  const systemPrompt =
    (options?.system || "You are a helpful assistant.") +
    "\n\nCRITICAL: Do NOT repeat the topics or the general style of the past videos listed below. Broaden your perspective. Explore new niches, weird scenarios, or unexpected topics. Do not fall into a repetitive pattern." +
    historyContext;

  const res = await fetchGemini({
    system: systemPrompt,
    messages: [],
    accesToken: apiKey,
    temperature: 0.9,
  });

  return res;
}
