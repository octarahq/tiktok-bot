import fs from "fs";
import path from "path";

const TEMP_DIR = path.join(process.cwd(), "temp");
const SUBJECT_FILE = path.join(TEMP_DIR, "subject.txt");
const SCRIPT_FILE = path.join(TEMP_DIR, "script.txt");
const AUDIO_DIR = path.join(TEMP_DIR, "audio");

const CHARACTERS_FILE = path.join(TEMP_DIR, "characters.json");

export interface Session {
  subject: string | null;
  script: string | null;
  characters: any[] | null;
  hasAudio: boolean;
  hasVideo: boolean;
}

export function hasSession(): boolean {
  return fs.existsSync(SUBJECT_FILE) || fs.existsSync(SCRIPT_FILE);
}

export function getSession(): Session {
  return {
    subject: fs.existsSync(SUBJECT_FILE)
      ? fs.readFileSync(SUBJECT_FILE, "utf-8")
      : null,
    script: fs.existsSync(SCRIPT_FILE)
      ? fs.readFileSync(SCRIPT_FILE, "utf-8")
      : null,
    characters: fs.existsSync(CHARACTERS_FILE)
      ? JSON.parse(fs.readFileSync(CHARACTERS_FILE, "utf-8"))
      : null,
    hasAudio: fs.existsSync(AUDIO_DIR) && fs.readdirSync(AUDIO_DIR).length > 0,
    hasVideo: fs.existsSync(path.join(TEMP_DIR, "video/video.mp4")),
  };
}

export function saveSubject(subject: string) {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
  fs.writeFileSync(SUBJECT_FILE, subject, "utf-8");
}

export function saveScript(script: string) {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
  fs.writeFileSync(SCRIPT_FILE, script, "utf-8");
}

export function saveSessionCharacters(characters: any[]) {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
  fs.writeFileSync(CHARACTERS_FILE, JSON.stringify(characters, null, 2));
}

export function clearSession(deleteTemp: boolean = true) {
  const OLD_SUBJECTS_PATH = path.join(
    process.cwd(),
    "src/data/old_subjects.json",
  );

  if (fs.existsSync(SUBJECT_FILE)) {
    try {
      const subject = fs.readFileSync(SUBJECT_FILE, "utf-8").trim();
      if (subject) {
        let history: string[] = [];
        if (fs.existsSync(OLD_SUBJECTS_PATH)) {
          history = JSON.parse(fs.readFileSync(OLD_SUBJECTS_PATH, "utf-8"));
        }
        if (!history.includes(subject)) {
          history.push(subject);
          const dataDir = path.dirname(OLD_SUBJECTS_PATH);
          if (!fs.existsSync(dataDir))
            fs.mkdirSync(dataDir, { recursive: true });
          fs.writeFileSync(OLD_SUBJECTS_PATH, JSON.stringify(history, null, 2));
        }
      }
    } catch (error) {
      console.error("Error saving subject to history:", error);
    }
  }

  if (deleteTemp && fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    fs.mkdirSync(TEMP_DIR, { recursive: true });
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
  }
}
