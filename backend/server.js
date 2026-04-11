const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// 🧠 временная база (потом заменим на БД)
let users = {};

// 🟢 получить юзера
function getUser(userId) {
  if (!users[userId]) {
    users[userId] = {
      credits: 50 // стартовый баланс
    };
  }
  return users[userId];
}

// ✅ health
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// 💰 получить баланс
app.get("/api/user/:id", (req, res) => {
  const user = getUser(req.params.id);
  res.json(user);
});

// 🖼️ генерация картинки
app.post("/api/generate-image", async (req, res) => {
  try {
    const { prompt, userId } = req.body;

    const user = getUser(userId);

    if (user.credits < 1) {
      return res.status(400).json({ error: "Нет кредитов" });
    }

    user.credits -= 1;

    const response = await axios.post(
      "https://fal.run/fal-ai/nano-banana",
      { prompt },
      {
        headers: {
          Authorization: `Key ${process.env.FAL_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json({
      ok: true,
      image: response.data.images?.[0]?.url,
      credits: user.credits
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Ошибка генерации" });
  }
});

// 🎥 генерация видео
app.post("/api/generate-video", async (req, res) => {
  try {
    const { prompt, userId } = req.body;

    const user = getUser(userId);

    if (user.credits < 8) {
      return res.status(400).json({ error: "Недостаточно кредитов" });
    }

    user.credits -= 8;

    // ✅ РАБОЧИЙ эндпоинт (через fal queue)
    const response = await axios.post(
      "https://queue.fal.run/fal-ai/kling-video/v1",
      {
        prompt: prompt,
        duration: "5"
      },
      {
        headers: {
          Authorization: `Key ${process.env.FAL_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json({
      ok: true,
      video: response.data?.video?.url || null,
      credits: user.credits
    });

  } catch (err) {
    console.error("VIDEO ERROR:", err.response?.data || err.message);

    res.status(500).json({
      error: err.response?.data || err.message
    });
  }
});
