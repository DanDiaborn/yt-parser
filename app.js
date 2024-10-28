const express = require('express');
const cors = require('cors');
const { getSubtitles } = require('youtube-captions-scraper');
const randomUserAgent = require('random-useragent');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

// Прокси-настройки
const proxyHost = '93.190.142.57';
const proxyPort = '9999';
const proxyUsername = 'ihu31wfnsg-corp-country-PL-state-858787-city-756135-hold-session-session-671faadc61892';
const proxyPassword = 'hsXWenfhfCjDwacq';

// Создание прокси-агента через HttpsProxyAgent
const proxyAgent = new HttpsProxyAgent(`http://${proxyUsername}:${proxyPassword}@${proxyHost}:${proxyPort}`);

// Настройка axios с использованием прокси-агента
const axiosInstance = axios.create({
  httpsAgent: proxyAgent,
  headers: {
    'User-Agent': randomUserAgent.getRandom(),
  },
});

// Маршрут для проверки IP
app.get('/check-ip', async (req, res) => {
  try {
    const response = await axiosInstance.get('http://api.ipify.org?format=json');
    res.json({ proxyIP: response.data.ip });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch IP through proxy', details: error.message });
  }
});

async function fetchSubtitlesAuto(videoId) {
  const languages = ['auto', 'pl', 'en', 'ru', 'es', 'fr', 'de', 'id'];
  let subtitles = null;

  for (const lang of languages) {
    try {
      subtitles = await getSubtitles({
        videoID: videoId,
        lang: lang,
        axiosInstance,
      });

      if (subtitles && subtitles.length > 0) {
        const formattedText = subtitles.map(sub => sub.text).join(' ');
        return formattedText;
      }
    } catch (error) {
      console.log(`Error fetching subtitles for video ${videoId} on language ${lang}:`);

      // Основные данные об ошибке
      console.log(`- Message: ${error.message}`);

      // Статус ответа (если доступен)
      if (error.response) {
        console.log(`- Status Code: ${error.response.status}`);
        console.log(`- Status Text: ${error.response.statusText}`);
        console.log(`- Response Data: ${JSON.stringify(error.response.data, null, 2)}`);
      } else {
        console.log("- No response received from the server.");
      }

      // Информация о конфигурации запроса
      if (error.config) {
        console.log(`- Request URL: ${error.config.url}`);
        console.log(`- Request Headers: ${JSON.stringify(error.config.headers, null, 2)}`);
        console.log(`- Request Method: ${error.config.method}`);
      }

      // Стек вызовов для отладки
      console.log(`- Stack Trace: ${error.stack}`);

      continue;
    }
  }

  return 'No subtitles available';
}

app.get('/', async (req, res) => {
  res.json('ALIVE');
});

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

app.listen(port, () => {
  console.log(`Server running on http://195.161.68.104:${port}`);
});
