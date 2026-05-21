import { tokenStore } from "./verify-payment.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ message: "No download token provided." });
  }

  const entry = tokenStore.get(token);

  // Token checks
  if (!entry) {
    return res.status(403).json({ message: "Invalid or expired download link." });
  }
  if (entry.used) {
    return res.status(403).json({ message: "This download link has already been used." });
  }
  if (entry.expiresAt < Date.now()) {
    tokenStore.delete(token);
    return res.status(403).json({ message: "Download link expired. Please contact support." });
  }

  // Mark token as used BEFORE streaming (prevents double download)
  entry.used = true;
  tokenStore.set(token, entry);

  try {
    // Stream file directly from Google Drive (private, no direct link exposed)
    const GOOGLE_DRIVE_FILE_ID = process.env.GOOGLE_DRIVE_FILE_ID;
    const driveUrl = `https://drive.google.com/uc?export=download&id=${GOOGLE_DRIVE_FILE_ID}&confirm=t`;

    const driveRes = await fetch(driveUrl, {
      headers: {
        // Mimic browser to avoid Google's virus scan redirect for large files
        "User-Agent": "Mozilla/5.0",
      },
      redirect: "follow",
    });

    if (!driveRes.ok) {
      throw new Error("Google Drive fetch failed: " + driveRes.status);
    }

    // Set download headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="resource-pack-v1.pdf"`);

    // Stream directly to user — file URL never touches the browser
    const reader = driveRes.body.getReader();
    const stream = new ReadableStream({
      start(controller) {
        function push() {
          reader.read().then(({ done, value }) => {
            if (done) { controller.close(); return; }
            controller.enqueue(value);
            push();
          }).catch(err => controller.error(err));
        }
        push();
      }
    });

    // Pipe stream to response
    const nodeStream = require("stream").Readable.from(
      (async function* () {
        const r = driveRes.body.getReader();
        while (true) {
          const { done, value } = await r.read();
          if (done) break;
          yield value;
        }
      })()
    );

    nodeStream.pipe(res);

  } catch (err) {
    console.error("Download error:", err);
    // Unmark token so user can retry
    entry.used = false;
    tokenStore.set(token, entry);
    return res.status(500).json({ message: "Failed to fetch file. Please try again." });
  }
}
