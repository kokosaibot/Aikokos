console.log("MONTIX release loaded");

const tg = window.Telegram?.WebApp;
if (tg) {
  try {
    tg.ready();
    tg.expand();
  } catch (error) {
    console.warn("Telegram init warning", error);
  }
}

const API_BASE = "https://aikokos-production.up.railway.app";
const tgUser = tg?.initDataUnsafe?.user || null;
const userId = tgUser?.id || "test_user";

const imageModels = ["Nano Banana Pro", "Nano Banana 2"];
const videoModels = ["Kling 3.0", "Kling Motion Control", "Kling Edit", "Seedance 2.0", "Veo 3 Lite", "Veo 3 Fast", "Veo 3 Quality"];
const imageRatios = ["1:1", "3:4", "4:5", "9:16", "16:9"];
const videoRatios = ["16:9", "9:16", "1:1"];
const durations = ["5 sec", "6 sec", "8 sec", "10 sec"];
const imageQualities = ["1K", "2K", "4K"];
const videoQualities = ["Fast", "Balanced", "Quality"];
const enhanceQualities = ["2K", "4K"];
const enhanceResolutions = ["2k", "4k"];
const videoResolutions = {
  "Kling 3.0": ["720p", "1080p"],
  "Kling Motion Control": ["720p", "1080p"],
  "Kling Edit": ["720p", "1080p"],
  "Seedance 2.0": ["720p", "1080p"],
  "Veo 3 Lite": ["720p", "1080p"],
  "Veo 3 Fast": ["720p", "1080p"],
  "Veo 3 Quality": ["1080p"]
};

const state = {
  currentScreen: "home",
  imageModel: "Nano Banana Pro",
  imageRatio: "1:1",
  imageQuality: "Standard",
  videoModel: "Kling 3.0",
  videoRatio: "16:9",
  videoQuality: "Balanced",
  videoDuration: "5 sec",
  videoResolution: "1080p",
  videoSound: true,
  enhanceQuality: "Quality",
  enhanceResolution: "4k",
  history: { image: [], video: [], enhance: [] },
  videoSettings: {
    genericImageFile: null,
    genericEndImageFile: null,
    motionImageFile: null,
    motionVideoFile: null,
    sceneControlEnabled: true,
    sceneControlMode: "character",
    orientation: "image"
  }
};

function qs(selector) { return document.querySelector(selector); }
function qsa(selector) { return Array.from(document.querySelectorAll(selector)); }
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function showToast(text) {
  let toast = qs("#appToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "appToast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2400);
}

function updateCredits(value) {
  const btn = qs("#openPricingBtn");
  if (btn && value !== undefined && value !== null) btn.textContent = `Credits: ${value}`;
}

function openModal(id) {
  const el = qs(`#${id}`);
  if (!el) return;
  el.classList.remove("hidden");
  document.body.classList.add("modal-open");
}

function closeModal(id) {
  const el = qs(`#${id}`);
  if (!el) return;
  el.classList.add("hidden");
  if (!qsa(".modal-backdrop").some((x) => !x.classList.contains("hidden"))) {
    document.body.classList.remove("modal-open");
  }
}

function setActiveNav(screen) {
  qsa(".topnav-link").forEach((btn) => btn.classList.toggle("active", btn.dataset.screen === screen));
}

