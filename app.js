const express = require('express');
const cors = require('cors');
const { getSubtitles, getVideoDetails } = require('youtube-caption-extractor');

const app = express();
const port = process.env.PORT || 3000;

// Middleware для обработки JSON и CORS
app.use(express.json());
app.use(cors());

// Функция для извлечения субтитров с приоритетом русского языка
async function fetchSubtitlesWithPriority(videoId) {
  try {
    // Сначала пытаемся получить субтитры на русском языке
    let subtitles = await getSubtitles({ videoID: videoId, lang: 'ru' });

    // Если субтитров на русском нет, пробуем получить на английском
    if (!subtitles || subtitles.length === 0) {
      subtitles = await getSubtitles({ videoID: videoId, lang: 'en' });
    }

    // Если субтитры найдены, объединяем их в цельный текст
    if (subtitles && subtitles.length > 0) {
      const formattedText = subtitles.map(sub => sub.text).join(' ');
      return formattedText;
    } else {
      // Возвращаем сообщение без логирования в консоль
      return 'No subtitles available';
    }
  } catch (error) {
    // Логируем ошибку только в случае реальной проблемы
    console.error(`Error fetching subtitles for video ID ${videoId}: ${error.message}`);
    return { error: `Error fetching subtitles for video ID ${videoId}: ${error.message}` };
  }
}


// Функция для извлечения деталей видео
async function fetchVideoDetails(videoId) {
  try {
    const videoDetails = await getVideoDetails({ videoID: videoId });
    return videoDetails;
  } catch (error) {
    return { error: `Error fetching video details for video ID ${videoId}: ${error.message}` };
  }
}

app.get('/', (req, res) => {
  res.json('ALIVE');
});

// POST endpoint для получения субтитров и деталей видео
app.post('/captions', async (req, res) => {
  const { videoIds } = req.body;

  if (!Array.isArray(videoIds)) {
    return res.status(400).json({ error: 'Invalid input. Expected an array of video IDs.' });
  }

  const results = await Promise.all(videoIds.map(async (id) => {
    const subtitlesText = await fetchSubtitlesWithPriority(id);
    const videoDetails = await fetchVideoDetails(id);
    return { videoId: id, subtitlesText, videoDetails };
  }));

  res.json(results);
});

// Запуск сервера
app.listen(port, () => {
  console.log(`Server running at port ${port}`);
});
