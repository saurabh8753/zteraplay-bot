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

// Helper: delete message
async function deleteMessage(chatId, messageId) {
  try {
    await fetch(`${TG_API}/deleteMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
    });
  } catch (err) {
    console.error("Delete message error:", err);
  }
}

// Telegram Webhook
app.post("/", async (req, res) => {
  try {
    const msg = req.body?.message;
    if (!msg) return res.sendStatus(200);

    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const text = (msg.text || "").trim();

    // /start — Welcome message
    if (text === "/start") {
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

    // Handle valid links
    if (/^https?:\/\//i.test(text)) {
      const origin = getOrigin(req);
      const watchUrl = `${origin}/watch?url=${encodeURIComponent(text)}`;

      const sendRes = await fetch(`${TG_API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text:
            `🎬 *Your video player is ready!*\n\n▶️ ${watchUrl}\n\n` +
            `⚠️ _This message will be deleted after 30 minutes._\nPlease forward or save this message.`,
          parse_mode: "Markdown",
        }),
      });

      const data = await sendRes.json();

      // Auto delete after 30 mins
      if (data.ok) {
        const botMessageId = data.result.message_id;
        setTimeout(async () => {
          console.log(`Deleting chat ${chatId}`);
          await deleteMessage(chatId, botMessageId);
          await deleteMessage(chatId, messageId);
        }, 30 * 60 * 1000);
      }
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

// Watch route → fullscreen video + single EffectiveGate ad below
app.get("/watch", (req, res) => {
  const link = req.query.url || "";
  if (!link) return res.status(400).send("<h3>❌ Missing video URL.</h3>");

  const iframeSrc = `https://iteraplay.com/api/play.php?url=${encodeURIComponent(
    link
  )}&key=iTeraPlay2025&autoplay=1`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>ZteraPlay Video Player</title>
<style>
  body {
    margin: 0;
    background: #000;
    color: #fff;
    font-family: 'Poppins', sans-serif;
    text-align: center;
  }

  .video-container {
    position: relative;
    width: 100%;
    height: 80vh; /* ensures space below for ads */
    background: #000;
    overflow: hidden;
  }

  iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: none;
  }

  .ads-container {
    width: 100%;
    min-height: 120px;
    background: #000;
    margin-top: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding-bottom: 10px;
  }
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

  // Load EffectiveGateCPM ad after page load
  window.onload = () => {
    const adScript = document.createElement("script");
    adScript.async = true;
    adScript.setAttribute("data-cfasync", "false");
    adScript.src = "//pl28014789.effectivegatecpm.com/b4b685eed4a6d70ed726583fa0513943/invoke.js";
    document.getElementById("ads").appendChild(adScript);

    const adDiv = document.createElement("div");
    adDiv.id = "container-b4b685eed4a6d70ed726583fa0513943";
    document.getElementById("ads").appendChild(adDiv);
  };
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

  <div class="ads-container" id="ads">
    <noscript><p style="color:white;">Enable JavaScript to view ads</p></noscript>
  </div>
</body>
</html>
`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

app.listen(3000, () =>
  console.log("ZteraPlay Bot running (Auto Delete + Chrome Redirect + EffectiveGate Ad) 🚀")
);
