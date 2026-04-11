import express from "express";
import cors from "cors";

const app = express();

const PORT = process.env.PORT || 3000;
const FAL_KEY = process.env.FAL_KEY;

app.use(cors());
app.use(express.json({ limit: "20mb" }));

app.get("/", (req, res) => {
  res.send("Backend работает 🚀");
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

function getImageEndpoint(model) {
  if (model === "Nano Banana Pro") return "fal-ai/nano-banana-pro";
  if (model === "Nano Banana 2") return "fal-ai/nano-banana-2";
  throw new Error("Unsupported image model");
}

function getVideoEndpoint(model) {
  if (model === "Kling 3") return "fal-ai/kling-video/v3/standard/text-to-video";
  if (model === "Kling Motion Control") return "fal-ai/kling-video/v3/standard/image-to-video";
  if (model === "Kling 3 Edit") return "fal-ai/kling-video/v3/standard/image-to-video";
  if (model === "Seedance 2.0") return "fal-ai/kling-video/v3/standard/text-to-video";
  if (model === "Veo 3 Lite") return "fal-ai/kling-video/v3/standard/text-to-video";
  if (model === "Veo 3 Fast") return "fal-ai/kling-video/v3/standard/text-to-video";
  if (model === "Veo 3 Quality") return "fal-ai/kling-video/v3/standard/text-to-video";
  throw new Error("Unsupported video model");
}

async function falRequest(endpoint, payload) {
  if (!FAL_KEY) {
    throw new Error("FAL_KEY is missing in Railway Variables");
  }

  const response = await fetch(`https://fal.run/${endpoint}`, {
    method: "POST",
    headers: {
      "Authorization": `Key ${FAL_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("FAL ERROR:", data);
    throw new Error(data?.detail || data?.error || "Fal request failed");
  }

  return data;
}

app.post("/api/generate-image", async (req, res) => {
  try {
    const { prompt, model } = req.body;

    if (!prompt || !model) {
      return res.status(400).json({
        ok: false,
        error: "prompt and model are required"
      });
    }

    const endpoint = getImageEndpoint(model);

    const payload = {
      prompt
    };

    const data = await falRequest(endpoint, payload);

    res.json({
      ok: true,
      type: "image",
      model,
      raw: data
    });
  } catch (error) {
    console.error("generate-image error:", error);
    res.status(500).json({
      ok: false,
      error: error.message || "generate-image failed"
    });
  }
});

app.post("/api/generate-video", async (req, res) => {
  try {
    const { prompt, model, duration, aspect_ratio } = req.body;

    if (!prompt || !model) {
      return res.status(400).json({
        ok: false,
        error: "prompt and model are required"
      });
    }

    const endpoint = getVideoEndpoint(model);

    const payload = {
      prompt,
      duration: duration || "5",
      aspect_ratio: aspect_ratio || "16:9"
    };

    const data = await falRequest(endpoint, payload);

    res.json({
      ok: true,
      type: "video",
      model,
      raw: data
    });
  } catch (error) {
    console.error("generate-video error:", error);
    res.status(500).json({
      ok: false,
      error: error.message || "generate-video failed"
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
