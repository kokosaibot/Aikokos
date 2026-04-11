import express from "express";
import cors from "cors";
import { fal } from "@fal-ai/client";

const app = express();
const PORT = Number(process.env.PORT || 8080);

fal.config({
  credentials: process.env.FAL_KEY
});

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "x-user-id"]
}));
app.options("*", cors());
app.use(express.json({ limit: "25mb" }));

// ---------------------------
// TEMP IN-MEMORY STORE
// ---------------------------
const users = new Map();

function getUser(userId = "test_user") {
  if (!users.has(userId)) {
    users.set(userId, {
      id: userId,
      credits: 50,
      history: []
    });
  }
  return users.get(userId);
}

function addHistory(userId, item) {
  const user = getUser(userId);
  user.history.unshift({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...item
  });
  user.history = user.history.slice(0, 50);
}

function spendCredits(userId, amount) {
  const user = getUser(userId);

  if (user.credits < amount) {
    throw new Error(`Недостаточно кредитов. Нужно ${amount}, доступно ${user.credits}`);
  }

  user.credits -= amount;
  return user.credits;
}

function refundCredits(userId, amount) {
  const user = getUser(userId);
  user.credits += amount;
  return user.credits;
}

function normalizeAspectRatio(ratio, fallback = "16:9") {
  if (!ratio || ratio === "Automatic" || ratio === "auto") return "auto";
  return ratio;
}

function normalizeImageAspectRatio(ratio) {
  if (!ratio || ratio === "Automatic") return "1:1";
  return ratio;
}

function normalizeKlingDuration(duration) {
  const n = Number(duration || 5);
  if (Number.isNaN(n)) return 5;
  return Math.max(5, Math.min(15, Math.round(n)));
}

function normalizeVeoDuration(duration) {
  const n = Number(duration || 8);
  if (n <= 4) return "4s";
  if (n <= 6) return "6s";
  return "8s";
}

function normalizeSeedanceDuration(duration) {
  const n = Number(duration || 5);
  if (Number.isNaN(n)) return 5;
  return Math.max(4, Math.min(15, Math.round(n)));
}

function imageModelToEndpoint(model, hasImage) {
  if (model === "Nano Banana Pro") {
    return hasImage ? "fal-ai/nano-banana-pro/edit" : "fal-ai/nano-banana-pro";
  }

  // UI label "Nano Banana 2" → current fal endpoint "fal-ai/nano-banana"
  return hasImage ? "fal-ai/nano-banana/edit" : "fal-ai/nano-banana";
}

function extractImageUrl(data) {
  return (
    data?.images?.[0]?.url ||
    data?.image?.url ||
    data?.output?.images?.[0]?.url ||
    data?.output?.[0]?.url ||
    null
  );
}

function extractVideoUrl(data) {
  return (
    data?.video?.url ||
    data?.videos?.[0]?.url ||
    data?.output?.video?.url ||
    data?.output?.videos?.[0]?.url ||
    null
  );
}

async function runFal(endpoint, input) {
  const result = await fal.subscribe(endpoint, {
    input,
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS" && Array.isArray(update.logs)) {
        for (const log of update.logs) {
          if (log?.message) console.log(`[${endpoint}]`, log.message);
        }
      }
    }
  });

  return result.data;
}

