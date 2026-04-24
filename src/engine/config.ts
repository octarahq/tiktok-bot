import * as p from "@clack/prompts";
import fs from "fs";
import path from "path";
import pc from "picocolors";
import { exec } from "child_process";

export interface Character {
  name: string;
  slug: string;
  image: string;
  description: string;
}

const CONFIG_PATH = path.join(process.cwd(), "src/data/characters.json");
const ASSETS_DIR = path.join(process.cwd(), "src/assets/caracters");
const BACKGROUNDS_DIR = path.join(process.cwd(), "src/assets/background");

export function getCharacters(): Character[] {
  if (!fs.existsSync(CONFIG_PATH)) {
    return [];
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
}

export function saveCharacters(characters: Character[]) {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(characters, null, 2));
}

export function getBackgrounds(): string[] {
  if (!fs.existsSync(BACKGROUNDS_DIR)) return [];
  return fs
    .readdirSync(BACKGROUNDS_DIR)
    .filter(
      (f: string) =>
        f.endsWith(".mp4") ||
        f.endsWith(".mov") ||
        f.endsWith(".mkv") ||
        f.endsWith(".webm"),
    );
}

const PROMPTS_PATH = path.join(process.cwd(), "src/data/prompts.json");

export function getAIPrompts(): { subject: string; script: string } {
  if (!fs.existsSync(PROMPTS_PATH)) {
    return {
      subject:
        "You are a creative writer for a parody TikTok channel. Generate ONLY ONE simple, entertaining TikTok video topic...",
      script:
        "You are a scriptwriter for a TikTok channel specialized in parody, specifically echoing the 'Family Guy' (Peter/Stewie) dynamic. Your task is to write an engaging, darkly funny, and punchy dialogue.\n\nCRITICAL RULES:\n1. DYNAMIC: Follow the 'Smart & Arrogant' vs 'Stupid & Confused' dynamic. One character should be mean/sarcastic, the other should be absolutely clueless.\n2. TONE: Use punchy, absurd humor. Include character-specific reactions like 'What the hell are you doing?', 'Oh for god's sake', 'Wait, what?', 'Holy crap'.\n3. FORMAT: Each line must be exactly \"Character Name: Text\". NO stage directions, NO actions, NO parentheticals.\n4. LENGTH: 40-60 seconds of dialogue (approx 10-15 lines total).",
    };
  }
  return JSON.parse(fs.readFileSync(PROMPTS_PATH, "utf-8"));
}