function showScreen(screen) {
  state.currentScreen = screen;
  qsa(".screen").forEach((el) => el.classList.remove("active"));
  qs(`#screen-${screen}`)?.classList.add("active");
  setActiveNav(screen);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderHistory() {
  const render = (id, items, emptyText) => {
    const container = qs(id);
    if (!container) return;
    if (!items.length) {
      container.innerHTML = `<div class="history-empty">${emptyText}</div>`;
      return;
    }
    container.innerHTML = items.map((item) => `
      <article class="history-item glass">
        <small>${escapeHtml(item.sub)}</small>
        <strong>${escapeHtml(item.title)}</strong>
      </article>
    `).join("");
  };

  render("#imageHistoryGrid", state.history.image, "История изображений пока пустая");
  render("#videoHistoryGrid", state.history.video, "История видео пока пустая");
  render("#enhanceHistoryGrid", state.history.enhance, "История enhance пока пустая");
}

function syncHistoryFromServer(items) {
  state.history.image = items.filter((x) => x.type === "image").map((x) => ({
    title: x.prompt?.slice(0, 34) || "image",
    sub: `${x.model || "image"} • ${x.cost || 0} cr`
  }));
  state.history.video = items.filter((x) => x.type === "video").map((x) => ({
    title: x.prompt?.slice(0, 34) || "video",
    sub: `${x.model || "video"} • ${x.cost || 0} cr`
  }));
  state.history.enhance = items.filter((x) => x.type === "enhance").map((x) => ({
    title: "Photo enhance",
    sub: `${x.model || "enhance"} • ${x.cost || 0} cr`
  }));
  renderHistory();
}

async function loadUser() {
  try {
    const res = await fetch(`${API_BASE}/api/user/${userId}`);
    const data = await res.json();
    if (data.ok) {
      updateCredits(data.credits);
      syncHistoryFromServer(data.history || []);
    }
  } catch (error) {
    console.error(error);
  }
}

function updateFileMeta(id, file) {
  const el = qs(id);
  if (el) el.textContent = file ? `${file.name} • ${formatBytes(file.size || 0)}` : "Файл не выбран";
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size >= 100 ? 0 : size >= 10 ? 1 : 2)} ${units[unit]}`;
}

function showProgress(wrapId, barId, textId, value) {
  const wrap = qs(wrapId);
  const bar = qs(barId);
  const text = qs(textId);
  if (wrap) wrap.classList.remove("hidden");
  if (bar) bar.style.width = `${Math.max(0, Math.min(100, value))}%`;
  if (text) text.textContent = `${Math.round(value)}%`;
}

function hideProgress(wrapId) {
  const wrap = qs(wrapId);
  if (wrap) wrap.classList.add("hidden");
}

function startPanelProgress(kind, startText) {
  const panel = qs(`#${kind}GenerationPanel`);
  const bar = qs(`#${kind}GenerationBar`);
  const percent = qs(`#${kind}GenerationPercent`);
  const status = qs(`#${kind}GenerationStatus`);
  if (panel) panel.classList.remove("hidden");
  let current = 0;
  if (bar) bar.style.width = "0%";
  if (percent) percent.textContent = "0%";
  if (status) status.textContent = startText;

  const timer = setInterval(() => {
    const target = current < 40 ? current + 7 : current < 70 ? current + 4 : current < 92 ? current + 1.5 : current;
    current = Math.min(92, target);
    if (bar) bar.style.width = `${current}%`;
    if (percent) percent.textContent = `${Math.round(current)}%`;
    if (status) {
      status.textContent = current < 30
        ? "Загрузка запроса"
        : current < 65
        ? "Обработка моделью"
        : "Финализация результата";
    }
  }, 350);

  return {
    finish(message = "Готово") {
      clearInterval(timer);
      if (bar) bar.style.width = "100%";
      if (percent) percent.textContent = "100%";
      if (status) status.textContent = message;
    },
    fail(message = "Ошибка") {
      clearInterval(timer);
      if (status) status.textContent = message;
    }
  };
}

function bindNavigation() {
  qsa(".topnav-link").forEach((btn) => btn.addEventListener("click", () => showScreen(btn.dataset.screen)));
  qsa("[data-go]").forEach((btn) => btn.addEventListener("click", () => showScreen(btn.dataset.go)));
  qs("#openProfileBtn")?.addEventListener("click", () => showScreen("profile"));
  qs("#openPricingBtn")?.addEventListener("click", () => openModal("pricingModal"));
  qsa("[data-close]").forEach((btn) => btn.addEventListener("click", () => closeModal(btn.dataset.close)));
  qsa(".modal-backdrop").forEach((bg) => bg.addEventListener("click", (e) => {
    if (e.target === bg) bg.classList.add("hidden");
    if (!qsa(".modal-backdrop").some((x) => !x.classList.contains("hidden"))) document.body.classList.remove("modal-open");
  }));
}

