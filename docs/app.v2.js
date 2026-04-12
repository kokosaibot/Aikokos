console.log("APP V2 LOADED");

const tg = window.Telegram?.WebApp;

if (tg) {
  try {
    tg.ready();
    tg.expand();
  } catch (e) {
    console.warn("Telegram WebApp init warning:", e);
  }
}

const API_BASE = "https://aikokos-production.up.railway.app";
const tgUser = tg?.initDataUnsafe?.user || null;
const userId = tgUser?.id || "test_user";

const state = {
  currentScreen: "home",

  imageModel: "Nano Banana Pro",
  videoModel: "Kling 3.0",

  imageRatio: "Automatic",
  videoRatio: "16:9",
  duration: "5 sec",

  imageQuality: "Standard",
  videoQuality: "Balanced",

  imageHistory: [],
  videoHistory: [],
  enhanceHistory: []
};

const imageModels = [
  "Nano Banana Pro",
  "Nano Banana 2"
];

const videoModels = [
  "Kling 3.0",
  "Kling Motion Control",
  "Kling Edit",
  "Seedance 2.0",
  "Veo 3 Lite",
  "Veo 3 Fast",
  "Veo 3 Quality"
];

const ratios = [
  "Automatic",
  "1:1",
  "2:3",
  "3:2",
  "3:4",
  "4:3",
  "4:5",
  "5:4",
  "9:16",
  "16:9",
  "21:9"
];

const durations = ["5 sec", "8 sec", "10 sec", "12 sec"];

const imageQualityOptions = ["Fast", "Standard", "Quality"];
const videoQualityOptions = ["Fast", "Balanced", "Quality"];

function qs(selector) {
  return document.querySelector(selector);
}

function qsa(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function updateCredits(value) {
  const btn = qs("#openPricingBtn");
  if (!btn || typeof value === "undefined" || value === null) return;
  btn.textContent = `Credits: ${value}`;
}

function syncHistoryFromServer(items) {
  state.imageHistory = items
    .filter((x) => x.type === "image")
    .map((x) => ({
      title: x.prompt?.slice(0, 28) || "image",
      sub: x.model || "image"
    }));

  state.videoHistory = items
    .filter((x) => x.type === "video")
    .map((x) => ({
      title: x.prompt?.slice(0, 28) || "video",
      sub: x.model || "video"
    }));

  state.enhanceHistory = items
    .filter((x) => x.type === "enhance")
    .map((x) => ({
      title: x.prompt?.slice(0, 28) || "enhance",
      sub: x.model || "enhance"
    }));

  renderHistory();
}

async function loadUser() {
  try {
    const response = await fetch(`${API_BASE}/api/user/${userId}`);
    const data = await response.json();

    if (data.ok) {
      updateCredits(data.credits);
      syncHistoryFromServer(data.history || []);
    }
  } catch (e) {
    console.error("loadUser error", e);
  }
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);

    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ensureResultBlocks() {
  const imageScreen = qs("#screen-image");
  const videoScreen = qs("#screen-video");
  const enhanceScreen = qs("#screen-enhance");

  if (imageScreen && !qs("#imageResultBlock")) {
    const block = document.createElement("div");
    block.id = "imageResultBlock";
    block.className = "history-block";
    block.innerHTML = `
      <div class="section-head small-head">
        <h3>Результат</h3>
        <p>Готовая картинка появится здесь</p>
      </div>
      <div id="imageResultContent" style="min-height:120px;display:flex;align-items:center;justify-content:center;color:#9c958d;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:18px;background:rgba(255,255,255,0.02);">
        Пока пусто
      </div>
    `;
    imageScreen.appendChild(block);
  }

  if (videoScreen && !qs("#videoResultBlock")) {
    const block = document.createElement("div");
    block.id = "videoResultBlock";
    block.className = "history-block";
    block.innerHTML = `
      <div class="section-head small-head">
        <h3>Результат</h3>
        <p>Готовое видео появится здесь</p>
      </div>
      <div id="videoResultContent" style="min-height:120px;display:flex;align-items:center;justify-content:center;color:#9c958d;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:18px;background:rgba(255,255,255,0.02);">
        Пока пусто
      </div>
    `;
    videoScreen.appendChild(block);
  }

  if (enhanceScreen && !qs("#enhanceResultBlock")) {
    const block = document.createElement("div");
    block.id = "enhanceResultBlock";
    block.className = "history-block";
    block.innerHTML = `
      <div class="section-head small-head">
        <h3>Результат</h3>
        <p>Улучшенный файл появится здесь</p>
      </div>
      <div id="enhanceResultContent" style="min-height:120px;display:flex;align-items:center;justify-content:center;color:#9c958d;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:18px;background:rgba(255,255,255,0.02);">
        Пока пусто
      </div>
    `;
    enhanceScreen.appendChild(block);
  }
}

function setActiveNav(screen) {
  qsa(".topnav-link").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.screen === screen);
  });
}

