const express = require('express');
const cors = require('cors');
const { getSubtitles } = require('youtube-captions-scraper');

const app = express();
const port = process.env.PORT || 3000;

// Middleware для обработки JSON и CORS
app.use(express.json());
app.use(cors());

// Функция для извлечения субтитров, начиная с автоматических
async function fetchSubtitlesAuto(videoId) {
  const languages = ['auto', 'en', 'ru', 'es', 'fr', 'de', 'id']; // Популярные языки, которые можно попробовать
  let subtitles = null;

  for (const lang of languages) {
    try {
      subtitles = await getSubtitles({
        videoID: videoId,
        lang: lang,
      });
      if (subtitles && subtitles.length > 0) {
        const formattedText = subtitles.map(sub => sub.text).join(' ');
        return formattedText; // Вернуть текст, если субтитры найдены
      }
    } catch (error) {
      console.log(`Error fetching subtitles for video ${videoId} on language ${lang}: ${error.message}`);
      continue; // Переход к следующему языку, если субтитры не найдены или возникла ошибка
    }
  }

  return 'No subtitles available'; // Если ни на одном языке субтитры не найдены
}

app.get('/', async (req, res) => {
  res.json('ALIVE');
});

// POST endpoint для получения субтитров
app.post('/captions', async (req, res) => {
  const { videoIds } = req.body;

  if (!Array.isArray(videoIds)) {
    return res.status(400).json({ error: 'Invalid input. Expected an array of video IDs.' });
  }

  const results = await Promise.all(videoIds.map(async (id) => {
    const subtitlesText = await fetchSubtitlesAuto(id);
    return { videoId: id, subtitlesText };
  }));

  res.json(results);
});

// Запуск сервера
app.listen(port, () => {
  console.log(`Server running at port ${port}`);
});