export function saveAIPrompts(prompts: { subject: string; script: string }) {
  const dir = path.dirname(PROMPTS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(PROMPTS_PATH, JSON.stringify(prompts, null, 2));
}

export default async function configMenu(
  prompts: typeof p,
): Promise<"resume" | void> {
  let exit = false;

  while (!exit) {
    const options = [
      { value: "characters", label: "Manage Characters" },
      { value: "backgrounds", label: "Manage Backgrounds" },
      { value: "prompts", label: "Manage AI Prompts" },
      { value: "back", label: "Back to main menu" },
    ];

    const action = await prompts.select({
      message: "Main Configuration Menu",
      options,
    });

    if (prompts.isCancel(action) || action === "back") {
      exit = true;
      continue;
    }

    if (action === "characters") {
      await charactersMenu(prompts);
    } else if (action === "backgrounds") {
      await backgroundsMenu(prompts);
    } else if (action === "prompts") {
      await promptsMenu(prompts);
    }
  }
}

async function promptsMenu(prompts: typeof p) {
  let exit = false;

  while (!exit) {
    const aiPrompts = getAIPrompts();

    const action = await prompts.select({
      message: "AI Prompts Configuration",
      options: [
        { value: "subject", label: "Edit Topic Generation Prompt" },
        { value: "script", label: "Edit Script Generation Prompt" },
        { value: "back", label: "Back" },
      ],
    });

    if (prompts.isCancel(action) || action === "back") {
      exit = true;
      continue;
    }

    if (action === "subject" || action === "script") {
      const type = action as "subject" | "script";
      const newPrompt = await prompts.text({
        message: `Edit ${type} prompt:`,
        initialValue: aiPrompts[type],
      });

      if (!prompts.isCancel(newPrompt)) {
        aiPrompts[type] = newPrompt as string;
        saveAIPrompts(aiPrompts);
        console.log(pc.green(`${type} prompt updated!`));
      }
    }
  }
}

async function charactersMenu(prompts: typeof p) {
  let exit = false;

  while (!exit) {
    const characters = getCharacters();

    const action = await prompts.select({
      message: "Character Configuration",
      options: [
        { value: "list", label: "List characters" },
        { value: "add", label: "Add character" },
        { value: "edit", label: "Edit character" },
        { value: "delete", label: "Delete character" },
        { value: "open_folder", label: "Open photos folder" },
        { value: "back", label: "Back" },
      ],
    });

    if (prompts.isCancel(action) || action === "back") {
      exit = true;
      continue;
    }

    switch (action) {
      case "list":
        console.log(pc.cyan("\n--- Current Characters ---"));
        characters.forEach((c: Character, i: number) => {
          console.log(`${i + 1}. ${pc.bold(c.name)} (${c.slug})`);
          console.log(pc.gray(`   Image: ${c.image}`));
          console.log(pc.gray(`   Desc: ${c.description.substring(0, 60)}...`));
        });
        console.log(pc.cyan("--------------------------\n"));
        break;

      case "open_folder":
        exec(`xdg-open "${ASSETS_DIR}"`);
        console.log(pc.green("Opening characters folder..."));
        break;

      case "add":
        const newChar = await promptCharacterInfo(prompts);
        if (newChar) {
          saveCharacters([...characters, newChar]);
          console.log(pc.green(`Character ${newChar.name} added!`));
        }
        break;

      case "edit":
        const toEditIdx = await prompts.select({
          message: "Select character to edit",
          options: characters.map((c, i) => ({ value: i, label: c.name })),
        });
        if (!prompts.isCancel(toEditIdx)) {
          const editedChar = await promptCharacterInfo(
            prompts,
            characters[toEditIdx as number],
          );
          if (editedChar) {
            characters[toEditIdx as number] = editedChar;
            saveCharacters(characters);
            console.log(pc.green("Character updated!"));
          }
        }
        break;

      case "delete":
        const toDeleteIdx = await prompts.select({
          message: "Select character to delete",
          options: characters.map((c, i) => ({ value: i, label: c.name })),
        });
        if (!prompts.isCancel(toDeleteIdx)) {
          const charToDelete = characters[toDeleteIdx as number];
          if (charToDelete) {
            const confirm = await prompts.confirm({
              message: `Are you sure you want to delete ${charToDelete.name}?`,
            });
            if (confirm === true) {
              characters.splice(toDeleteIdx as number, 1);
              saveCharacters(characters);
              console.log(pc.red("Character deleted."));
            }
          }
        }
        break;
    }
  }
}

async function backgroundsMenu(prompts: typeof p) {
  let exit = false;

  while (!exit) {
    const backgrounds = getBackgrounds();

    const action = await prompts.select({
      message: "Backgrounds Configuration",
      options: [
        { value: "list", label: "List backgrounds" },
        { value: "add", label: "Add background (Open folder)" },
        { value: "delete", label: "Delete background" },
        { value: "back", label: "Back" },
      ],
    });

    if (prompts.isCancel(action) || action === "back") {
      exit = true;
      continue;
    }

    switch (action) {
      case "list":
        console.log(pc.cyan("\n--- Current Backgrounds ---"));
        backgrounds.forEach((bg: string, i: number) => {
          console.log(`${i + 1}. ${bg}`);
        });
        console.log(pc.cyan("--------------------------\n"));
        break;

      case "add":
        exec(`xdg-open "${BACKGROUNDS_DIR}"`);
        console.log(pc.green("Opening backgrounds folder..."));
        console.log(
          pc.yellow("Please copy your video files (.mp4) into this folder."),
        );
        break;

      case "delete":
        const toDeleteIdx = await prompts.select({
          message: "Select background to delete",
          options: backgrounds.map((bg: string) => ({ value: bg, label: bg })),
        });
        if (!prompts.isCancel(toDeleteIdx)) {
          const bgFile = toDeleteIdx as string;
          const confirm = await prompts.confirm({
            message: `Are you sure you want to delete ${bgFile}?`,
          });
          if (confirm === true) {
            fs.unlinkSync(path.join(BACKGROUNDS_DIR, bgFile));
            console.log(pc.red(`Background ${bgFile} deleted.`));
          }
        }
        break;
    }
  }
}

async function promptCharacterInfo(
  prompts: typeof p,
  existing?: Character,
): Promise<Character | null> {
  const name = await prompts.text({
    message: "Name of the character:",
    initialValue: existing?.name || "",
    placeholder: "e.g. Peter Griffin",
    validate: (val?: string) =>
      !val || val.length === 0 ? "Name is required" : undefined,
  });
  if (prompts.isCancel(name)) return null;

  const slug = await prompts.text({
    message: "Slug for NiceVoice (e.g. peter-griffin):",
    initialValue: existing?.slug || "",
    placeholder: "Check nicevoice.org for slugs",
    validate: (val?: string) =>
      !val || val.length === 0 ? "Slug is required" : undefined,
  });
  if (prompts.isCancel(slug)) return null;

  let selectedImage: string | null = null;
  while (!selectedImage) {
    const images = fs
      .readdirSync(ASSETS_DIR)
      .filter(
        (f: string) =>
          f.endsWith(".png") || f.endsWith(".jpg") || f.endsWith(".webp"),
      );

    const imageChoice = await prompts.select({
      message: "Select image file (must be in src/assets/caracters):",
      options: [
        ...images.map((img: string) => ({ value: img, label: img })),
        { value: "__add__", label: "Add new image (Open explorer)" },
        { value: "__refresh__", label: "Refresh list" },
      ],
      initialValue: existing?.image,
    });

    if (prompts.isCancel(imageChoice)) return null;

    if (imageChoice === "__add__") {
      exec(`xdg-open "${ASSETS_DIR}"`);
      console.log(pc.green("Opening characters folder..."));
      continue;
    }

    if (imageChoice === "__refresh__") {
      console.log(pc.green("Image list refreshed!"));
      continue;
    }

    selectedImage = imageChoice as string;
  }

  const image = selectedImage;

  const description = await prompts.text({
    message: "Description (Personality for AI script):",
    initialValue: existing?.description || "",
    placeholder: "e.g. Arrogant, explain things simply...",
    validate: (val?: string) =>
      !val || val.length === 0 ? "Description is required" : undefined,
  });
  if (prompts.isCancel(description)) return null;

  return {
    name: name as string,
    slug: slug as string,
    image: image as string,
    description: description as string,
  };
}
