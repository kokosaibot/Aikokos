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
  res.json({ ok: true, port: PORT });
});

app.post("/api/generate-image", async (req, res) => {
  try {
    const { prompt, model } = req.body;

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

    const imageEndpoint =
      model === "Nano Banana 2"
        ? "https://fal.run/fal-ai/nano-banana-2"
        : "https://fal.run/fal-ai/nano-banana";

    const response = await axios.post(
      imageEndpoint,
      { prompt: prompt.trim() },
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
    console.error("IMAGE ERROR:", err.response?.data || err.message);
    return res.status(500).json({
      ok: false,
      error: err.response?.data || err.message || "Image generation failed"
    });
  }
});

app.post("/api/generate-video", async (req, res) => {
  try {
    const { prompt, model, duration, aspect_ratio } = req.body;

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

    let videoEndpoint = "https://fal.run/fal-ai/kling-video/v3/standard/text-to-video";

    if (model === "Kling Motion Control" || model === "Kling 3 Edit") {
      videoEndpoint = "https://fal.run/fal-ai/kling-video/v3/standard/image-to-video";
    }

    const payload = {
      prompt: prompt.trim(),
      duration: duration || "5",
      aspect_ratio: aspect_ratio || "16:9"
    };

    const response = await axios.post(videoEndpoint, payload, {
      headers: {
        Authorization: `Key ${process.env.FAL_KEY}`,
        "Content-Type": "application/json"
      }
    });

    return res.json({
      ok: true,
      result: response.data
    });
  } catch (err) {
    console.error("VIDEO ERROR:", err.response?.data || err.message);
    return res.status(500).json({
      ok: false,
      error: err.response?.data || err.message || "Video generation failed"
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port", PORT);
});
