import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import { fal } from "@fal-ai/client";

const app = express();
const PORT = Number(process.env.PORT || 8080);

const SUPABASE_URL = (process.env.SUPABASE_URL || "").trim();
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const FAL_KEY = (process.env.FAL_KEY || "").trim();

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("[MONTIX] Missing Supabase env vars. API will not work until SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.");
}
if (!FAL_KEY) {
  console.warn("[MONTIX] Missing FAL_KEY. Generation endpoints will fail until it is set.");
}

const supabase = createClient(SUPABASE_URL || "https://invalid.local", SUPABASE_SERVICE_ROLE_KEY || "invalid-key");
fal.config({ credentials: FAL_KEY });

app.use(cors({ origin: "*", methods: ["GET", "POST", "OPTIONS"], allowedHeaders: ["Content-Type", "x-user-id"] }));
app.options("*", cors());
app.use(express.json({ limit: "60mb" }));

function requireEnv() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY не заданы");
  }
  if (!FAL_KEY) {
    throw new Error("FAL_KEY не задан");
  }
}

function normalizeImageAspectRatio(ratio) {
  if (!ratio || ratio === "Automatic" || ratio === "auto") return "1:1";
  return ratio;
}

function normalizeVideoAspectRatio(ratio, model) {
  if (!ratio || ratio === "Automatic" || ratio === "auto") {
    if (String(model).toLowerCase().includes("veo")) return "16:9";
    return "16:9";
  }
  return ratio;
}

function normalizeImageQuality(quality) {
  const value = String(quality || "standard").toLowerCase();
  if (["fast", "standard", "quality"].includes(value)) return value;
  return "standard";
}

function normalizeVideoQuality(quality) {
  const value = String(quality || "balanced").toLowerCase();
  if (["fast", "balanced", "quality"].includes(value)) return value;
  return "balanced";
}

function resolutionFromImageQuality(quality) {
  if (quality === "quality") return "4k";
  if (quality === "standard") return "2k";
  return "1k";
}

function resolutionFromVideoSettings(model, quality, resolution) {
  const wanted = String(resolution || "").toLowerCase();
  const q = normalizeVideoQuality(quality);
  const isVeo = String(model).toLowerCase().includes("veo");

  if (isVeo) {
    if (wanted === "1080p" || wanted === "2k" || q === "quality") return "1080p";
    return "720p";
  }

  if (wanted === "4k") return "1080p";
  if (wanted === "2k") return "1080p";
  if (wanted === "1080p") return "1080p";
  return "720p";
}

function normalizeDurationForModel(model, duration, orientation = "image") {
  const n = Number(duration || 5);
  const safe = Number.isFinite(n) ? n : 5;
  if (model === "Kling Motion Control") {
    const max = orientation === "video" ? 30 : 10;
    return Math.max(5, Math.min(max, Math.round(safe)));
  }
  if (String(model).includes("Veo")) {
    if (safe <= 4) return "4s";
    if (safe <= 6) return "6s";
    return "8s";
  }
  if (model === "Seedance 2.0") {
    return Math.max(4, Math.min(15, Math.round(safe)));
  }
  return Math.max(5, Math.min(10, Math.round(safe)));
}

async function ensureUser(userId, profile = {}) {
  const payload = {
    id: String(userId),
    username: profile.username || null,
    first_name: profile.first_name || null,
    last_name: profile.last_name || null
  };

  const { error } = await supabase.from("app_users").upsert(payload, { onConflict: "id" });
  if (error) throw error;

  const { data, error: fetchError } = await supabase
    .from("app_users")
    .select("*")
    .eq("id", String(userId))
    .single();

  if (fetchError) throw fetchError;
  return data;
}

async function getUser(userId) {
  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .eq("id", String(userId))
    .single();

  if (error) throw error;
  return data;
}

