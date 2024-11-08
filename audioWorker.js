const { parentPort, workerData } = require('worker_threads');
const puppeteer = require('puppeteer');
const { Storage } = require('@google-cloud/storage');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

// Установка PATH в worker thread, если он передан в workerData
if (!process.env.PATH && workerData.PATH) {
  process.env.PATH = workerData.PATH;
}

const keyFilePath = './izibizi-352900-a2cdb2e0d471.json';
const storage = new Storage({
  keyFilename: keyFilePath,
  clientOptions: { family: 4 },
});
const bucketName = 'powerdatabucket';

// Убедимся, что папка audio существует, если нет — создадим ее
const audioFolder = path.resolve('./audio');
if (!fs.existsSync(audioFolder)) {
  fs.mkdirSync(audioFolder);
}

async function uploadToStorage(filePath, destination) {
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(destination);
  await bucket.upload(filePath, {
    destination,
    resumable: false,
    contentType: 'audio/mpeg',
  });
  console.log(`Uploaded audio to ${bucketName}/${destination}`);
}

(async () => {
  const { url, author, title } = workerData;
  const safeTitle = title.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
  const localAudioPath = path.resolve(audioFolder, `audio_${safeTitle}.mp3`);
  const storagePath = `test/${author}/${safeTitle}/${safeTitle}.mp3`;

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      `--proxy-server=${workerData.proxyHost}:${workerData.proxyPort}`,
    ],
  });
  const page = await browser.newPage();
  await page.authenticate({
    username: workerData.proxyUsername,
    password: workerData.proxyPassword,
  });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('input[name="formParams[first_name]"]');

    // Заполнение формы
    await page.evaluate(() => {
      document.querySelector('input[name="formParams[first_name]"]').value = 'Алексей';
      document.querySelector('input[name="formParams[email]"]').value = 'alexeinikolaev@gmail.com';
      document.querySelector('input[name="formParams[phone]"]').value = '+79591361323';
    });

    await page.click('.btn.f-btn.button-md.btn-success');
    await delay(1000);

    const frame = await getIframeContentFrame(page);

    const videoData = await frame.evaluate(() => {
      const scriptTag = document.querySelector('script[type="application/ld+json"]');
      return scriptTag ? JSON.parse(scriptTag.innerText) : null;
    });

    if (videoData && videoData.contentUrl) {
      const videoUrl = videoData.contentUrl;
      console.log('Скачивание аудио из URL:', videoUrl);

      await new Promise((resolve, reject) => {
        ffmpeg(videoUrl)
          .output(localAudioPath)
          .audioBitrate(8)
          .audioChannels(1)
          .audioFrequency(8000)
          .noVideo()
          .on('progress', (progress) => {
            console.log(`${title} скачано: ${progress.percent ? progress.percent.toFixed(2) : 'Загрузка продолжается...'}%`);
          })
          .on('end', resolve)
          .on('error', reject)
          .run();
      });

      try {
        await uploadToStorage(localAudioPath, storagePath);
      } catch (error) {
        console.error('Ошибка загрузки в хранилище:', error);
      } finally {
        fs.unlinkSync(localAudioPath); // Удаление файла в любом случае
      }
    } else {
      console.log('Не удалось найти JSON с видео данными.');
    }
  } catch (error) {
    console.error('Ошибка выполнения:', error);
  } finally {
    await browser.close();
  }
})();

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getIframeContentFrame(page, retries = 5, delayTime = 5000) {
  let iframeElement = await page.$('iframe.embed-responsive-item');
  if (iframeElement) {
    const frame = await iframeElement.contentFrame();
    if (frame) return frame;
  }

  if (retries > 0) {
    console.log(`Iframe не найден, повторная попытка через ${delayTime / 1000} секунд... Осталось попыток: ${retries}`);
    await delay(delayTime);
    return getIframeContentFrame(page, retries - 1, delayTime);
  }

  throw new Error('Не удалось получить доступ к iframe после нескольких попыток');
}
