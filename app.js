const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const { getSubtitles } = require('./scrapper.js');
const randomUserAgent = require('random-useragent');
const axios = require('axios');
const { Worker } = require('worker_threads');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const { HttpsProxyAgent } = require('https-proxy-agent');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

const proxyHost = '93.190.142.57';
const proxyPort = '9999';
const proxyUsername = 'ihu31wfnsg-corp-country-PL-state-858787-city-756135-hold-session-session-671faadc61892';
const proxyPassword = 'hsXWenfhfCjDwacq';

const proxyUrl = `http://${proxyUsername}:${proxyPassword}@${proxyHost}:${proxyPort}`;
const agent = new HttpsProxyAgent(proxyUrl);

const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36';

const axiosInstance = axios.create({
  httpsAgent: agent,
  headers: {
    'User-Agent': userAgent,
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Upgrade-Insecure-Requests': '1',
    'Connection': 'keep-alive',
    'DNT': '1',
    'Referer': 'https://www.google.com/',
  },
  timeout: 20000, // Увеличен таймаут для предотвращения зависания
});

async function initializeApp() {
  const { default: PQueue } = await import('p-queue');

  // Уменьшили количество параллельных процессов до 1 для уменьшения нагрузки
  const audioWorkerQueue = new PQueue({ concurrency: 1 });

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
        console.log(`Error fetching subtitles for video ${videoId} on language ${lang}: ${error.message}`);
        continue;
      }
    }

    return 'No subtitles available';
  }

  function runWorker(path, item) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(path, {
        workerData: {
          ...item,
          PATH: process.env.PATH,
          proxyHost,
          proxyPort,
          proxyUsername,
          proxyPassword
        }
      });

      worker.on('message', message => console.log(message));
      worker.on('error', reject);
      worker.on('exit', code => {
        if (code !== 0) {
          reject(new Error(`Worker завершился с кодом ошибки: ${code}`));
        } else {
          resolve(`Worker завершил обработку для ${item.title}`);
        }
      });
    });
  }

  // Добавлена пауза в 1 секунду между запросами для очереди
  async function fetchSubtitlesWithDelay(videoId) {
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1 секунда задержки
    return fetchSubtitlesAuto(videoId);
  }

  app.get('/', async (req, res) => {
    res.json('NEW ALIVE');
  });

  app.post('/captions', async (req, res) => {
    const { videoIds } = req.body;

    if (!Array.isArray(videoIds)) {
      return res.status(400).json({ error: 'Invalid input. Expected an array of video IDs.' });
    }

    const results = await Promise.all(videoIds.map(async (id) => {
      const subtitlesText = await fetchSubtitlesWithDelay(id);
      if (global.gc) global.gc(); // Вызов сборщика мусора для очистки памяти
      return { videoId: id, subtitlesText };
    }));

    res.json(results);
  });

  app.post('/bison-comments', (req, res) => {
    const data = req.body;

    if (!Array.isArray(data)) {
      return res.status(400).json({ error: "Неверный формат данных. Ожидается массив объектов." });
    }

    res.json({ message: 'Запрос принят. Воркеры выполняются в фоновом режиме.' });

    data.forEach(item => {
      runWorker('./commentsWorker.js', item)
        .then(result => console.log(result))
        .catch(error => console.error(`Ошибка при выполнении воркера для ${item.title}: ${error.message}`));
    });
  });

  app.post('/bison-audio', (req, res) => {
    const data = req.body;

    if (!Array.isArray(data)) {
      return res.status(400).json({ error: "Неверный формат данных. Ожидается массив объектов." });
    }

    res.json({ message: 'Запрос принят. Воркеры выполняются в фоновом режиме.' });

    data.forEach(item => {
      audioWorkerQueue.add(() => runWorker('./audioWorker.js', item))
        .then(result => console.log(result))
        .catch(error => console.error(`Ошибка при выполнении аудио-воркера для ${item.title}: ${error.message}`));
    });
  });

  app.listen(port, () => {
    console.log(`Server running on http://195.161.68.104:49234`);
  });
}

initializeApp().catch(error => {
  console.error('Ошибка при инициализации приложения:', error);
});