function showScreen(screen) {
  state.currentScreen = screen;
  qsa(".screen").forEach((el) => el.classList.remove("active"));

  const target = qs(`#screen-${screen}`);
  if (target) target.classList.add("active");

  setActiveNav(screen);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openModal(id) {
  const modal = qs(`#${id}`);
  if (!modal) return;
  modal.classList.remove("hidden");
  document.body.classList.add("modal-open");
}

function closeModal(id) {
  const modal = qs(`#${id}`);
  if (!modal) return;
  modal.classList.add("hidden");

  const anyOpen = qsa(".modal-backdrop").some((m) => !m.classList.contains("hidden"));
  if (!anyOpen) {
    document.body.classList.remove("modal-open");
  }
}

function renderHistory() {
  const imageGrid = qs("#imageHistoryGrid");
  const videoGrid = qs("#videoHistoryGrid");
  const enhanceGrid = qs("#enhanceHistoryGrid");

  if (imageGrid) {
    imageGrid.innerHTML = state.imageHistory.length
      ? state.imageHistory.map(
          (item) => `
            <div class="history-item interactive">
              <small>${escapeHtml(item.sub)}</small>
              <strong>${escapeHtml(item.title)}</strong>
            </div>
          `
        ).join("")
      : `<div style="color:#9c958d;">История картинок пока пустая</div>`;
  }

  if (videoGrid) {
    videoGrid.innerHTML = state.videoHistory.length
      ? state.videoHistory.map(
          (item) => `
            <div class="history-item interactive">
              <small>${escapeHtml(item.sub)}</small>
              <strong>${escapeHtml(item.title)}</strong>
            </div>
          `
        ).join("")
      : `<div style="color:#9c958d;">История видео пока пустая</div>`;
  }

  if (enhanceGrid) {
    enhanceGrid.innerHTML = state.enhanceHistory.length
      ? state.enhanceHistory.map(
          (item) => `
            <div class="history-item interactive">
              <small>${escapeHtml(item.sub)}</small>
              <strong>${escapeHtml(item.title)}</strong>
            </div>
          `
        ).join("")
      : `<div style="color:#9c958d;">История enhance пока пустая</div>`;
  }
}

function buildDownloadButton(url, fileName) {
  return `
    <a href="${url}" download="${fileName}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">
      <button class="gold-btn" style="margin-top:12px;">Скачать</button>
    </a>
  `;
}

function renderImageResult(url) {
  const block = qs("#imageResultContent");
  if (!block) return;

  if (!url) {
    block.innerHTML = "⚠️ Нет изображения в ответе";
    return;
  }

  block.innerHTML = `
    <div style="width:100%;text-align:center;">
      <img
        src="${url}"
        alt="result"
        style="width:100%;max-width:720px;display:block;margin:0 auto;border-radius:18px;"
      />
      ${buildDownloadButton(url, "image-result.png")}
    </div>
  `;
}

function renderVideoResult(url) {
  const block = qs("#videoResultContent");
  if (!block) return;

  if (!url) {
    block.innerHTML = "⚠️ Нет видео в ответе";
    return;
  }

  block.innerHTML = `
    <div style="width:100%;text-align:center;">
      <video
        src="${url}"
        controls
        playsinline
        style="width:100%;max-width:720px;display:block;margin:0 auto;border-radius:18px;"
      ></video>
      ${buildDownloadButton(url, "video-result.mp4")}
    </div>
  `;
}

function renderEnhanceResult({ originalUrl, resultUrl, isFallback = false }) {
  const block = qs("#enhanceResultContent");
  if (!block) return;

  if (!resultUrl) {
    block.innerHTML = "⚠️ Нет результата в ответе";
    return;
  }

  const sameAsOriginal = originalUrl && resultUrl === originalUrl;

  if (!sameAsOriginal && originalUrl) {
    block.innerHTML = `
      <div style="width:100%;">
        <div style="margin-bottom:12px;color:#c8c1b8;text-align:center;">
          Сравнение до и после
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;">
          <div>
            <div style="margin-bottom:8px;color:#9c958d;text-align:center;">До</div>
            <img
              src="${originalUrl}"
              alt="before"
              style="width:100%;display:block;border-radius:18px;"
            />
          </div>

          <div>
            <div style="margin-bottom:8px;color:#9c958d;text-align:center;">После</div>
            <img
              src="${resultUrl}"
              alt="after"
              style="width:100%;display:block;border-radius:18px;"
            />
          </div>
        </div>

        <div style="text-align:center;">
          ${buildDownloadButton(resultUrl, "enhanced-image.png")}
        </div>
      </div>
    `;
    return;
  }

  block.innerHTML = `
    <div style="width:100%;text-align:center;">
      <div style="margin-bottom:10px;color:#c8c1b8;">
        ${isFallback || sameAsOriginal ? "Сервер не вернул отдельный улучшенный файл. Сейчас показан исходник." : "Результат enhance готов."}
      </div>
      <img
        src="${resultUrl}"
        alt="enhanced-result"
        style="width:100%;max-width:720px;display:block;margin:0 auto;border-radius:18px;"
      />
      ${buildDownloadButton(resultUrl, "enhanced-image.png")}
    </div>
  `;
}

function bindNavigation() {
  qsa(".topnav-link").forEach((btn) => {
    btn.addEventListener("click", () => showScreen(btn.dataset.screen));
  });

  qsa("[data-go]").forEach((btn) => {
    btn.addEventListener("click", () => showScreen(btn.dataset.go));
  });

  qs("#openProfileBtn")?.addEventListener("click", () => showScreen("profile"));
  qs("#openPricingBtn")?.addEventListener("click", () => openModal("pricingModal"));
}

function updateFileName(inputSelector, outputSelector) {
  const input = qs(inputSelector);
  const output = qs(outputSelector);
  if (!input || !output) return;

  input.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    output.textContent = file ? file.name : "Файл не выбран";
  });
}

