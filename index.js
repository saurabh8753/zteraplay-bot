import express from "express";

const app = express();
app.use(express.json());

// Telegram
const BOT_TOKEN = process.env.BOT_TOKEN;
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Helper to build domain URL dynamically
function getOrigin(req) {
  const proto = (req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  const host = req.headers.host;
  return `${proto}://${host}`;
}

// --- Telegram webhook ---
app.post("/", async (req, res) => {
  try {
    const msg = req.body?.message;
    if (!msg) return res.sendStatus(200);

    const chatId = msg.chat.id;
    const text = (msg.text || "").trim();

    // Only allow terabox/1024terabox links
    const valid = /^https?:\/\/(www\.)?(terabox|1024terabox)\.com\/\S+/i.test(text);
    if (!valid) {
      await fetch(`${TG_API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "📎 Send a valid Terabox link to get your player link!",
        }),
      });
      return res.sendStatus(200);
    }

    const origin = getOrigin(req);
    const openUrl = `${origin}/open?url=${encodeURIComponent(text)}`;

    await fetch(`${TG_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `🎬 *Your player page is ready!*\n\n▶️ ${openUrl}`,
        parse_mode: "Markdown",
      }),
    });

    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err);
    res.sendStatus(500);
  }
});

// Home
app.get("/", (_, res) => {
  res.send("ZTeraPlay bot is running ✅");
});

// /open → shows “OPEN Video” button
app.get("/open", (req, res) => {
  const url = req.query.url || "";
  const valid = /^https?:\/\/(www\.)?(terabox|1024terabox)\.com\/\S+/i.test(url);
  if (!valid) {
    return res.status(400).send("<h3>❌ Invalid or missing Terabox URL.</h3>");
  }

  const watchUrl = `/watch?url=${encodeURIComponent(url)}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Open Video</title>
<style>
  body{margin:0;padding:24px;background:#0b0b0b;color:#fff;font-family:system-ui,Arial}
  .wrap{max-width:680px;margin:10vh auto;text-align:center}
  h1{font-weight:700;margin-bottom:12px}
  p{opacity:.8}
  .btn{
    display:inline-block;margin-top:28px;padding:16px 28px;
    background:#10b981;color:#0b0b0b;font-weight:700;
    border-radius:12px;text-decoration:none;border:none;cursor:pointer;
    transition:transform .12s ease, box-shadow .12s ease;
    box-shadow:0 8px 20px rgba(16,185,129,.25)
  }
  .btn:hover{transform:translateY(-1px)}
</style>
</head>
<body>
  <div class="wrap">
    <h1>🎥 Ready to Watch?</h1>
    <p>Click the button below to open your video player.</p>
    <a class="btn" href="${watchUrl}">OPEN Video</a>
  </div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

// /watch → actual video player page
app.get("/watch", (req, res) => {
  const link = req.query.url || "";
  const valid = /^https?:\/\/(www\.)?(terabox|1024terabox)\.com\/\S+/i.test(link);
  if (!valid) {
    return res.status(400).send("<h3>❌ Invalid or missing Terabox URL.</h3>");
  }

  const iframeSrc = `https://iteraplay.com/api/play.php?url=${encodeURIComponent(link)}&key=iTeraPlay2025`;

  const playerHtml = `<!DOCTYPE html> <html lang="en"> <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Video Player</title>
    <style>
      body { margin: 0; padding: 20px; background: #000; }
      .video-container { max-width: 1200px; margin: 0 auto; aspect-ratio: 16 / 9; }
      iframe { width: 100%; height: 100%; border: none; border-radius: 8px; }
    </style>
  </head>
  <body>
    <div class="video-container">
      <iframe
        src="${iframeSrc}"
        allowfullscreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">
      </iframe>
    </div>
  </body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(playerHtml);
});

app.listen(3000, () => console.log("Server running on port 3000"));