async function setUserCredits(userId, fields) {
  const { data, error } = await supabase
    .from("app_users")
    .update(fields)
    .eq("id", String(userId))
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

async function spendCredits(userId, amount, type = "credits") {
  const user = await getUser(userId);
  const current = Number(type === "enhance" ? user.enhance_credits : user.credits) || 0;
  if (current < amount) {
    throw new Error(`Недостаточно ${type === "enhance" ? "enhance credits" : "credits"}. Нужно ${amount}, доступно ${current}`);
  }
  const next = current - amount;
  const updated = await setUserCredits(userId, type === "enhance" ? { enhance_credits: next } : { credits: next });
  return type === "enhance" ? updated.enhance_credits : updated.credits;
}

async function refundCredits(userId, amount, type = "credits") {
  const user = await getUser(userId);
  const current = Number(type === "enhance" ? user.enhance_credits : user.credits) || 0;
  const next = current + amount;
  const updated = await setUserCredits(userId, type === "enhance" ? { enhance_credits: next } : { credits: next });
  return type === "enhance" ? updated.enhance_credits : updated.credits;
}

async function addHistory(userId, item) {
  const { error } = await supabase.from("generations").insert({
    user_id: String(userId),
    type: item.type,
    model: item.model,
    prompt: item.prompt,
    cost: item.cost,
    result_url: item.resultUrl || null,
    meta: item.meta || {}
  });
  if (error) throw error;
}

async function getHistory(userId) {
  const { data, error } = await supabase
    .from("generations")
    .select("*")
    .eq("user_id", String(userId))
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return data;
}

function imageModelToEndpoint(model, hasImage) {
  if (model === "Nano Banana Pro") return hasImage ? "fal-ai/nano-banana-pro/edit" : "fal-ai/nano-banana-pro";
  if (model === "Nano Banana 2") return hasImage ? "fal-ai/nano-banana-2/edit" : "fal-ai/nano-banana-2";
  return hasImage ? "fal-ai/nano-banana/edit" : "fal-ai/nano-banana";
}

function extractImageUrl(data) {
  return data?.images?.[0]?.url || data?.image?.url || data?.output?.images?.[0]?.url || data?.output?.[0]?.url || null;
}

function extractVideoUrl(data) {
  return data?.video?.url || data?.videos?.[0]?.url || data?.output?.video?.url || data?.output?.videos?.[0]?.url || null;
}

async function runFal(endpoint, input) {
  const result = await fal.subscribe(endpoint, {
    input,
    logs: true,
    onQueueUpdate(update) {
      if (update.status === "IN_PROGRESS" && Array.isArray(update.logs)) {
        for (const log of update.logs) {
          if (log?.message) console.log(`[${endpoint}] ${log.message}`);
        }
      }
    }
  });
  return result.data;
}

function calculateImageCost({ quality = "standard" }) {
  const q = normalizeImageQuality(quality);
  if (q === "quality") return 3;
  if (q === "fast") return 1;
  return 2;
}

function calculateVideoCost({ model = "Kling 3.0", quality = "balanced", duration = 5, sound = true }) {
  const q = normalizeVideoQuality(quality);
  const seconds = Number(duration) || 5;
  let base = 8;

  if (model === "Kling Motion Control") base = 10;
  else if (String(model).includes("Veo 3 Quality")) base = 16;
  else if (String(model).includes("Veo 3 Fast") || String(model).includes("Veo 3 Lite")) base = 10;
  else if (model === "Seedance 2.0") base = 9;

  if (q === "quality") base += 4;
  if (q === "fast") base -= 1;
  if (seconds >= 8) base += 2;
  if (seconds >= 10) base += 2;
  if (sound) base += 2;

  return Math.max(4, base);
}

function buildImageInput({ prompt, imageDataUrl, aspectRatio, quality }) {
  const q = normalizeImageQuality(quality);
  const output_resolution = resolutionFromImageQuality(q);

  if (imageDataUrl) {
    return {
      prompt: String(prompt).trim(),
      image_urls: [imageDataUrl],
      aspect_ratio: normalizeImageAspectRatio(aspectRatio),
      output_format: "png",
      output_resolution
    };
  }

  return {
    prompt: String(prompt).trim(),
    aspect_ratio: normalizeImageAspectRatio(aspectRatio),
    output_format: "png",
    output_resolution
  };
}

function buildVideoRequest(payload) {
  const {
    model,
    prompt,
    duration,
    aspectRatio,
    quality,
    resolution,
    sound,
    imageDataUrl,
    endImageDataUrl,
    motionImageDataUrl,
    motionVideoDataUrl,
    sceneControlEnabled,
    sceneControlMode,
    orientation,
    userId
  } = payload;

  const ratio = normalizeVideoAspectRatio(aspectRatio, model);
  const videoDuration = normalizeDurationForModel(model, duration, orientation);
  const res = resolutionFromVideoSettings(model, quality, resolution);
  const generate_audio = Boolean(sound);
  const basePrompt = String(prompt || "").trim();

  if (model === "Kling Motion Control") {
    if (!motionImageDataUrl || !motionVideoDataUrl) {
      throw new Error("Для Kling Motion Control нужны и видео, и фото");
    }

    let enhancedPrompt = basePrompt;
    if (!sceneControlEnabled) {
      enhancedPrompt = `${basePrompt}\nScene control is off. Follow the reference motion carefully and preserve clean character transfer.`.trim();
    } else {
      enhancedPrompt = `${basePrompt}\nScene control mode: ${sceneControlMode === "character" ? "image character as main source" : "video background as main source"}.`.trim();
    }

    return {
      endpoint: "fal-ai/kling-video/v3/pro/motion-control",
      input: {
        prompt: enhancedPrompt,
        image_url: motionImageDataUrl,
        video_url: motionVideoDataUrl,
        character_orientation: orientation === "video" ? "video" : "image",
        keep_original_sound: Boolean(sound)
      }
    };
  }

  if (model === "Kling 3.0") {
    if (!imageDataUrl) {
      throw new Error("Для Kling 3.0 загрузи стартовое изображение");
    }
    return {
      endpoint: "fal-ai/kling-video/o3/standard/image-to-video",
      input: {
        prompt: basePrompt,
        start_image_url: imageDataUrl,
        ...(endImageDataUrl ? { end_image_url: endImageDataUrl } : {}),
        duration: videoDuration,
        aspect_ratio: ratio,
        generate_audio
      }
    };
  }

  if (model === "Kling Edit") {
    if (!imageDataUrl) {
      throw new Error("Для Kling Edit загрузи изображение");
    }
    return {
      endpoint: "fal-ai/kling-video/o3/pro/reference-to-video",
      input: {
        prompt: basePrompt,
        start_image_url: imageDataUrl,
        ...(endImageDataUrl ? { end_image_url: endImageDataUrl } : {}),
        image_urls: [imageDataUrl],
        duration: videoDuration,
        aspect_ratio: ratio,
        generate_audio
      }
    };
  }

  if (model === "Seedance 2.0") {
    if (imageDataUrl) {
      return {
        endpoint: "bytedance/seedance-2.0/image-to-video",
        input: {
          prompt: basePrompt,
          image_url: imageDataUrl,
          ...(endImageDataUrl ? { end_image_url: endImageDataUrl } : {}),
          duration: videoDuration,
          aspect_ratio: ratio,
          resolution: res,
          generate_audio,
          end_user_id: String(userId)
        }
      };
    }
    return {
      endpoint: "bytedance/seedance-2.0/text-to-video",
      input: {
        prompt: basePrompt,
        duration: videoDuration,
        aspect_ratio: ratio,
        resolution: res,
        generate_audio,
        end_user_id: String(userId)
      }
    };
  }

  if (model === "Veo 3 Lite" || model === "Veo 3 Fast") {
    if (imageDataUrl) {
      return {
        endpoint: "fal-ai/veo3/fast/image-to-video",
        input: {
          prompt: basePrompt,
          image_url: imageDataUrl,
          aspect_ratio: ratio,
          duration: videoDuration,
          resolution: res,
          generate_audio
        }
      };
    }
    return {
      endpoint: "fal-ai/veo3/fast",
      input: {
        prompt: basePrompt,
        aspect_ratio: ratio,
        duration: videoDuration,
        resolution: res,
        generate_audio
      }
    };
  }

  if (model === "Veo 3 Quality") {
    if (imageDataUrl) {
      return {
        endpoint: "fal-ai/veo3/image-to-video",
        input: {
          prompt: basePrompt,
          image_url: imageDataUrl,
          aspect_ratio: ratio,
          duration: videoDuration,
          resolution: res,
          generate_audio
        }
      };
    }
    return {
      endpoint: "fal-ai/veo3",
      input: {
        prompt: basePrompt,
        aspect_ratio: ratio,
        duration: videoDuration,
        resolution: res,
        generate_audio
      }
    };
  }

  throw new Error(`Неизвестная модель: ${model}`);
}

app.get("/", (req, res) => {
  res.send("MONTIX backend работает 🚀");
});

app.get("/health", (req, res) => {
  res.json({ ok: true, port: PORT, hasFal: Boolean(FAL_KEY), hasSupabase: Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) });
});