function openSelectionModal(title, options, onSelect) {
  qs("#selectionModalTitle").textContent = title;
  qs("#selectionModalList").innerHTML = options.map((option) => `
    <button class="modal-option glass" data-value="${escapeHtml(option)}">
      <span>${escapeHtml(option)}</span>
      <span>✓</span>
    </button>
  `).join("");

  qsa("#selectionModalList .modal-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      onSelect(btn.dataset.value);
      closeModal("selectionModal");
    });
  });

  openModal("selectionModal");
}

function refreshLabels() {
  qs("#imageModelLabel").textContent = state.imageModel;
  qs("#imageQualityLabel").textContent = state.imageQuality;
  qs("#ratioImageLabel").textContent = state.imageRatio;
  qs("#videoModelLabel").textContent = state.videoModel;
  qs("#videoQualityLabel").textContent = state.videoQuality;
  qs("#ratioVideoLabel").textContent = state.videoRatio;
  qs("#durationLabel").textContent = state.videoDuration;
  qs("#videoResolutionLabel").textContent = state.videoResolution;
  qs("#enhanceQualityLabel").textContent = state.enhanceQuality;
  qs("#enhanceResolutionLabel").textContent = state.enhanceResolution;
  updateCostLabels();
}

function updateCostLabels() {
  const imageCost = state.imageQuality === "4K" ? 3 : state.imageQuality === "2K" ? 2 : 1;
  qs("#imageCostLabel").textContent = `Стоимость: ${imageCost} credits`;

  let videoCost = 8;
  if (state.videoModel === "Kling Motion Control") videoCost = 10;
  if (state.videoModel === "Veo 3 Quality") videoCost = 16;
  if (state.videoModel === "Veo 3 Fast" || state.videoModel === "Veo 3 Lite") videoCost = 10;
  if (state.videoModel === "Seedance 2.0") videoCost = 9;
  if (state.videoQuality === "Quality") videoCost += 4;
  if (state.videoQuality === "Fast") videoCost -= 1;
  const seconds = Number(state.videoDuration.replace(/\D/g, "")) || 5;
  if (seconds >= 8) videoCost += 2;
  if (seconds >= 10) videoCost += 2;
  if (state.videoSound) videoCost += 2;
  qs("#videoCostLabel").textContent = `Стоимость: ${Math.max(4, videoCost)} credits`;

  const enhanceCost = state.enhanceResolution === "4k" ? 2 : 1;
  qs("#enhanceCostLabel").textContent = `Стоимость: ${enhanceCost} enhance credits`;
}

function bindPickers() {
  qs("#imageModelBtn")?.addEventListener("click", () => openSelectionModal("Image model", imageModels, (value) => {
    state.imageModel = value;
    refreshLabels();
  }));
  qs("#imageQualityBtn")?.addEventListener("click", () => openSelectionModal("Image quality", imageQualities, (value) => {
    state.imageQuality = value;
    refreshLabels();
  }));
  qs("#ratioBtnImage")?.addEventListener("click", () => openSelectionModal("Image ratio", imageRatios, (value) => {
    state.imageRatio = value;
    refreshLabels();
  }));

  qs("#videoModelBtn")?.addEventListener("click", () => openSelectionModal("Video model", videoModels, (value) => {
    state.videoModel = value;
    const allowed = videoResolutions[value] || ["1080p"];
    if (!allowed.includes(state.videoResolution)) state.videoResolution = allowed[0];
    renderVideoModelFields();
    refreshLabels();
  }));
  qs("#videoQualityBtn")?.addEventListener("click", () => openSelectionModal("Video quality", videoQualities, (value) => {
    state.videoQuality = value;
    refreshLabels();
  }));
  qs("#ratioBtnVideo")?.addEventListener("click", () => openSelectionModal("Video ratio", videoRatios, (value) => {
    state.videoRatio = value;
    refreshLabels();
  }));
  qs("#durationBtn")?.addEventListener("click", () => openSelectionModal("Duration", durations, (value) => {
    state.videoDuration = value;
    refreshLabels();
  }));
  qs("#videoResolutionBtn")?.addEventListener("click", () => openSelectionModal("Video resolution", videoResolutions[state.videoModel] || ["1080p"], (value) => {
    state.videoResolution = value;
    refreshLabels();
  }));

  qs("#enhanceQualityBtn")?.addEventListener("click", () => openSelectionModal("Enhance quality", enhanceQualities, (value) => {
    state.enhanceQuality = value;
    refreshLabels();
  }));
  qs("#enhanceResolutionBtn")?.addEventListener("click", () => openSelectionModal("Enhance resolution", enhanceResolutions, (value) => {
    state.enhanceResolution = value;
    refreshLabels();
  }));
}