function renderModelOptions(type) {
  const list = qs("#modelModalList");
  const title = qs("#modelModalTitle");
  if (!list || !title) return;

  const models = type === "image" ? imageModels : videoModels;
  const selected = type === "image" ? state.imageModel : state.videoModel;

  title.textContent = type === "image" ? "Выбор модели изображения" : "Выбор модели видео";

  list.innerHTML = models.map(
    (model) => `
      <button class="modal-option ${selected === model ? "selected" : ""}" data-model-type="${type}" data-model-value="${model}">
        <span>${escapeHtml(model)}</span>
        <span>${selected === model ? "✓" : ""}</span>
      </button>
    `
  ).join("");

  qsa("[data-model-type]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const value = btn.dataset.modelValue;

      if (type === "image") {
        state.imageModel = value;
        qs("#imageModelLabel").textContent = value;
      } else {
        state.videoModel = value;
        qs("#videoModelLabel").textContent = value;
      }

      closeModal("modelModal");
    });
  });
}

function renderRatioOptions(type) {
  const list = qs("#ratioModalList");
  if (!list) return;

  const selected = type === "image" ? state.imageRatio : state.videoRatio;

  list.innerHTML = ratios.map(
    (ratio) => `
      <button class="modal-option ${selected === ratio ? "selected" : ""}" data-ratio-type="${type}" data-ratio-value="${ratio}">
        <span>${escapeHtml(ratio)}</span>
        <span>${selected === ratio ? "✓" : ""}</span>
      </button>
    `
  ).join("");

  qsa("[data-ratio-type]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const value = btn.dataset.ratioValue;

      if (type === "image") {
        state.imageRatio = value;
        qs("#ratioImageLabel").textContent = value;
      } else {
        state.videoRatio = value;
        qs("#ratioVideoLabel").textContent = value;
      }

      closeModal("ratioModal");
    });
  });
}

function renderDurationOptions() {
  const list = qs("#durationModalList");
  if (!list) return;

  list.innerHTML = durations.map(
    (item) => `
      <button class="modal-option ${state.duration === item ? "selected" : ""}" data-duration-value="${item}">
        <span>${escapeHtml(item)}</span>
        <span>${state.duration === item ? "✓" : ""}</span>
      </button>
    `
  ).join("");

  qsa("[data-duration-value]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const value = btn.dataset.durationValue;
      state.duration = value;
      qs("#durationLabel").textContent = value;
      closeModal("durationModal");
    });
  });
}