app.get("/api/user/:id", async (req, res) => {
  try {
    requireEnv();
    const userId = req.params.id;
    await ensureUser(userId);
    const user = await getUser(userId);
    const history = await getHistory(userId);

    res.json({
      ok: true,
      id: user.id,
      credits: user.credits,
      enhance_credits: user.enhance_credits,
      history
    });
  } catch (error) {
    console.error("GET USER ERROR:", error);
    res.status(500).json({ ok: false, error: error?.message || "User fetch failed" });
  }
});

app.post("/api/enhance", async (req, res) => {
  try {
    requireEnv();
    const { fileDataUrl, mimeType, userId = "test_user", profile = {}, quality = "quality", resolution = "4k" } = req.body || {};

    if (!fileDataUrl) return res.status(400).json({ ok: false, error: "fileDataUrl is required" });
    if (!mimeType || !mimeType.startsWith("image/")) return res.status(400).json({ ok: false, error: "Only image is supported now" });

    await ensureUser(userId, profile);
    const cost = Math.max(1, resolution === "4k" ? 2 : 1);
    const enhanceCreditsAfterSpend = await spendCredits(userId, cost, "enhance");

    const result = await fal.subscribe("fal-ai/nano-banana-2/edit", {
      input: {
        prompt: [
          "Enhance this photo into a higher-quality realistic version.",
          "Preserve the same subject, same composition, same angle, same identity, same clothing, same scene.",
          "Improve sharpness, lighting balance, reflections, micro-details, and overall clarity.",
          `Target quality: ${quality}. Target resolution: ${resolution}.`,
          "Keep it natural, premium, photorealistic, clean, and detailed.",
          "Do not change the person, car, pose, framing, or background drastically.",
          "No extra objects, no stylization, no text, no watermark."
        ].join(" "),
        image_urls: [fileDataUrl],
        output_format: "png",
        aspect_ratio: "1:1"
      },
      logs: true
    });

    const resultUrl = result?.data?.images?.[0]?.url || result?.data?.image?.url || result?.images?.[0]?.url || result?.image?.url || null;
    if (!resultUrl) {
      await refundCredits(userId, cost, "enhance");
      return res.status(500).json({ ok: false, error: "Enhance returned no image URL" });
    }

    await addHistory(userId, {
      type: "enhance",
      model: "Nano Banana 2 Edit",
      prompt: "internal enhance prompt",
      cost,
      resultUrl,
      meta: { quality, resolution, hiddenPrompt: true }
    });

    res.json({ ok: true, result_url: resultUrl, enhance_credits: enhanceCreditsAfterSpend, cost });
  } catch (error) {
    try {
      const { userId = "test_user", resolution = "4k" } = req.body || {};
      const cost = Math.max(1, resolution === "4k" ? 2 : 1);
      await refundCredits(userId, cost, "enhance");
    } catch {}
    console.error("ENHANCE ERROR:", error);
    res.status(500).json({ ok: false, error: error?.message || "Enhance failed" });
  }
});

