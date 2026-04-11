const API_URL = "https://aikokos-production.up.railway.app";

const generateBtn = document.getElementById("generate-btn");
const promptInput = document.getElementById("prompt-input");
const resultBlock = document.getElementById("result");

generateBtn.addEventListener("click", async () => {
  const prompt = promptInput.value.trim();

  if (!prompt) {
    alert("Введите промт");
    return;
  }

  resultBlock.innerHTML = "⏳ Генерация...";

  try {
    const res = await fetch(`${API_URL}/api/generate-image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt })
    });

    const data = await res.json();

    if (!data.ok) {
      resultBlock.innerHTML = "❌ Ошибка: " + data.error;
      return;
    }

    console.log(data);

    // 👉 тут fal может вернуть разные структуры
    const imageUrl =
      data.result?.images?.[0]?.url ||
      data.result?.output?.[0] ||
      null;

    if (!imageUrl) {
      resultBlock.innerHTML = "⚠️ Нет изображения в ответе";
      return;
    }

    resultBlock.innerHTML = `
      <img src="${imageUrl}" style="width:100%; border-radius:12px;" />
    `;
  } catch (err) {
    console.error(err);
    resultBlock.innerHTML = "❌ Ошибка запроса";
  }
});
