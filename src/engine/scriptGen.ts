import { fetchGemini } from "@/utils/gemini";
import loadOldSubjects from "@/utils/loadOldSubjects";
import 'dotenv/config';
import pc from 'picocolors';

export default async function main(p: typeof import('@clack/prompts'), subject: string) {
    const oldSubjects = await loadOldSubjects();

    const s = p.spinner();
    s.start(pc.cyan('Script generation'));
    let accepted = false;
    const characters = ["Peter Griffin", "Stewie Griffin"];
    const systemPrompt = `You are a viral scriptwriter for Orion Hosting (orionhosting.xyz). Write a 1min second TikTok dialogue script based on the provided topic. Format: "CharacterName: Content". Use only these characters: ${characters.join(", ")}. Peter must be technically illiterate and struggling, while Stewie is arrogant, using advanced dev terminology to promote Orion Hosting (24/7 uptime, free Node.js/Python, no lag). Use Gen-Z dev humor but NO "brain rot" slang (no skibidi/mogging). The script must be fast-paced, punchy, and finish with a clear call to action for Orion Hosting. Output ONLY the script lines.`;
    while (!accepted) {

        subject = await GenerateScript(oldSubjects, {
            system: systemPrompt
        });

        const choice = await p.select({
            message: pc.yellow(`Script : "${subject}"`),
            options: [
                { value: 'yes', label: '✅ Valider et continuer' },
                { value: 'guide', label: '🧠 Guider l\'IA (Donner une consigne)' },
                { value: 'retry', label: '🔄 Régénérer un autre script' },
            ],
        });

        if (choice === 'guide') {
            const hint = await p.text({ message: 'What guidance would you like to give the AI?' });
            const safeHint = p.isCancel(hint) ? '' : String(hint ?? '');
            subject = await GenerateScript(oldSubjects, {
                system: systemPrompt + ` Here is some additional guidance from the user: ${safeHint}`,
            });
        } else if (choice === 'yes') {
            accepted = true;
        }
    }
    s.stop();

    return subject;
}

async function GenerateScript(subject: string, options?: { system?: string }): Promise<string> {
    const apiKey = process.env.GEMINI_API_TOKEN || "";

    try {
        const res = await fetchGemini({
            system: (options?.system || "You are a helpful assistant."),
            messages: [{ role: "user", content: Array.isArray(subject) ? subject.join(", ") : subject }],
            accesToken: apiKey,
            temperature: 0.9,
        });

        return res;
    } catch (error) {
        console.error("Error generating script:", error);
        throw new Error("Error generating script. Please try again.");
    }
}