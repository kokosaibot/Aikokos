const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
}

const API_BASE = "https://aikokos-production.up.railway.app";

const state = {
  currentScreen: "home",
  imageModel: "Nano Banana Pro",
  videoModel: "Kling 3",
  imageRatio: "Automatic",
  videoRatio: "16:9",
  duration: "5 sec",
  imageHistory: [
    { title: "Luxury portrait", sub: "Nano Banana Pro" },
    { title: "Product scene", sub: "Nano Banana 2" },
    { title: "Night city ad", sub: "Nano Banana Pro" }
  ],
  videoHistory: [
    { title: "Car motion shot", sub: "Kling 3" },
    { title: "Fashion teaser", sub: "Veo 3 Fast" },
    { title: "Studio motion", sub: "Seedance 2.0" }
  ]
};

const imageModels = [
  "Nano Banana Pro",
  "Nano Banana 2"
];

const videoModels = [
  "Kling 3",
  "Kling Motion Control",
  "Kling 3 Edit",
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

function qs(selector) {
  return document.querySelector(selector);
}

function qsa(selector) {
  return Array.from(document.querySelectorAll(selector));
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

  if (imageGrid) {
    imageGrid.innerHTML = state.imageHistory
      .map(
        (item) => `
        <div class="history-item interactive">
          <small>${item.sub}</small>
          <strong>${item.title}</strong>
        </div>
      `
      )
      .join("");
  }

  if (videoGrid) {
    videoGrid.innerHTML = state.videoHistory
      .map(
        (item) => `
        <div class="history-item interactive">
          <small>${item.sub}</small>
          <strong>${item.title}</strong>
        </div>
      `
      )
      .join("");
  }
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

  list.innerHTML = models
    .map(
      (model) => `
      <button class="modal-option ${selected === model ? "selected" : ""}" data-model-type="${type}" data-model-value="${model}">
        <span>${model}</span>
        <span>${selected === model ? "✓" : ""}</span>
      </button>
    `
    )
    .join("");

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

  list.innerHTML = ratios
    .map(
      (ratio) => `
      <button class="modal-option ${selected === ratio ? "selected" : ""}" data-ratio-type="${type}" data-ratio-value="${ratio}">
        <span>${ratio}</span>
        <span>${selected === ratio ? "✓" : ""}</span>
      </button>
    `
    )
    .join("");

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

  list.innerHTML = durations
    .map(
      (item) => `
      <button class="modal-option ${state.duration === item ? "selected" : ""}" data-duration-value="${item}">
        <span>${item}</span>
        <span>${state.duration === item ? "✓" : ""}</span>
      </button>
    `
    )
    .join("");

  qsa("[data-duration-value]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const value = btn.dataset.durationValue;
      state.duration = value;
      qs("#durationLabel").textContent = value;
      closeModal("durationModal");
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

  qsa(".modal-card").forEach((card) => {
    card.addEventListener("wheel", (e) => {
      e.stopPropagation();
    }, { passive: true });

    card.addEventListener("touchmove", (e) => {
      e.stopPropagation();
    }, { passive: true });
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

async function generateImageReal(prompt, model) {
  const response = await fetch(`${API_BASE}/api/generate-image`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      prompt,
      model
    })
  });

  return await response.json();
}

async function generateVideoReal(prompt, model, duration, aspect_ratio) {
  const response = await fetch(`${API_BASE}/api/generate-video`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      prompt,
      model,
      duration,
      aspect_ratio
    })
  });

  return await response.json();
}

function bindGenerators() {
  qs("#generateImageBtn")?.addEventListener("click", async () => {
    const prompt = qs("#imagePrompt").value.trim();

    if (!prompt) {
      showToast("Сначала напиши prompt");
      return;
    }

    const btn = qs("#generateImageBtn");
    const oldText = btn.textContent;
    btn.textContent = "Generating...";
    btn.disabled = true;

    try {
      const data = await generateImageReal(prompt, state.imageModel);

      if (!data.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : JSON.stringify(data.error || "Image generation failed")
        );
      }

      console.log("IMAGE RESULT:", data);

      state.imageHistory.unshift({
        title: prompt.slice(0, 28),
        sub: state.imageModel
      });
      state.imageHistory = state.imageHistory.slice(0, 9);
      renderHistory();

      showToast("Картинка отправлена в генерацию");
    } catch (error) {
      console.error(error);
      showToast(`Ошибка: ${error.message}`);
    } finally {
      btn.textContent = oldText;
      btn.disabled = false;
    }
  });

  qs("#generateVideoBtn")?.addEventListener("click", async () => {
    const prompt = qs("#videoPrompt").value.trim();

    if (!prompt) {
      showToast("Сначала напиши prompt");
      return;
    }

    const btn = qs("#generateVideoBtn");
    const oldText = btn.textContent;
    btn.textContent = "Generating...";
    btn.disabled = true;

    try {
      const data = await generateVideoReal(
        prompt,
        state.videoModel,
        state.duration.replace(" sec", ""),
        state.videoRatio
      );

      if (!data.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : JSON.stringify(data.error || "Video generation failed")
        );
      }

      console.log("VIDEO RESULT:", data);

      state.videoHistory.unshift({
        title: prompt.slice(0, 28),
        sub: `${state.videoModel} • ${state.duration}`
      });
      state.videoHistory = state.videoHistory.slice(0, 9);
      renderHistory();

      showToast("Видео отправлено в генерацию");
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
    qs("#openProfileBtn").textContent = value.slice(0, 1).toUpperCase();
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
  }, 1800);
}

function init() {
  bindNavigation();
  bindModals();
  bindExpand();
  bindGenerators();
  bindLibraryButtons();
  bindProfile();

  updateFileName("#imageUpload", "#imageUploadMeta");
  updateFileName("#videoStartUpload", "#videoStartMeta");
  updateFileName("#videoEndUpload", "#videoEndMeta");

  renderHistory();
  showScreen("home");
}

init();
