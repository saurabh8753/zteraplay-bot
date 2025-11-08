import express from "express";
import fs from "fs";

const app = express();
app.use(express.json());

// Telegram Bot Token
const BOT_TOKEN = process.env.BOT_TOKEN;
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// File to store stats
const STATS_FILE = "./stats.json";

// Load stats or create new
let stats = { users: [], videos: 0 };
if (fs.existsSync(STATS_FILE)) {
  try {
    stats = JSON.parse(fs.readFileSync(STATS_FILE, "utf8"));
  } catch {
    stats = { users: [], videos: 0 };
  }
}

// Helper: save stats to file
function saveStats() {
  fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
}

// Helper: get base URL dynamically
function getOrigin(req) {
  const proto = (req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  const host = req.headers.host;
  return `${proto}://${host}`;
}

// Telegram Webhook
app.post("/", async (req, res) => {
  try {
    const msg = req.body?.message;
    if (!msg) return res.sendStatus(200);

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = (msg.text || "").trim();

    // 🟢 /start — Welcome message
    if (text === "/start") {
      if (!stats.users.includes(userId)) {
        stats.users.push(userId);
        saveStats();
      }

      await fetch(`${TG_API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "🎬 *Welcome to ZteraPlay Bot!*\n\nSend me any Terabox link to get a playable video link.",
          parse_mode: "Markdown",
        }),
      });
      return res.sendStatus(200);
    }

    // 🧾 /stats — show bot usage
    if (text === "/stats") {
      const userCount = stats.users.length;
      const videoCount = stats.videos;

      await fetch(`${TG_API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: `📊 *ZteraPlay Bot Stats:*\n\n👥 Total Users: *${userCount}*\n🎥 Videos Played: *${videoCount}*`,
          parse_mode: "Markdown",
        }),
      });
      return res.sendStatus(200);
    }

    // 🎬 Handle valid video links
    if (/^https?:\/\//i.test(text)) {
      const origin = getOrigin(req);
      const watchUrl = `${origin}/watch?url=${encodeURIComponent(text)}`;

      // Count usage
      if (!stats.users.includes(userId)) {
        stats.users.push(userId);
      }
      stats.videos++;
      saveStats();

      await fetch(`${TG_API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: `🎬 *Your video player is ready!*\n\n▶️ ${watchUrl}\n\nIf video doesn’t play, open in Chrome browser.`,
          parse_mode: "Markdown",
        }),
      });
    } else {
      await fetch(`${TG_API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "⚠️ Please send a valid Terabox link to get your playable video.",
        }),
      });
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err);
    res.sendStatus(500);
  }
});

// Home route
app.get("/", (_, res) => res.send("ZteraPlay Bot is Running 🚀"));

// /watch → fullscreen player + auto Chrome redirect + ads
app.get("/watch", (req, res) => {
  const link = req.query.url || "";
  if (!link) return res.status(400).send("<h3>❌ Missing video URL.</h3>");

  const iframeSrc = `https://iteraplay.com/api/play.php?url=${encodeURIComponent(
    link
  )}&key=iTeraPlay2025&autoplay=1`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ZteraPlay Video Player</title>
<style>
  body {
    margin: 0;
    padding: 0;
    background: #000;
    color: #fff;
    font-family: 'Poppins', sans-serif;
    overflow: hidden;
    text-align: center;
  }
  .video-container {
    position: relative;
    width: 100%;
    height: 100vh;
    overflow: hidden;
  }
  iframe {
    position: absolute;
    top: 0; left: 0;
    width: 100%;
    height: 100%;
    border: none;
  }
  .ads { margin: 10px auto; background:#000; text-align:center; }
</style>

<script>
  // Telegram Chrome redirect detection
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  const isAndroid = /Android/i.test(ua);
  const isTelegram = /Telegram/i.test(ua);
  const isChrome = /Chrome/i.test(ua);

  if (isAndroid && isTelegram && !isChrome) {
    const intentUrl = 'intent://' + window.location.host + window.location.pathname + window.location.search +
      '#Intent;scheme=https;package=com.android.chrome;end';
    window.location.href = intentUrl;
  }
</script>
</head>
<body>
  <div class="video-container">
    <iframe
      src="${iframeSrc}"
      allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope"
      allowfullscreen>
    </iframe>
  </div>

  <div class="ads">
    <!-- 🔥 Adsterra Ad below video -->
    <script async="async" data-cfasync="false"
      src="//pl27689834.revenuecpmgate.com/1aad6323fe767e376fc42dfa8fec01a3/invoke.js"></script>
    <div id="container-1aad6323fe767e376fc42dfa8fec01a3"></div>
  </div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

app.listen(3000, () =>
  console.log("ZteraPlay Bot running (with /stats feature) 🚀")
);