function buildVideoRequest({ model, prompt, duration, aspect_ratio, startImageDataUrl, endImageDataUrl, userId }) {
  const hasStart = Boolean(startImageDataUrl);
  const hasEnd = Boolean(endImageDataUrl);
  const ratio = normalizeAspectRatio(aspect_ratio);
  const basePrompt = prompt?.trim();

  switch (model) {
    case "Kling 3.0": {
      if (hasStart) {
        return {
          endpoint: "fal-ai/kling-video/o3/pro/image-to-video",
          input: {
            prompt: basePrompt,
            image_url: startImageDataUrl,
            ...(hasEnd ? { end_image_url: endImageDataUrl } : {}),
            duration: normalizeKlingDuration(duration),
            aspect_ratio: ratio === "auto" ? "16:9" : ratio,
            generate_audio: false
          }
        };
      }

      return {
        endpoint: "fal-ai/kling-video/o3/pro/text-to-video",
        input: {
          prompt: basePrompt,
          duration: normalizeKlingDuration(duration),
          aspect_ratio: ratio === "auto" ? "16:9" : ratio,
          generate_audio: false
        }
      };
    }

    case "Kling Motion Control": {
      if (!hasStart) {
        throw new Error("Для Kling Motion Control загрузи хотя бы start frame");
      }

      return {
        endpoint: "fal-ai/kling-video/o3/pro/reference-to-video",
        input: {
          prompt: basePrompt,
          start_image_url: startImageDataUrl,
          ...(hasEnd ? { image_urls: [endImageDataUrl] } : {}),
          duration: normalizeKlingDuration(duration),
          aspect_ratio: ratio === "auto" ? "16:9" : ratio,
          generate_audio: false
        }
      };
    }

    case "Kling Edit": {
      if (!hasStart) {
        throw new Error("Для Kling Edit загрузи start frame");
      }

      // true video edit on fal needs video_url; your current UI uses images
      return {
        endpoint: "fal-ai/kling-video/o3/pro/image-to-video",
        input: {
          prompt: basePrompt,
          image_url: startImageDataUrl,
          ...(hasEnd ? { end_image_url: endImageDataUrl } : {}),
          duration: normalizeKlingDuration(duration),
          aspect_ratio: ratio === "auto" ? "16:9" : ratio,
          generate_audio: false
        }
      };
    }

    case "Seedance 2.0": {
      if (hasStart) {
        return {
          endpoint: "bytedance/seedance-2.0/image-to-video",
          input: {
            prompt: basePrompt,
            image_url: startImageDataUrl,
            ...(hasEnd ? { end_image_url: endImageDataUrl } : {}),
            duration: normalizeSeedanceDuration(duration),
            aspect_ratio: ratio,
            resolution: "720p",
            generate_audio: false,
            end_user_id: String(userId)
          }
        };
      }

      return {
        endpoint: "bytedance/seedance-2.0/text-to-video",
        input: {
          prompt: basePrompt,
          duration: normalizeSeedanceDuration(duration),
          aspect_ratio: ratio,
          resolution: "720p",
          generate_audio: false,
          end_user_id: String(userId)
        }
      };
    }

    case "Veo 3 Lite": {
      if (hasStart) {
        return {
          endpoint: "fal-ai/veo3/fast/image-to-video",
          input: {
            prompt: basePrompt,
            image_url: startImageDataUrl,
            aspect_ratio: ratio,
            resolution: "720p"
          }
        };
      }

      return {
        endpoint: "fal-ai/veo3/fast",
        input: {
          prompt: basePrompt,
          aspect_ratio: ratio === "auto" ? "16:9" : ratio,
          duration: normalizeVeoDuration(duration),
          resolution: "720p",
          generate_audio: false
        }
      };
    }

    case "Veo 3 Fast": {
      if (hasStart) {
        return {
          endpoint: "fal-ai/veo3/fast/image-to-video",
          input: {
            prompt: basePrompt,
            image_url: startImageDataUrl,
            aspect_ratio: ratio,
            resolution: "720p"
          }
        };
      }

      return {
        endpoint: "fal-ai/veo3/fast",
        input: {
          prompt: basePrompt,
          aspect_ratio: ratio === "auto" ? "16:9" : ratio,
          duration: normalizeVeoDuration(duration),
          resolution: "720p",
          generate_audio: false
        }
      };
    }

    case "Veo 3 Quality":
    default: {
      if (hasStart) {
        return {
          endpoint: "fal-ai/veo3/image-to-video",
          input: {
            prompt: basePrompt,
            image_url: startImageDataUrl,
            aspect_ratio: ratio,
            resolution: "1080p"
          }
        };
      }

      return {
        endpoint: "fal-ai/veo3",
        input: {
          prompt: basePrompt,
          aspect_ratio: ratio === "auto" ? "16:9" : ratio,
          duration: normalizeVeoDuration(duration),
          resolution: "1080p",
          generate_audio: false
        }
      };
    }
  }
}

