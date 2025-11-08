import express from "express";

const app = express();
app.use(express.json());

// Telegram Bot Token
const BOT_TOKEN = process.env.BOT_TOKEN;
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

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
    const text = (msg.text || "").trim();

    // 🟢 Step 1: Handle /start command
    if (text === "/start") {
      await fetch(`${TG_API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "🎬 *Welcome to Terafetch Bot!*\n\nSend me any Terabox link to get a playable video link.",
          parse_mode: "Markdown",
        }),
      });
      return res.sendStatus(200);
    }

    // 🟢 Step 2: Handle any valid link
    if (/^https?:\/\//i.test(text)) {
      const origin = getOrigin(req);
      const watchUrl = `${origin}/watch?url=${encodeURIComponent(text)}`;

      await fetch(`${TG_API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: `🎬 *Your video player is ready!*\n\n▶️ ${watchUrl}\n\nTurn ON your mobile auto rotate mod and open link in Chrome browser for watch video full screen.`,
          parse_mode: "Markdown",
        }),
      });
    } else {
      // 🟡 Optional: invalid message response
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

// /watch → fullscreen player + auto Chrome redirect + loading animation + ads
app.get("/watch", (req, res) => {
  const link = req.query.url || "";
  if (!link) return res.status(400).send("<h3>❌ Missing video URL.</h3>");

  const iframeSrc = `https://iteraplay.com/api/play.php?url=${encodeURIComponent(link)}&key=iTeraPlay2025&autoplay=1`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ZteraPlay Video Player</title>
<style>
  body {
    margin: 0; padding: 0;
    background: #000;
    color: #fff;
    font-family: 'Poppins', sans-serif;
    overflow: hidden;
  }
  .loader {
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background: #000;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    z-index: 1000;
  }
  .spinner {
    width: 60px;
    height: 60px;
    border: 6px solid rgba(255,255,255,0.2);
    border-top-color: #10b981;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .loading-text {
    margin-top: 20px;
    font-size: 18px;
    color: #10b981;
    letter-spacing: 1px;
  }
  .video-container {
    position: relative;
    width: 100%;
    height: 100vh;
    display: none;
  }
  iframe {
    position: absolute;
    top: 0; left: 0;
    width: 100%;
    height: 100%;
    border: none;
  }
  .ads { margin: 10px auto; background:#000; text-align:center; display:none; }
</style>

<script>
  // Telegram Chrome redirect detection
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  const isAndroid = /Android/i.test(ua);
  const isTelegram = /Telegram/i.test(ua);
  const isChrome = /Chrome/i.test(ua);

  window.onload = () => {
    const loader = document.querySelector('.loader');
    const player = document.querySelector('.video-container');
    const ads = document.querySelector('.ads');

    // After 2 seconds, show player
    setTimeout(() => {
      loader.style.display = 'none';
      player.style.display = 'block';
      ads.style.display = 'block';
    }, 2000);

    // Telegram in-app browser redirect to Chrome
    if (isAndroid && isTelegram && !isChrome) {
      const intentUrl = 'intent://' + window.location.host + window.location.pathname + window.location.search +
        '#Intent;scheme=https;package=com.android.chrome;end';
      setTimeout(() => {
        window.location.href = intentUrl;
      }, 1000);
    }
  };
</script>
</head>
<body>
  <div class="loader">
    <div class="spinner"></div>
    <div class="loading-text">🎬 Loading your video...</div>
  </div>

  <div class="video-container">
    <iframe
      src="${iframeSrc}"
      allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope"
      allowfullscreen>
    </iframe>
  </div>

  <div class="ads">
    <!-- 🔥 Adsterra Ad below video -->
    <script async="async" data-cfasync="false" src="//pl27689834.revenuecpmgate.com/1aad6323fe767e376fc42dfa8fec01a3/invoke.js"></script>
    <div id="container-1aad6323fe767e376fc42dfa8fec01a3"></div>
  </div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

app.listen(3000, () =>
  console.log("ZteraPlay Bot running (Welcome + Loader + Auto Chrome) 🚀")
);