function renderQualityOptions(type) {
  const list = qs("#modelModalList");
  const title = qs("#modelModalTitle");
  if (!list || !title) return;

  const options = type === "image" ? imageQualityOptions : videoQualityOptions;
  const selected = type === "image" ? state.imageQuality : state.videoQuality;

  title.textContent = type === "image" ? "Качество изображения" : "Качество видео";

  list.innerHTML = options.map(
    (item) => `
      <button class="modal-option ${selected === item ? "selected" : ""}" data-quality-type="${type}" data-quality-value="${item}">
        <span>${escapeHtml(item)}</span>
        <span>${selected === item ? "✓" : ""}</span>
      </button>
    `
  ).join("");

  qsa("[data-quality-type]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const typeValue = btn.dataset.qualityType;
      const value = btn.dataset.qualityValue;

      if (typeValue === "image") {
        state.imageQuality = value;
        qs("#imageQualityLabel").textContent = value;
      } else {
        state.videoQuality = value;
        qs("#videoQualityLabel").textContent = value;
      }

      closeModal("modelModal");
    });
  });
}

function bindModals() {
  qs("#imageModelBtn")?.addEventListener("click", () => {
    renderModelOptions("image");
    openModal("modelModal");
  });

  qs("#videoModelBtn")?.addEventListener("click", () => {
    renderModelOptions("video");
    openModal("modelModal");
  });

  qs("#ratioBtnImage")?.addEventListener("click", () => {
    renderRatioOptions("image");
    openModal("ratioModal");
  });

  qs("#ratioBtnVideo")?.addEventListener("click", () => {
    renderRatioOptions("video");
    openModal("ratioModal");
  });

  qs("#durationBtn")?.addEventListener("click", () => {
    renderDurationOptions();
    openModal("durationModal");
  });

  qs("#imageQualityBtn")?.addEventListener("click", () => {
    renderQualityOptions("image");
    openModal("modelModal");
  });

  qs("#videoQualityBtn")?.addEventListener("click", () => {
    renderQualityOptions("video");
    openModal("modelModal");
  });

  qsa("[data-close]").forEach((btn) => {
    btn.addEventListener("click", () => closeModal(btn.dataset.close));
  });

  qsa(".modal-backdrop").forEach((backdrop) => {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        backdrop.classList.add("hidden");
        document.body.classList.remove("modal-open");
      }
    });
  });
}

function bindExpand() {
  const btn = qs("#expandBtn");
  const area = qs("#expandArea");
  const text = qs("#expandBtnText");
  if (!btn || !area || !text) return;

  btn.addEventListener("click", () => {
    const isHidden = area.classList.contains("hidden");
    area.classList.toggle("hidden");
    text.textContent = isHidden ? "Свернуть" : "Развернуть";
  });
}

async function generateImageReal({ prompt, model, aspectRatio, quality, imageDataUrl }) {
  const response = await fetch(`${API_BASE}/api/generate-image`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": String(userId)
    },
    body: JSON.stringify({
      prompt,
      model,
      aspectRatio,
      quality,
      imageDataUrl,
      userId,
      profile: {
        username: tgUser?.username || null,
        first_name: tgUser?.first_name || null,
        last_name: tgUser?.last_name || null
      }
    })
  });

  return await response.json();
}

async function generateVideoReal({
  prompt,
  model,
  duration,
  aspect_ratio,
  quality,
  startImageDataUrl,
  endImageDataUrl
}) {
  const response = await fetch(`${API_BASE}/api/generate-video`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": String(userId)
    },
    body: JSON.stringify({
      prompt,
      model,
      duration,
      aspect_ratio,
      quality,
      startImageDataUrl,
      endImageDataUrl,
      userId,
      profile: {
        username: tgUser?.username || null,
        first_name: tgUser?.first_name || null,
        last_name: tgUser?.last_name || null
      }
    })
  });

  return await response.json();
}

async function enhanceFileReal({ fileDataUrl, mimeType }) {
  const response = await fetch(`${API_BASE}/api/enhance`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": String(userId)
    },
    body: JSON.stringify({
      fileDataUrl,
      mimeType,
      userId,
      profile: {
        username: tgUser?.username || null,
        first_name: tgUser?.first_name || null,
        last_name: tgUser?.last_name || null
      }
    })
  });

  return await response.json();
}

function extractImageUrl(data) {
  return (
    data?.image ||
    data?.result?.images?.[0]?.url ||
    data?.images?.[0]?.url ||
    null
  );
}