function bindUploadInputs() {
  qs("#imageUpload")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0] || null;
    updateFileMeta("#imageUploadMeta", file);
  });
  qs("#enhanceUpload")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0] || null;
    updateFileMeta("#enhanceUploadMeta", file);
  });
}

function bindSoundToggle() {
  qsa("#soundToggle .seg-btn").forEach((btn) => btn.addEventListener("click", () => {
    state.videoSound = btn.dataset.sound === "on";
    qsa("#soundToggle .seg-btn").forEach((x) => x.classList.toggle("active", x === btn));
    updateCostLabels();
  }));
}

function renderVideoModelFields() {
  const root = qs("#videoModelFields");
  if (!root) return;

  if (state.videoModel === "Kling Motion Control") {
    root.innerHTML = `
      <div class="grid-two">
        <div class="field">
          <label>Reference video</label>
          <label class="upload-drop" for="motionVideoUpload">
            <input type="file" id="motionVideoUpload" accept="video/*" />
            <span>Сначала загрузи видео</span>
          </label>
          <div class="file-meta" id="motionVideoMeta">Файл не выбран</div>
          <div class="progress-wrap hidden" id="motionVideoProgressWrap">
            <div class="progress-track"><div class="progress-fill" id="motionVideoProgressBar"></div></div>
            <div class="progress-meta"><span>Upload</span><span id="motionVideoProgressText">0%</span></div>
          </div>
        </div>
        <div class="field">
          <label>Character image</label>
          <label class="upload-drop" for="motionImageUpload">
            <input type="file" id="motionImageUpload" accept="image/*" />
            <span>Потом загрузи фото</span>
          </label>
          <div class="file-meta" id="motionImageMeta">Файл не выбран</div>
          <div class="progress-wrap hidden" id="motionImageProgressWrap">
            <div class="progress-track"><div class="progress-fill" id="motionImageProgressBar"></div></div>
            <div class="progress-meta"><span>Upload</span><span id="motionImageProgressText">0%</span></div>
          </div>
        </div>
      </div>

      <div class="grid-two mobile-gap">
        <div class="field">
          <label>Scene control mode</label>
          <div class="toggle-card glass">
            <div>
              <strong id="sceneControlStateLabel">Enabled</strong>
              <p>Выбор источника фона</p>
            </div>
            <button class="ios-switch ${state.videoSettings.sceneControlEnabled ? "on" : ""}" id="sceneControlSwitch" type="button"><span></span></button>
          </div>
        </div>
        <div class="field">
          <label>Background source</label>
          <div class="segmented" id="sceneControlModeSegment">
            <button class="seg-btn ${state.videoSettings.sceneControlMode === "character" ? "active" : ""}" data-scene-mode="character">Image character</button>
            <button class="seg-btn ${state.videoSettings.sceneControlMode === "video" ? "active" : ""}" data-scene-mode="video">Video layer</button>
          </div>
        </div>
      </div>

      <div class="conditional-wrap ${state.videoSettings.sceneControlEnabled ? "hidden" : ""}" id="sceneControlConditional">
        <div class="field">
          <label>Scene prompt</label>
          <textarea id="scenePrompt" class="text-area small" placeholder="Если scene control выключен, тут можно детальнее описать сцену."></textarea>
        </div>
        <div class="field">
          <label>Orientation</label>
          <div class="segmented" id="orientationSegment">
            <button class="seg-btn ${state.videoSettings.orientation === "video" ? "active" : ""}" data-orientation="video">Match video</button>
            <button class="seg-btn ${state.videoSettings.orientation === "image" ? "active" : ""}" data-orientation="image">Match image</button>
          </div>
          <div class="help-text">Video — лучше для сложных движений. Image — лучше для движения камеры.</div>
        </div>
      </div>
    `;
  } else {
    const needsTwoFrames = state.videoModel === "Kling 3.0" || state.videoModel === "Kling Edit";
    root.innerHTML = `
      <div class="grid-two">
        <div class="field">
          <label>${state.videoModel.includes("Veo") || state.videoModel === "Seedance 2.0" ? "Image / start frame" : "Start frame"}</label>
          <label class="upload-drop" for="genericImageUpload">
            <input type="file" id="genericImageUpload" accept="image/*" />
            <span>Загрузить изображение</span>
          </label>
          <div class="file-meta" id="genericImageMeta">Файл не выбран</div>
          <div class="progress-wrap hidden" id="genericImageProgressWrap">
            <div class="progress-track"><div class="progress-fill" id="genericImageProgressBar"></div></div>
            <div class="progress-meta"><span>Upload</span><span id="genericImageProgressText">0%</span></div>
          </div>
        </div>
        ${needsTwoFrames ? `
        <div class="field">
          <label>End frame</label>
          <label class="upload-drop" for="genericEndImageUpload">
            <input type="file" id="genericEndImageUpload" accept="image/*" />
            <span>Необязательно</span>
          </label>
          <div class="file-meta" id="genericEndImageMeta">Файл не выбран</div>
          <div class="progress-wrap hidden" id="genericEndImageProgressWrap">
            <div class="progress-track"><div class="progress-fill" id="genericEndImageProgressBar"></div></div>
            <div class="progress-meta"><span>Upload</span><span id="genericEndImageProgressText">0%</span></div>
          </div>
        </div>` : `<div class="field field-note"><div class="note-box glass">Для этой модели достаточно одного изображения. У Veo image-to-video fal принимает prompt, image_url, aspect_ratio, duration и resolution. citeturn210878search4turn210878search2</div></div>`}
      </div>
    `;
  }

  bindDynamicVideoInputs();
}

