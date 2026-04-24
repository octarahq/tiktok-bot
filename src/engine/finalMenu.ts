import pc from "picocolors";
import ExportVideo from "./exportVideo.js";
import { clearSession } from "../utils/session.js";

export default async function finalMenu(p: typeof import("@clack/prompts")) {
  let stay = true;

  while (stay) {
    const action = await p.select({
      message: "Video is ready! What would you like to do?",
      options: [
        { value: "export", label: "Export the video" },
        { value: "exit", label: "Exit" },
      ],
    });

    if (p.isCancel(action) || action === "exit") {
      clearSession();
      stay = false;
      break;
    }

    if (action === "export") {
      await ExportVideo(p);
    }
  }

  p.outro(pc.bgCyan(pc.black(" THANK YOU FOR USING VIDEO GENERATOR ")));
}
