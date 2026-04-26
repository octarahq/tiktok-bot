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
  tools,
  functions,
}: {
  system: string;
  messages: { role: string; parts: any[] }[];
  models?: string[];
  accesToken: string;
  url?: string;
  temperature?: number;
  tools?: any[];
  functions?: Record<string, Function>;
}): Promise<string> {
  const currentMessages = [...messages];
  if (currentMessages.length === 0) {
    currentMessages.push({ role: "user", parts: [{ text: "Generate" }] });
  }

  for (let i = 0; i < models.length; i++) {
    const currentModel = models[i];
    try {
      console.log(pc.blue(`Attempting with model ${currentModel}...`));

      const makeRequest = async (msgs: any[]) => {
        const body = {
          system_instruction: { parts: [{ text: system }] },
          contents: msgs,
          tools: tools ? [{ function_declarations: tools }] : undefined,
          generationConfig: { temperature },
        };

        const res = await fetch(
          url + currentModel + ":generateContent?key=" + accesToken,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
        );

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`API Error ${res.status}: ${errorText}`);
        }
        return await res.json();
      };

      let data = await makeRequest(currentMessages);

      while (
        data.candidates?.[0]?.content?.parts?.some((p: any) => p.function_call)
      ) {
        const modelContent = data.candidates[0].content;
        currentMessages.push(modelContent);

        const functionResponses = [];

        for (const part of modelContent.parts) {
          if (part.function_call) {
            const { name, args } = part.function_call;
            console.log(pc.yellow(`Model calling tool: ${name}`));
            if (functions && functions[name]) {
              const result = await functions[name](args);
              functionResponses.push({
                function_response: {
                  name,
                  response: { content: result },
                },
              });
            } else {
              functionResponses.push({
                function_response: {
                  name,
                  response: { content: "Tool not found or not implemented" },
                },
              });
            }
          }
        }

        currentMessages.push({
          role: "function",
          parts: functionResponses,
        });

        data = await makeRequest(currentMessages);
      }

      if (!data.candidates || !data.candidates[0].content) {
        throw new Error("Empty AI response");
      }

      const textPart = data.candidates[0].content.parts.find(
        (p: any) => p.text,
      );
      return textPart?.text.trim() || "";
    } catch (error) {
      if (i === models.length - 1) throw error;
      console.warn(pc.yellow(`Model ${currentModel} failed, retrying next...`));
    }
  }
  throw new Error("All models failed.");
}