function bindDynamicVideoInputs() {
  qs("#genericImageUpload")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0] || null;
    state.videoSettings.genericImageFile = file;
    updateFileMeta("#genericImageMeta", file);
  });

  qs("#genericEndImageUpload")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0] || null;
    state.videoSettings.genericEndImageFile = file;
    updateFileMeta("#genericEndImageMeta", file);
  });

  qs("#motionImageUpload")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0] || null;
    state.videoSettings.motionImageFile = file;
    updateFileMeta("#motionImageMeta", file);
  });

  qs("#motionVideoUpload")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0] || null;
    state.videoSettings.motionVideoFile = file;
    updateFileMeta("#motionVideoMeta", file);
  });

  qs("#sceneControlSwitch")?.addEventListener("click", () => {
    state.videoSettings.sceneControlEnabled = !state.videoSettings.sceneControlEnabled;
    renderVideoModelFields();
  });

  qsa("[data-scene-mode]").forEach((btn) => btn.addEventListener("click", () => {
    state.videoSettings.sceneControlMode = btn.dataset.sceneMode;
    renderVideoModelFields();
  }));

  qsa("[data-orientation]").forEach((btn) => btn.addEventListener("click", () => {
    state.videoSettings.orientation = btn.dataset.orientation;
    renderVideoModelFields();
  }));
}

