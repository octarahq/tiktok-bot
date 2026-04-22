import pc from "picocolors";

export async function fetchGemini({
  system,
  messages = [],
  models = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-flash-latest",
    "gemini-3-flash-preview",
  ],
  accesToken,
  url = "https://generativelanguage.googleapis.com/v1beta/models/",
  temperature = 0.7,
}: {
  system: string;
  messages: { role: "user" | "model"; content: string }[];
  models?: string[];
  accesToken: string;
  url?: string;
  temperature?: number;
}): Promise<string> {
  for (let i = 0; i < models.length; i++) {
    const currentModel = models[i];

    try {
      console.log(pc.blue(`Attempting with model ${currentModel}...`));
      const res = await fetch(
        url + currentModel + ":generateContent?key=" + accesToken,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-goog-api-key": accesToken,
          },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: system }],
            },
            contents:
              messages.length > 0
                ? messages.map((m) => ({
                    role: m.role,
                    parts: [{ text: m.content }],
                  }))
                : [{ role: "user", parts: [{ text: "Generate a topic" }] }],
            generationConfig: {
              temperature: temperature,
            },
          }),
        },
      );

      if (res.status === 503 && i < models.length - 1) {
        console.warn(
          pc.yellow(
            `Model ${currentModel} overloaded (503). Attempting next...`,
          ),
        );
        continue;
      }

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`API Error ${res.status}: ${errorText}`);
      }

      const data = await res.json();

      if (!data.candidates || !data.candidates[0].content) {
        throw new Error("Empty AI response");
      }

      return data.candidates[0].content.parts[0].text.trim();
    } catch (error) {
      if (i === models.length - 1) {
        throw error;
      }
    }
  }

  throw new Error("All models failed.");
}
