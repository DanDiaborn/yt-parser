const express = require('express');
const { getSubtitles } = require('youtube-captions-scraper');

const app = express();
const port = 3000;

// Middleware для обработки JSON запросов
app.use(express.json());

// Функция для извлечения субтитров по ID видео на YouTube с приоритетом русского языка
async function fetchSubtitlesWithPriority(videoId) {
  try {
    // Сначала пытаемся получить субтитры на русском языке
    let subtitles = await getSubtitles({
      videoID: videoId,
      lang: 'ru', // Приоритетный язык - русский
    });

    // Если субтитров на русском нет, пробуем получить на английском
    if (!subtitles || subtitles.length === 0) {
      subtitles = await getSubtitles({
        videoID: videoId,
        lang: 'en', // Запасной язык - английский
      });
    }

    // Если субтитры найдены, объединяем их в цельный текст
    if (subtitles && subtitles.length > 0) {
      const formattedText = subtitles.map(sub => sub.text).join(' ');
      return formattedText;
    } else {
      return 'No subtitles available';
    }
  } catch (error) {
    return { error: `Error fetching subtitles for video ID ${videoId}: ${error.message}` };
  }
}

// POST endpoint для получения субтитров
app.post('/captions', async (req, res) => {
  const { videoIds } = req.body;

  if (!Array.isArray(videoIds)) {
    return res.status(400).json({ error: 'Invalid input. Expected an array of video IDs.' });
  }

  const results = await Promise.all(videoIds.map(async (id) => {
    const subtitlesText = await fetchSubtitlesWithPriority(id);
    return { videoId: id, subtitlesText };
  }));

  res.json(results);
});

// Запуск сервера
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