function extractVideoUrl(data) {
  return (
    data?.video ||
    data?.video_url ||
    data?.result?.video?.url ||
    data?.videos?.[0]?.url ||
    null
  );
}

function extractEnhanceUrl(data) {
  return (
    data?.result_url ||
    data?.file_url ||
    data?.image ||
    data?.result?.images?.[0]?.url ||
    data?.images?.[0]?.url ||
    null
  );
}

function bindGenerators() {
  qs("#generateImageBtn")?.addEventListener("click", async () => {
    const prompt = qs("#imagePrompt")?.value?.trim();
    const imageFile = qs("#imageUpload")?.files?.[0] || null;

    if (!prompt) {
      showToast("Сначала напиши prompt");
      return;
    }

    const btn = qs("#generateImageBtn");
    const oldText = btn.textContent;
    btn.textContent = "Generating...";
    btn.disabled = true;

    try {
      const imageDataUrl = imageFile ? await fileToDataURL(imageFile) : null;

      const data = await generateImageReal({
        prompt,
        model: state.imageModel,
        aspectRatio: state.imageRatio,
        quality: state.imageQuality,
        imageDataUrl
      });

      if (!data.ok) {
        throw new Error(typeof data.error === "string" ? data.error : JSON.stringify(data.error || "Image generation failed"));
      }

      const imageUrl = extractImageUrl(data);
      renderImageResult(imageUrl);

      if (typeof data.credits !== "undefined") updateCredits(data.credits);

      state.imageHistory.unshift({
        title: prompt.slice(0, 28),
        sub: `${state.imageModel} • ${state.imageQuality}`
      });
      state.imageHistory = state.imageHistory.slice(0, 9);
      renderHistory();

      showToast(imageUrl ? "Картинка готова" : "Ответ получен");
    } catch (error) {
      console.error(error);
      showToast(`Ошибка: ${error.message}`);
    } finally {
      btn.textContent = oldText;
      btn.disabled = false;
    }
  });

  qs("#generateVideoBtn")?.addEventListener("click", async () => {
    const prompt = qs("#videoPrompt")?.value?.trim();
    const startFile = qs("#videoStartUpload")?.files?.[0] || null;
    const endFile = qs("#videoEndUpload")?.files?.[0] || null;

    if (!prompt) {
      showToast("Сначала напиши prompt");
      return;
    }

    const btn = qs("#generateVideoBtn");
    const oldText = btn.textContent;
    btn.textContent = "Generating...";
    btn.disabled = true;

    try {
      const startImageDataUrl = startFile ? await fileToDataURL(startFile) : null;
      const endImageDataUrl = endFile ? await fileToDataURL(endFile) : null;

      const data = await generateVideoReal({
        prompt,
        model: state.videoModel,
        duration: state.duration.replace(" sec", ""),
        aspect_ratio: state.videoRatio,
        quality: state.videoQuality,
        startImageDataUrl,
        endImageDataUrl
      });

      if (!data.ok) {
        throw new Error(typeof data.error === "string" ? data.error : JSON.stringify(data.error || "Video generation failed"));
      }

      const videoUrl = extractVideoUrl(data);
      renderVideoResult(videoUrl);

      if (typeof data.credits !== "undefined") updateCredits(data.credits);

      state.videoHistory.unshift({
        title: prompt.slice(0, 28),
        sub: `${state.videoModel} • ${state.videoQuality}`
      });
      state.videoHistory = state.videoHistory.slice(0, 9);
      renderHistory();

      showToast(videoUrl ? "Видео готово" : "Видео отправлено");
    } catch (error) {
      console.error(error);
      showToast(`Ошибка: ${error.message}`);
    } finally {
      btn.textContent = oldText;
      btn.disabled = false;
    }
  });

  qs("#generateEnhanceBtn")?.addEventListener("click", async () => {
    const file = qs("#enhanceUpload")?.files?.[0] || null;

    if (!file) {
      showToast("Сначала загрузи фото");
      return;
    }

    const btn = qs("#generateEnhanceBtn");
    const oldText = btn.textContent;
    btn.textContent = "Enhancing...";
    btn.disabled = true;

    try {
      const fileDataUrl = await fileToDataURL(file);
      const mimeType = file.type || "";

      const data = await enhanceFileReal({
        fileDataUrl,
        mimeType
      });

      if (!data.ok) {
        throw new Error(typeof data.error === "string" ? data.error : JSON.stringify(data.error || "Enhance failed"));
      }

      const resultUrl = extractEnhanceUrl(data);
      const isFallback = !resultUrl;

      renderEnhanceResult({
        originalUrl: fileDataUrl,
        resultUrl: resultUrl || fileDataUrl,
        isFallback
      });

      state.enhanceHistory.unshift({
        title: "Photo enhance",
        sub: "Nano Banana 2 Edit"
      });
      state.enhanceHistory = state.enhanceHistory.slice(0, 9);
      renderHistory();

      showToast(resultUrl ? "Фото улучшено 🔥" : "Сервер не вернул новый файл");
    } catch (error) {
      console.error(error);
      showToast(`Ошибка: ${error.message}`);
    } finally {
      btn.textContent = oldText;
      btn.disabled = false;
    }
  });
}