function fileToDataURL(file, onProgress) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.onprogress = (e) => {
      if (e.lengthComputable && typeof onProgress === "function") {
        onProgress((e.loaded / e.total) * 100);
      }
    };
    reader.readAsDataURL(file);
  });
}

function requestWithProgress({ url, body, onUploadProgress }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("x-user-id", String(userId));
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && typeof onUploadProgress === "function") {
        onUploadProgress((e.loaded / e.total) * 100);
      }
    };
    xhr.onreadystatechange = () => {
      if (xhr.readyState !== 4) return;
      try {
        const json = JSON.parse(xhr.responseText || "{}");
        if (xhr.status >= 200 && xhr.status < 300) resolve(json);
        else reject(new Error(json.error || `Request failed: ${xhr.status}`));
      } catch (error) {
        reject(new Error("Некорректный ответ сервера"));
      }
    };
    xhr.onerror = () => reject(new Error("Ошибка сети"));
    xhr.send(JSON.stringify(body));
  });
}

async function robustDownload(url, fileName) {
  const response = await fetch(url, { mode: "cors" });
  if (!response.ok) throw new Error("Не удалось скачать файл");
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
}

function renderDownloadButton(url, fileName, label = "Download") {
  const safeUrl = escapeHtml(url);
  const safeName = escapeHtml(fileName);
  return `<button class="secondary-btn download-btn" data-download-url="${safeUrl}" data-download-name="${safeName}">${label}</button>`;
}

function bindDownloadButtons() {
  qsa(".download-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const url = btn.dataset.downloadUrl;
      const fileName = btn.dataset.downloadName || "result";
      const old = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Downloading...";
      try {
        await robustDownload(url, fileName);
        btn.textContent = "Downloaded";
      } catch (error) {
        btn.textContent = old;
        showToast(error.message || "Download failed");
      } finally {
        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = old;
        }, 1200);
      }
    });
  });
}

function renderImageResult(url) {
  const root = qs("#imageResultContent");
  if (!root) return;
  if (!url) {
    root.innerHTML = `<div class="empty-state">Нет изображения в ответе</div>`;
    return;
  }
  root.innerHTML = `
    <div class="media-result">
      <img src="${url}" alt="image result" class="result-image" />
      <div class="result-actions">${renderDownloadButton(url, "montix-image.png", "Download image")}</div>
    </div>
  `;
  bindDownloadButtons();
}

function renderVideoResult(url) {
  const root = qs("#videoResultContent");
  if (!root) return;
  if (!url) {
    root.innerHTML = `<div class="empty-state">Нет видео в ответе</div>`;
    return;
  }
  root.innerHTML = `
    <div class="media-result">
      <video src="${url}" controls playsinline class="result-video"></video>
      <div class="result-actions">${renderDownloadButton(url, "montix-video.mp4", "Download video")}</div>
    </div>
  `;
  bindDownloadButtons();
}

function renderEnhanceResult(originalUrl, resultUrl) {
  const root = qs("#enhanceResultContent");
  if (!root) return;
  if (!resultUrl) {
    root.innerHTML = `<div class="empty-state">Нет изображения в ответе</div>`;
    return;
  }
  root.innerHTML = `
    <div class="compare-grid">
      <div class="compare-card"><span>Before</span><img src="${originalUrl}" class="result-image" alt="before" /></div>
      <div class="compare-card"><span>After</span><img src="${resultUrl}" class="result-image" alt="after" /></div>
    </div>
    <div class="result-actions">${renderDownloadButton(resultUrl, "montix-enhanced.png", "Download enhanced")}</div>
  `;
  bindDownloadButtons();
}

function getProfilePayload() {
  return {
    username: tgUser?.username || null,
    first_name: tgUser?.first_name || null,
    last_name: tgUser?.last_name || null
  };
}