app.post("/api/generate-image", async (req, res) => {
  try {
    requireEnv();
    const { prompt, model = "Nano Banana Pro", aspectRatio = "1:1", quality = "standard", imageDataUrl, userId = "test_user", profile = {} } = req.body || {};

    if (!prompt || !String(prompt).trim()) {
      return res.status(400).json({ ok: false, error: "Prompt is required" });
    }

    await ensureUser(userId, profile);
    const cost = calculateImageCost({ quality });
    const creditsAfterSpend = await spendCredits(userId, cost, "credits");

    const endpoint = imageModelToEndpoint(model, Boolean(imageDataUrl));
    const input = buildImageInput({ prompt, imageDataUrl, aspectRatio, quality });
    const data = await runFal(endpoint, input);
    const imageUrl = extractImageUrl(data);

    if (!imageUrl) {
      await refundCredits(userId, cost, "credits");
      return res.status(500).json({ ok: false, error: "Image URL not found in model response" });
    }

    await addHistory(userId, {
      type: "image",
      model,
      prompt: String(prompt).trim(),
      cost,
      resultUrl: imageUrl,
      meta: { aspectRatio, quality, resolution: resolutionFromImageQuality(quality) }
    });

    res.json({ ok: true, image: imageUrl, credits: creditsAfterSpend, cost });
  } catch (error) {
    try {
      const { userId = "test_user", quality = "standard" } = req.body || {};
      await refundCredits(userId, calculateImageCost({ quality }), "credits");
    } catch {}
    console.error("IMAGE ERROR:", error);
    res.status(500).json({ ok: false, error: error?.message || "Image generation failed" });
  }
});

