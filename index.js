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

    // Accept any video link
    if (/^https?:\/\//i.test(text)) {
      const origin = getOrigin(req);
      const openUrl = `${origin}/open?url=${encodeURIComponent(text)}`;
      await fetch(`${TG_API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: `🎬 *Your video player is ready!*\n\n▶️ ${openUrl}\n\nOpen in Chrome if video doesn’t play.`,
          parse_mode: "Markdown",
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
app.get("/", (_, res) => res.send("ZTeraPlay Bot is Running 🚀"));

// /open → auto Chrome redirect + 7s countdown timer + ad
app.get("/open", (req, res) => {
  const url = req.query.url || "";
  if (!url) return res.status(400).send("<h3>❌ Missing URL.</h3>");

  const watchUrl = `/watch?url=${encodeURIComponent(url)}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Open in Chrome</title>
<style>
  body { margin:0; padding:24px; background:#0b0b0b; color:#fff; font-family:sans-serif; text-align:center }
  h1 { margin-top:10vh }
  p { opacity:.8 }
  .btn {
    display:inline-block; margin-top:28px; padding:16px 28px;
    background:#10b981; color:#000; font-weight:700; border-radius:12px;
    text-decoration:none; cursor:pointer;
    box-shadow:0 6px 15px rgba(16,185,129,0.3); transition:0.2s;
  }
  .btn:hover { transform:translateY(-2px) }
  .ads { margin-top:40px; }
  .countdown {
    margin-top: 20px;
    font-size: 20px;
    font-weight: 600;
    color: #10b981;
  }
</style>

<script>
  let seconds = 7;
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  const isAndroid = /Android/i.test(ua);
  const isTelegram = /Telegram/i.test(ua);
  const isChrome = /Chrome/i.test(ua);

  function countdown() {
    const timerEl = document.getElementById("timer");
    timerEl.textContent = seconds;
    seconds--;
    if (seconds < 0) {
      redirectNow();
    } else {
      setTimeout(countdown, 1000);
    }
  }

  function redirectNow() {
    if (isAndroid && isTelegram && !isChrome) {
      const intentUrl = 'intent://' + window.location.host + '${watchUrl}' +
        '#Intent;scheme=https;package=com.android.chrome;end';
      window.location.href = intentUrl;
    } else {
      window.location.href = '${watchUrl}';
    }
  }

  window.onload = countdown;
</script>
</head>
<body>
  <h1>🎥 Preparing Your Video...</h1>
  <p>Redirecting automatically in</p>
  <div class="countdown"><span id="timer">7</span> seconds...</div>
  <a class="btn" href="${watchUrl}">OPEN Video Now</a>

  <div class="ads">
    <!-- 🔥 Adsterra ad under button -->
    <script async="async" data-cfasync="false" src="//pl27689834.revenuecpmgate.com/1aad6323fe767e376fc42dfa8fec01a3/invoke.js"></script>
    <div id="container-1aad6323fe767e376fc42dfa8fec01a3"></div>
  </div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

// /watch → fullscreen iTeraPlay API player + ads
app.get("/watch", (req, res) => {
  const link = req.query.url || "";
  if (!link) return res.status(400).send("<h3>❌ Missing video URL.</h3>");

  const iframeSrc = `https://iteraplay.com/api/play.php?url=${encodeURIComponent(link)}&key=iTeraPlay2025&autoplay=1`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ZTeraPlay Player</title>
<style>
  body { margin: 0; padding: 0; background: #000; color:#fff; text-align:center; font-family:sans-serif; }
  .video-container { position: relative; width: 100%; height: 100vh; overflow: hidden; }
  iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; }
  .ads { margin: 10px auto; background:#000; }
</style>
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
    <script async="async" data-cfasync="false" src="//pl27689834.revenuecpmgate.com/1aad6323fe767e376fc42dfa8fec01a3/invoke.js"></script>
    <div id="container-1aad6323fe767e376fc42dfa8fec01a3"></div>
  </div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

app.listen(3000, () => console.log("ZTeraPlay Chrome Auto-Redirect bot running (7s timer) 🚀"));
