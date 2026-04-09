const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
}

function hideAllScreens() {
  document.querySelectorAll('.screen').forEach((el) => {
    el.classList.add('hidden');
  });
}

window.showScreen = function (id) {
  hideAllScreens();
  document.getElementById(id)?.classList.remove('hidden');
};

window.generateImage = function () {
  const prompt = document.getElementById('imagePrompt').value.trim();
  const model = document.getElementById('imageModel').value;
  const result = document.getElementById('imageResult');

  if (!prompt) {
    result.textContent = 'Сначала напиши prompt';
    return;
  }

  result.textContent = `Готово: ${model} | ${prompt}`;
};

window.animatePhoto = function () {
  const prompt = document.getElementById('videoPrompt').value.trim();
  const file = document.getElementById('videoFile').files[0];
  const result = document.getElementById('videoResult');

  if (!prompt) {
    result.textContent = 'Сначала напиши prompt';
    return;
  }

  result.textContent = `Анимация готова | prompt: ${prompt} | file: ${file ? file.name : 'не выбран'}`;
};

window.startEnhance = function () {
  const file = document.getElementById('enhanceFile').files[0];
  const fill = document.getElementById('progressFill');
  const percent = document.getElementById('progressPercent');
  const status = document.getElementById('progressStatus');

  if (!file) {
    status.textContent = 'Сначала выбери фото';
    return;
  }

  let value = 0;
  status.textContent = 'Обработка...';
  percent.textContent = '0%';
  fill.style.width = '0%';

  const timer = setInterval(() => {
    value += 5;
    if (value > 100) value = 100;

    fill.style.width = value + '%';
    percent.textContent = value + '%';

    if (value >= 100) {
      clearInterval(timer);
      status.textContent = 'Готово';
    }
  }, 120);
};