// ---------------------------
// ROUTES
// ---------------------------
app.get("/", (req, res) => {
  res.send("Backend работает 🚀");
});

app.get("/health", (req, res) => {
  res.json({ ok: true, port: PORT });
});

app.get("/api/user/:id", (req, res) => {
  const user = getUser(req.params.id);
  res.json({
    ok: true,
    id: user.id,
    credits: user.credits,
    history: user.history
  });
});

app.post("/api/generate-image", async (req, res) => {
  const { prompt, model = "Nano Banana Pro", aspectRatio = "1:1", imageDataUrl, userId = "test_user" } = req.body;

  if (!prompt || !String(prompt).trim()) {
    return res.status(400).json({ ok: false, error: "Prompt is required" });
  }

  if (!process.env.FAL_KEY) {
    return res.status(500).json({ ok: false, error: "FAL_KEY is missing in Railway Variables" });
  }

  let creditsAfterSpend;

  try {
    creditsAfterSpend = spendCredits(userId, 1);

    const endpoint = imageModelToEndpoint(model, Boolean(imageDataUrl));

    const input = imageDataUrl
      ? {
          prompt: String(prompt).trim(),
          image_urls: [imageDataUrl],
          aspect_ratio: normalizeAspectRatio(aspectRatio, "auto")
        }
      : {
          prompt: String(prompt).trim(),
          aspect_ratio: normalizeImageAspectRatio(aspectRatio)
        };

    const data = await runFal(endpoint, input);
    const imageUrl = extractImageUrl(data);

    addHistory(userId, {
      type: "image",
      model,
      prompt: String(prompt).trim(),
      cost: 1,
      resultUrl: imageUrl
    });

    return res.json({
      ok: true,
      model,
      image: imageUrl,
      credits: creditsAfterSpend,
      raw: data
    });
  } catch (error) {
    refundCredits(userId, 1);
    console.error("IMAGE ERROR:", error);
    return res.status(500).json({
      ok: false,
      error: error?.message || "Image generation failed"
    });
  }
});

app.post("/api/generate-video", async (req, res) => {
  const {
    prompt,
    model = "Kling 3.0",
    duration = "5",
    aspect_ratio = "16:9",
    startImageDataUrl,
    endImageDataUrl,
    userId = "test_user"
  } = req.body;

  if (!prompt || !String(prompt).trim()) {
    return res.status(400).json({ ok: false, error: "Prompt is required" });
  }

  if (!process.env.FAL_KEY) {
    return res.status(500).json({ ok: false, error: "FAL_KEY is missing in Railway Variables" });
  }

  let creditsAfterSpend;

  try {
    creditsAfterSpend = spendCredits(userId, 8);

    const { endpoint, input } = buildVideoRequest({
      model,
      prompt,
      duration,
      aspect_ratio,
      startImageDataUrl,
      endImageDataUrl,
      userId
    });

    const data = await runFal(endpoint, input);
    const videoUrl = extractVideoUrl(data);

    addHistory(userId, {
      type: "video",
      model,
      prompt: String(prompt).trim(),
      cost: 8,
      resultUrl: videoUrl
    });

    return res.json({
      ok: true,
      model,
      video: videoUrl,
      credits: creditsAfterSpend,
      raw: data
    });
  } catch (error) {
    refundCredits(userId, 8);
    console.error("VIDEO ERROR:", error);
    return res.status(500).json({
      ok: false,
      error: error?.message || "Video generation failed"
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