app.post("/api/generate-video", async (req, res) => {
  try {
    requireEnv();
    const {
      prompt,
      model = "Kling 3.0",
      duration = 5,
      aspectRatio = "16:9",
      quality = "balanced",
      resolution = "1080p",
      sound = true,
      imageDataUrl,
      endImageDataUrl,
      motionImageDataUrl,
      motionVideoDataUrl,
      sceneControlEnabled = true,
      sceneControlMode = "character",
      orientation = "image",
      userId = "test_user",
      profile = {}
    } = req.body || {};

    if (!prompt || !String(prompt).trim()) {
      return res.status(400).json({ ok: false, error: "Prompt is required" });
    }

    await ensureUser(userId, profile);

    const cost = calculateVideoCost({ model, quality, duration, sound });
    const creditsAfterSpend = await spendCredits(userId, cost, "credits");

    const { endpoint, input } = buildVideoRequest({
      model,
      prompt,
      duration,
      aspectRatio,
      quality,
      resolution,
      sound,
      imageDataUrl,
      endImageDataUrl,
      motionImageDataUrl,
      motionVideoDataUrl,
      sceneControlEnabled,
      sceneControlMode,
      orientation,
      userId
    });

    const data = await runFal(endpoint, input);
    const videoUrl = extractVideoUrl(data);

    if (!videoUrl) {
      await refundCredits(userId, cost, "credits");
      return res.status(500).json({ ok: false, error: "Video URL not found in model response" });
    }

    await addHistory(userId, {
      type: "video",
      model,
      prompt: String(prompt).trim(),
      cost,
      resultUrl: videoUrl,
      meta: {
        duration,
        aspectRatio,
        quality,
        resolution,
        sound,
        sceneControlEnabled,
        sceneControlMode,
        orientation
      }
    });

    res.json({ ok: true, video: videoUrl, credits: creditsAfterSpend, cost, model });
  } catch (error) {
    try {
      const { userId = "test_user", model = "Kling 3.0", quality = "balanced", duration = 5, sound = true } = req.body || {};
      await refundCredits(userId, calculateVideoCost({ model, quality, duration, sound }), "credits");
    } catch {}
    console.error("VIDEO ERROR:", error);
    res.status(500).json({ ok: false, error: error?.message || "Video generation failed" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`MONTIX server running on ${PORT}`);
});