async function handleImageGeneration() {
  const prompt = qs("#imagePrompt")?.value?.trim();
  const file = qs("#imageUpload")?.files?.[0] || null;
  if (!prompt) return showToast("Сначала напиши prompt");

  const btn = qs("#generateImageBtn");
  btn.disabled = true;
  btn.textContent = "Generating...";

  const progress = startPanelProgress("image", "Подготовка картинки");

  try {
    let imageDataUrl = null;
    if (file) {
      imageDataUrl = await fileToDataURL(file, (value) => showProgress("#imageUploadProgressWrap", "#imageUploadProgressBar", "#imageUploadProgressText", value));
    }

    const data = await requestWithProgress({
      url: `${API_BASE}/api/generate-image`,
      body: {
        prompt,
        model: state.imageModel,
        aspectRatio: state.imageRatio,
        quality: state.imageQuality.toLowerCase(),
        imageDataUrl,
        userId,
        profile: getProfilePayload()
      },
      onUploadProgress(value) {
        if (file) showProgress("#imageUploadProgressWrap", "#imageUploadProgressBar", "#imageUploadProgressText", value);
      }
    });

    if (!data.ok) throw new Error(data.error || "Image generation failed");
    progress.finish("Картинка готова");
    renderImageResult(data.image);
    if (typeof data.credits !== "undefined") updateCredits(data.credits);
    state.history.image.unshift({ title: prompt.slice(0, 34), sub: `${state.imageModel} • ${data.cost || 0} cr` });
    state.history.image = state.history.image.slice(0, 9);
    renderHistory();
    showToast("Картинка готова");
  } catch (error) {
    progress.fail(error.message || "Ошибка");
    showToast(error.message || "Ошибка");
  } finally {
    btn.disabled = false;
    btn.textContent = "Generate image";
  }
}

async function handleVideoGeneration() {
  const promptBase = qs("#videoPrompt")?.value?.trim();
  const extraScenePrompt = qs("#scenePrompt")?.value?.trim() || "";
  const prompt = [promptBase, !state.videoSettings.sceneControlEnabled ? extraScenePrompt : ""].filter(Boolean).join("\n\n");
  if (!promptBase) return showToast("Сначала напиши prompt");

  const btn = qs("#generateVideoBtn");
  btn.disabled = true;
  btn.textContent = "Generating...";

  const progress = startPanelProgress("video", "Подготовка видео");

  try {
    let imageDataUrl = null;
    let endImageDataUrl = null;
    let motionImageDataUrl = null;
    let motionVideoDataUrl = null;

    if (state.videoModel === "Kling Motion Control") {
      if (!state.videoSettings.motionVideoFile || !state.videoSettings.motionImageFile) {
        throw new Error("Для Kling Motion Control загрузи видео и фото");
      }
      motionVideoDataUrl = await fileToDataURL(state.videoSettings.motionVideoFile, (value) => showProgress("#motionVideoProgressWrap", "#motionVideoProgressBar", "#motionVideoProgressText", value));
      motionImageDataUrl = await fileToDataURL(state.videoSettings.motionImageFile, (value) => showProgress("#motionImageProgressWrap", "#motionImageProgressBar", "#motionImageProgressText", value));
    } else {
      if (state.videoSettings.genericImageFile) {
        imageDataUrl = await fileToDataURL(state.videoSettings.genericImageFile, (value) => showProgress("#genericImageProgressWrap", "#genericImageProgressBar", "#genericImageProgressText", value));
      }
      if (state.videoSettings.genericEndImageFile) {
        endImageDataUrl = await fileToDataURL(state.videoSettings.genericEndImageFile, (value) => showProgress("#genericEndImageProgressWrap", "#genericEndImageProgressBar", "#genericEndImageProgressText", value));
      }
    }

    const data = await requestWithProgress({
      url: `${API_BASE}/api/generate-video`,
      body: {
        prompt,
        model: state.videoModel,
        duration: Number(state.videoDuration.replace(/\D/g, "")) || 5,
        aspectRatio: state.videoRatio,
        quality: state.videoQuality.toLowerCase(),
        resolution: state.videoResolution,
        sound: state.videoSound,
        imageDataUrl,
        endImageDataUrl,
        motionImageDataUrl,
        motionVideoDataUrl,
        sceneControlEnabled: state.videoSettings.sceneControlEnabled,
        sceneControlMode: state.videoSettings.sceneControlMode,
        orientation: state.videoSettings.orientation,
        userId,
        profile: getProfilePayload()
      },
      onUploadProgress() {}
    });

    if (!data.ok) throw new Error(data.error || "Video generation failed");
    progress.finish("Видео готово");
    renderVideoResult(data.video);
    if (typeof data.credits !== "undefined") updateCredits(data.credits);
    state.history.video.unshift({ title: promptBase.slice(0, 34), sub: `${state.videoModel} • ${data.cost || 0} cr` });
    state.history.video = state.history.video.slice(0, 9);
    renderHistory();
    showToast("Видео готово");
  } catch (error) {
    progress.fail(error.message || "Ошибка");
    showToast(error.message || "Ошибка");
  } finally {
    btn.disabled = false;
    btn.textContent = "Generate video";
  }
}

