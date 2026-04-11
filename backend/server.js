const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/", (req, res) => {
  res.send("Backend работает 🚀");
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    port: PORT
  });
});

app.post("/api/generate-image", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({
        ok: false,
        error: "Prompt is required"
      });
    }

    if (!process.env.FAL_KEY) {
      return res.status(500).json({
        ok: false,
        error: "FAL_KEY is missing in Railway Variables"
      });
    }

    const response = await axios.post(
      "https://fal.run/fal-ai/nano-banana",
      {
        prompt: prompt.trim()
      },
      {
        headers: {
          Authorization: `Key ${process.env.FAL_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return res.json({
      ok: true,
      result: response.data
    });
  } catch (err) {
    console.error("FAL ERROR:", err.response?.data || err.message);

    return res.status(500).json({
      ok: false,
      error: err.response?.data || err.message || "Generation failed"
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port", PORT);
});
