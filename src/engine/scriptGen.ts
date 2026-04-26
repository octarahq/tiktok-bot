import { fetchGemini } from "@/utils/gemini";
import loadOldSubjects from "@/utils/loadOldSubjects";
import "dotenv/config";
import pc from "picocolors";
import axios from "axios";
import { getAIPrompts, getGlobalConfig } from "./config.js";

export default async function main(
  p: typeof import("@clack/prompts"),
  subject: string,
  characters: { name: string; description: string }[],
) {
  const aiPrompts = getAIPrompts();
  const config = getGlobalConfig();

  const s = p.spinner();
  s.start(pc.cyan("Script generation"));

  const charDetails = characters
    .map((c) => `- ${c.name}: ${c.description}`)
    .join("\n");

  const tools = [
    {
      name: "fetch_docs",
      description:
        "Get the detailed content of a documentation page to ensure technical accuracy in the script.",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "The full URL of the documentation page to fetch.",
          },
        },
        required: ["url"],
      },
    },
  ];

  const functions = {
    fetch_docs: async ({ url }: { url: string }) => {
      try {
        let finalUrl = url;
        if (
          config.docs?.resourceExtension &&
          !url.endsWith(config.docs.resourceExtension)
        ) {
          finalUrl = url + config.docs.resourceExtension;
        }
        const res = await axios.get(finalUrl);
        return typeof res.data === "string"
          ? res.data.substring(0, 10000)
          : JSON.stringify(res.data).substring(0, 10000);
      } catch (e: any) {
        return `Error fetching documentation: ${e.message}`;
      }
    },
  };

  const systemPrompt = `${aiPrompts.script}\n\nTopic: "${subject}"\n\nCharacters:\n${charDetails}\n\nUSE THE fetch_docs TOOL IF YOU NEED TECHNICAL DETAILS FROM THE DOCUMENTATION TO MAKE THE SCRIPT ACCURATE.`;

  let accepted = false;
  let scriptContent = "";

  while (!accepted) {
    scriptContent = await GenerateScript(subject, {
      system: systemPrompt,
      tools,
      functions,
    });

    s.stop(pc.green("Script generated!"));

    console.log(pc.cyan("\n--- Script Preview ---"));
    console.log(scriptContent);
    console.log(pc.cyan("----------------------\n"));

    const choice = await p.select({
      message: pc.yellow(`What would you like to do with this script?`),
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
      s.start(pc.cyan("Regenerating script with guidance..."));
      scriptContent = await GenerateScript(subject, {
        system: systemPrompt + `\n\nUser guidance: ${safeHint}`,
        tools,
        functions,
      });
    } else if (choice === "yes") {
      accepted = true;
    }
  }

  return scriptContent;
}

async function GenerateScript(
  subject: string,
  options?: { system?: string; tools?: any[]; functions?: any },
): Promise<string> {
  const apiKey = process.env.GEMINI_API_TOKEN || "";

  try {
    const res = await fetchGemini({
      system: options?.system || "You are a helpful assistant.",
      messages: [
        {
          role: "user",
          parts: [{ text: `Generate a script for the topic: ${subject}` }],
        },
      ],
      accesToken: apiKey,
      temperature: 0.9,
      ...(options?.tools ? { tools: options.tools } : {}),
      ...(options?.functions ? { functions: options.functions } : {}),
    });

    return res;
  } catch (error) {
    console.error("Error generating script:", error);
    throw new Error("Error generating script. Please try again.");
  }
}
