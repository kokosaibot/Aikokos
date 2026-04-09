const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  tg.setBackgroundColor?.('#000000');
  tg.setHeaderColor?.('#000000');
}

const state = {
  currentScreen: 'home',
  imageModel: '🔥 NanoBanana PRO',
  videoModel: 'Kling 2.5 Turbo',
  ratio: 'Автоматически',
  videoRatio: '16:9',
  veoRatio: '16:9',
  activeModal: null,
};

const imageModels = [
  { name: '🔥 NanoBanana PRO', desc: 'Новая улучшенная модель с более качественным пониманием...', tags: [] },
  { name: '🆕 NanoBanana V2', desc: 'Новая версия модели генерации изображений', tags: ['до 4K'] },
  { name: 'ChatGPT Image 1.5', desc: 'Новейшая модель от OpenAI для генерации изображений', tags: [] },
  { name: 'Seedream 5 Lite', desc: 'Быстрая и качественная генерация изображений', tags: [] },
  { name: 'Kling 03 Photo', desc: 'Высококачественная генерация изображений с улучшенным...', tags: ['до 4K'] },
];

const videoModels = [
  { name: 'Kling 2.5 Turbo', desc: 'Новая быстрая модель от Kling', tags: ['720p', '5-10 сек'] },
  { name: 'Kling 2.6 Motion Control', desc: 'Перенос движения из референсного видео на изображение...', tags: ['720p', 'до 30 сек'] },
  { name: '🆕 Kling 03', desc: 'Новейшая модель Kling 03 с поддержкой видео до 15 секунд', tags: ['720-1080p', '5-15 сек', 'Опционально'] },
  { name: 'Veo 3.1', desc: 'Высокое студийное качество', tags: ['720p', '5-10 сек', 'Со звуком'] },
  { name: '🆕 Seedance 2', desc: 'Новая модель генерации видео от ByteDance с выбором...', tags: ['4-15 сек', 'Опционально'] },
  { name: 'Seedance V1 Pro', desc: 'Быстрая высококачественная генерация', tags: ['480p-1080p', '5-10 сек'] },
];

const ratios = ['Автоматически', '1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'];

function $(s) { return document.querySelector(s); }
function $all(s) { return [...document.querySelectorAll(s)]; }

function renderScreens() {
  $all('.screen').forEach((screen) => screen.classList.remove('active'));
  const active = document.getElementById(`screen-${state.currentScreen}`);
  if (active) active.classList.add('active');

  $all('.nav-link').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.screen === state.currentScreen);
  });

  const generateBarVisible = ['image', 'video'].includes(state.currentScreen);
  $('#generateBar').classList.toggle('hidden', !generateBarVisible);

  const backVisible = state.currentScreen !== 'home';
  $('#backBtn').classList.toggle('hidden', !backVisible);
}

function openModal(type) {
  state.activeModal = type;
  if (type === 'image-model') {
    renderModelList(imageModels, state.imageModel, (name) => {
      state.imageModel = name;
      $('#imageModelValue').textContent = name;
      closeModal();
    });
    $('#modelModalBackdrop').classList.remove('hidden');
  }
  if (type === 'video-model') {
    renderModelList(videoModels, state.videoModel, (name) => {
      state.videoModel = name;
      $('#videoModelValue').textContent = name;
      const isVeo = name === 'Veo 3.1';
      $('#videoStandardFields').classList.toggle('hidden', isVeo);
      $('#veoFields').classList.toggle('hidden', !isVeo);
      closeModal();
    });
    $('#modelModalBackdrop').classList.remove('hidden');
  }
  if (type === 'ratio' || type === 'video-ratio' || type === 'veo-ratio') {
    renderRatioList();
    $('#ratioModalBackdrop').classList.remove('hidden');
  }
  if (type === 'pricing') {
    $('#pricingModalBackdrop').classList.remove('hidden');
  }
}

function closeModal() {
  state.activeModal = null;
  $('#modelModalBackdrop').classList.add('hidden');
  $('#ratioModalBackdrop').classList.add('hidden');
  $('#pricingModalBackdrop').classList.add('hidden');
}

function renderModelList(models, selected, onSelect) {
  const container = $('#modelList');
  container.innerHTML = '';
  models.forEach((model) => {
    const item = document.createElement('button');
    item.className = `model-item ${model.name === selected ? 'selected' : ''}`;
    item.innerHTML = `
      <div class="model-top">
        <div class="model-icon">G</div>
        <div class="model-meta">
          <div><strong>${model.name}</strong></div>
          <div class="model-desc">${model.desc}</div>
          <div class="model-tags">${model.tags.map((t) => `<span class="model-tag">${t}</span>`).join('')}</div>
        </div>
      </div>
      <div>${model.name === selected ? '◉' : '○'}</div>
    `;
    item.addEventListener('click', () => onSelect(model.name));
    container.appendChild(item);
  });
}

function renderRatioList() {
  const container = $('#ratioList');
  container.innerHTML = '';
  const current = state.activeModal === 'video-ratio' ? state.videoRatio : state.activeModal === 'veo-ratio' ? state.veoRatio : state.ratio;
  ratios.forEach((ratio) => {
    const item = document.createElement('button');
    item.className = `ratio-item ${current === ratio ? 'selected' : ''}`;
    item.innerHTML = `<span>${ratio}</span><span>${current === ratio ? '✓' : ''}</span>`;
    item.addEventListener('click', () => {
      if (state.activeModal === 'video-ratio') {
        state.videoRatio = ratio; $('#videoRatioValue').textContent = ratio;
      } else if (state.activeModal === 'veo-ratio') {
        state.veoRatio = ratio; $('#veoRatioValue').textContent = ratio;
      } else {
        state.ratio = ratio; $('#ratioValue').textContent = ratio;
      }
      closeModal();
    });
    container.appendChild(item);
  });
}

$all('[data-screen]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.currentScreen = btn.dataset.screen;
    renderScreens();
  });
});

$all('.tool-icon').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.currentScreen = btn.dataset.screen || 'home';
    renderScreens();
  });
});

$('#backBtn').addEventListener('click', () => {
  state.currentScreen = 'home';
  renderScreens();
});

$('#imageModelSelect').addEventListener('click', () => openModal('image-model'));
$('#videoModelSelect').addEventListener('click', () => openModal('video-model'));
$('#ratioSelect').addEventListener('click', () => openModal('ratio'));
$('#videoRatioSelect').addEventListener('click', () => openModal('video-ratio'));
$('#veoRatioSelect').addEventListener('click', () => openModal('veo-ratio'));
$('#openPricing').addEventListener('click', () => openModal('pricing'));
$('#openProfile').addEventListener('click', () => { state.currentScreen = 'profile'; renderScreens(); });
$('#menuDots').addEventListener('click', () => { state.currentScreen = 'tools'; renderScreens(); });
$('#closeApp').addEventListener('click', () => tg?.close?.());
$('#generateAction').addEventListener('click', () => alert('Тут потом подключишь API генерации.'));

$all('.close-modal').forEach((btn) => btn.addEventListener('click', closeModal));
$all('.close-pricing').forEach((btn) => btn.addEventListener('click', closeModal));
$('#modelModalBackdrop').addEventListener('click', (e) => { if (e.target.id === 'modelModalBackdrop') closeModal(); });
$('#ratioModalBackdrop').addEventListener('click', (e) => { if (e.target.id === 'ratioModalBackdrop') closeModal(); });
$('#pricingModalBackdrop').addEventListener('click', (e) => { if (e.target.id === 'pricingModalBackdrop') closeModal(); });

renderScreens();
