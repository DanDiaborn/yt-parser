const puppeteer = require('puppeteer');
const express = require('express');
const rateLimit = require('express-rate-limit');
const axios = require('axios'); // Импортируем библиотеку axios
const xml2js = require('xml2js'); // Импортируем библиотеку для разбора XML

const app = express();
const port = 3000;

// Подключаем middleware для обработки JSON
app.use(express.json());

// Настройка ограничителя запросов
const limiter = rateLimit({
  windowMs: 1000, // 1 секунда
  max: 5, // ограничить до 5 запросов за 1 секунду
  message: 'Слишком много запросов, попробуйте позже.',
});

// Применяем ограничитель к маршруту
app.use(limiter);

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Функция для извлечения текста из XML-субтитров
const extractTextFromSubtitles = (xml) => {
  return new Promise((resolve, reject) => {
    xml2js.parseString(xml, (err, result) => {
      if (err) {
        return reject(err);
      }
      const texts = result.transcript.text.map(item => item._); // Извлекаем текст
      resolve(texts.join(' ')); // Объединяем текст в одну строку
    });
  });
};

let browser; // Объявляем переменную для браузера

const getYouTubeVideoDetails = async (link) => {
  const page = await browser.newPage(); // Открываем новую страницу в уже запущенном браузере

  // Переход на указанный YouTube-ролик
  await page.goto(link, { waitUntil: 'networkidle2' });

  // Получение названия, описания и других данных видео
  const videoDetails = await page.evaluate(() => {
    const title = document.title; // Название видео
    const descriptionMeta = document.querySelector('meta[name="description"]'); // Мета-тег с описанием
    const description = descriptionMeta ? descriptionMeta.content : 'Описание не найдено'; // Получаем контент мета-тега

    const lengthSeconds = document.querySelector('.ytp-time-duration').innerHTML || 'Не найдено';

    // Извлечение URL превью
    const thumbnailUrl = document.querySelector('link[itemprop="thumbnailUrl"]')?.getAttribute('href') || 'Не найдено';
    let subtitlesUrl = '';
    const scripts = document.querySelectorAll('script');

    for (let script of scripts) {
      const scriptContent = script.innerHTML;
      if (scriptContent && scriptContent.includes('"captions"')) {
        const captionsIndex = scriptContent.indexOf('"captions"');
        const captionsSnippet = scriptContent.substring(captionsIndex);

        const urlStartIndex = captionsSnippet.indexOf('"baseUrl":"') + 11;
        const urlEndIndex = captionsSnippet.indexOf('"', urlStartIndex);
        subtitlesUrl = captionsSnippet.substring(urlStartIndex, urlEndIndex).replace(/\\u0026/g, '&');

        if (!subtitlesUrl.startsWith('http')) {
          subtitlesUrl = 'https://www.youtube.com' + subtitlesUrl;
        }

        break; // Останавливаем цикл, так как нашли нужные данные
      }
    }

    return { title, description, lengthSeconds, thumbnailUrl, subtitlesUrl };
  });

  await page.close(); // Закрываем страницу после использования
  return videoDetails;
};

// Запускаем браузер один раз при старте приложения
(async () => {
  browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  console.log('Браузер запущен');

  app.get('/', async (req, res) => {
    const videoIds = req.body.links;
    let allVideoData = [];


    if (!Array.isArray(videoIds) || videoIds.length === 0) {
      console.error('Список идентификаторов видео пуст или неверный.');
      return res.status(400).send('Список идентификаторов видео должен быть непустым массивом.');
    }

    const videoDetailsPromises = videoIds.map(async (id) => {
      const link = 'https://www.youtube.com/watch?v=' + id;
      try {
        await delay(Math.random() * 1000); // Задержка от 0 до 1 секунды
        let videoData = await getYouTubeVideoDetails(link);

        // Проверяем, есть ли URL субтитров
        if (videoData.subtitlesUrl) {
          try {
            const subtitlesResponse = await axios.get(videoData.subtitlesUrl); // Используем axios для получения субтитров
            const subtitlesText = subtitlesResponse.data; // Предположим, что это текст в формате XML
            videoData.subtitles = await extractTextFromSubtitles(subtitlesText); // Извлекаем текст из субтитров
          } catch (subtitlesError) {
            console.warn(`Субтитры не найдены для видео ${link}: ${subtitlesError.message}`);
            videoData.subtitles = 'Субтитры не найдены'; // Устанавливаем сообщение о недоступности субтитров
          }
        } else {
          videoData.subtitles = 'Субтитры не доступны для этого видео'; // Если URL нет
        }
        delete videoData.subtitlesUrl;

        return videoData; // Возвращаем данные видео
      } catch (error) {
        console.error(`Ошибка при обработке видео по ссылке ${link}: ${error.message}`);
        return null; // Возвращаем null в случае ошибки
      }
    });

    // Ожидаем завершения всех промисов
    allVideoData = await Promise.all(videoDetailsPromises);

    // Фильтруем null значения
    allVideoData = allVideoData.filter(data => data !== null);

    res.send(allVideoData);
  });


  app.get('/test', async (req, res) => {

    res.send('aboba');
  });

  app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
  });
})();