async function handleEnhance() {
  const file = qs("#enhanceUpload")?.files?.[0] || null;
  if (!file) return showToast("Сначала загрузи фото");

  const btn = qs("#generateEnhanceBtn");
  btn.disabled = true;
  btn.textContent = "Enhancing...";

  const progress = startPanelProgress("enhance", "Подготовка enhance");

  try {
    const fileDataUrl = await fileToDataURL(file, (value) => showProgress("#enhanceUploadProgressWrap", "#enhanceUploadProgressBar", "#enhanceUploadProgressText", value));

    const data = await requestWithProgress({
      url: `${API_BASE}/api/enhance`,
      body: {
        fileDataUrl,
        mimeType: file.type || "image/png",
        quality: state.enhanceQuality.toLowerCase(),
        resolution: state.enhanceResolution,
        userId,
        profile: getProfilePayload()
      },
      onUploadProgress(value) {
        showProgress("#enhanceUploadProgressWrap", "#enhanceUploadProgressBar", "#enhanceUploadProgressText", value);
      }
    });

    if (!data.ok) throw new Error(data.error || "Enhance failed");
    progress.finish("Enhance готов");
    renderEnhanceResult(fileDataUrl, data.result_url);
    state.history.enhance.unshift({ title: "Photo enhance", sub: `Nano Banana 2 Edit • ${data.cost || 0} cr` });
    state.history.enhance = state.history.enhance.slice(0, 9);
    renderHistory();
    showToast("Фото улучшено");
  } catch (error) {
    progress.fail(error.message || "Ошибка");
    showToast(error.message || "Ошибка");
  } finally {
    btn.disabled = false;
    btn.textContent = "Enhance photo";
  }
}

function bindActions() {
  qs("#generateImageBtn")?.addEventListener("click", handleImageGeneration);
  qs("#generateVideoBtn")?.addEventListener("click", handleVideoGeneration);
  qs("#generateEnhanceBtn")?.addEventListener("click", handleEnhance);
  qs("#openHistoryImage")?.addEventListener("click", () => qs("#imageHistoryGrid")?.scrollIntoView({ behavior: "smooth" }));
  qs("#openHistoryVideo")?.addEventListener("click", () => qs("#videoHistoryGrid")?.scrollIntoView({ behavior: "smooth" }));
  qs("#openHistoryEnhance")?.addEventListener("click", () => qs("#enhanceHistoryGrid")?.scrollIntoView({ behavior: "smooth" }));
}

function init() {
  bindNavigation();
  bindPickers();
  bindUploadInputs();
  bindSoundToggle();
  bindActions();
  renderVideoModelFields();
  refreshLabels();
  renderHistory();
  loadUser();
  showScreen("home");
}

document.addEventListener("DOMContentLoaded", init);