function bindLibraryButtons() {
  qs("#openHistoryImage")?.addEventListener("click", () => {
    qs("#imageHistoryGrid")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  qs("#openHistoryVideo")?.addEventListener("click", () => {
    qs("#videoHistoryGrid")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  qs("#openHistoryEnhance")?.addEventListener("click", () => {
    qs("#enhanceHistoryGrid")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function bindProfile() {
  const avatarInput = qs("#avatarInput");
  const avatarPreview = qs("#avatarPreview");
  const nick = qs("#nicknameInput");
  const hidePromptToggle = qs("#hidePromptToggle");
  const templatePreview = qs("#templatePreview");

  avatarInput?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file || !avatarPreview) return;
    avatarPreview.textContent = "✓";
  });

  nick?.addEventListener("input", () => {
    const value = nick.value.trim() || "kokos_edit";
    const profileBtn = qs("#openProfileBtn");
    if (profileBtn) profileBtn.textContent = value.slice(0, 1).toUpperCase();
  });

  hidePromptToggle?.addEventListener("change", () => {
    if (!templatePreview) return;

    if (hidePromptToggle.checked) {
      templatePreview.textContent = "prompt: ******** ******** ****** ** ******";
    } else {
      templatePreview.textContent = "prompt: cinematic luxury car in studio";
    }
  });

  qs("#saveProfileBtn")?.addEventListener("click", () => {
    showToast("Профиль сохранен");
  });
}

function showToast(text) {
  let toast = qs("#appToast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "appToast";
    toast.style.position = "fixed";
    toast.style.left = "50%";
    toast.style.bottom = "22px";
    toast.style.transform = "translateX(-50%)";
    toast.style.zIndex = "100";
    toast.style.padding = "12px 16px";
    toast.style.borderRadius = "14px";
    toast.style.background = "rgba(20,20,20,0.92)";
    toast.style.border = "1px solid rgba(255,255,255,0.08)";
    toast.style.color = "#f5f1ea";
    toast.style.boxShadow = "0 12px 30px rgba(0,0,0,0.25)";
    toast.style.transition = "opacity 0.2s ease";
    document.body.appendChild(toast);
  }

  toast.textContent = text;
  toast.style.opacity = "1";

  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toast.style.opacity = "0";
  }, 2200);
}

function init() {
  ensureResultBlocks();
  bindNavigation();
  bindModals();
  bindExpand();
  bindGenerators();
  bindLibraryButtons();
  bindProfile();

  updateFileName("#imageUpload", "#imageUploadMeta");
  updateFileName("#videoStartUpload", "#videoStartMeta");
  updateFileName("#videoEndUpload", "#videoEndMeta");
  updateFileName("#enhanceUpload", "#enhanceUploadMeta");

  if (qs("#imageModelLabel")) qs("#imageModelLabel").textContent = state.imageModel;
  if (qs("#videoModelLabel")) qs("#videoModelLabel").textContent = state.videoModel;
  if (qs("#ratioImageLabel")) qs("#ratioImageLabel").textContent = state.imageRatio;
  if (qs("#ratioVideoLabel")) qs("#ratioVideoLabel").textContent = state.videoRatio;
  if (qs("#durationLabel")) qs("#durationLabel").textContent = state.duration;
  if (qs("#imageQualityLabel")) qs("#imageQualityLabel").textContent = state.imageQuality;
  if (qs("#videoQualityLabel")) qs("#videoQualityLabel").textContent = state.videoQuality;

  renderHistory();
  showScreen("home");
  loadUser();
}

document.addEventListener("DOMContentLoaded", init);
