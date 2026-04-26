import express from "express";
import { Server } from "http";
import pc from "picocolors";
import { exec } from "child_process";

export async function getOAuthCode(
  authUrl: string,
  port: number = 3000,
  callbackPath: string = "/callback",
): Promise<string> {
  return new Promise((resolve, reject) => {
    const app = express();
    let server: Server;

    app.get(callbackPath, (req, res) => {
      const code = req.query.code as string;
      if (code) {
        res.send(
          "Authentication successful! You can close this tab and return to the terminal.",
        );
        if (server) server.close();
        resolve(code);
      } else {
        res.status(400).send("No code found in callback.");
        if (server) server.close();
        reject(new Error("No code found"));
      }
    });

    server = app.listen(port, () => {
      console.log(pc.cyan(`\nWaiting for authentication...`));
      console.log(
        pc.yellow(
          `If your browser doesn't open automatically, please go to: ${authUrl}`,
        ),
      );
      exec(`xdg-open "${authUrl}"`);
    });

    server.on("error", (err) => {
      reject(err);
    });
  });
}
