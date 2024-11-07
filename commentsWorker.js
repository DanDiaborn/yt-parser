const axios = require('axios');

const { parentPort, workerData } = require('worker_threads');
const puppeteer = require('puppeteer');
const { Storage } = require('@google-cloud/storage');

const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');


const keyFilePath = './izibizi-352900-a2cdb2e0d471.json';
const storage = new Storage({
  keyFilename: keyFilePath,
  clientOptions: {
    family: 4,
  },
});
const bucketName = 'powerdatabucket';

async function uploadToStorage(data, destination) {
  if (!data.comments || Object.keys(data.comments).length === 0) {  // Проверка на пустоту данных
    console.log('Данные пусты. Загрузка не выполнена.');
    return;
  }

  const bucket = storage.bucket(bucketName);
  const file = bucket.file(destination);

  await file.save(data, {
    resumable: false,
    contentType: 'application/json',
  });

  console.log(`Uploaded data to ${bucketName}/${destination}`);
}


(async () => {
  // Запускаем проверку подключения
  const { url, author, title } = workerData;
  const safeTitle = title.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
  const storagePath = `${author}/${safeTitle}/${safeTitle}.json`;

  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      `--proxy-server=${workerData.proxyHost}:${workerData.proxyPort}`
    ]
  });
  const page = await browser.newPage();
  await page.authenticate({
    username: workerData.proxyUsername,
    password: workerData.proxyPassword
  });

  let lastCommentTime = Date.now();
  let commentsList = [];

  try {
    await page.goto(url, { waitUntil: 'networkidle2' });

    await page.evaluate(() => {
      document.querySelector('input[name="formParams[first_name]"]').value = 'Алексей';
      document.querySelector('input[name="formParams[email]"]').value = 'alexeinikolaev@gmail.com';
      document.querySelector('input[name="formParams[phone]"]').value = '+79591361323';
    });

    await page.click('.btn.f-btn.button-md.btn-success');
    await page.waitForNavigation();

    const fetchAndSaveComments = async () => {
      const newComments = await page.evaluate(() => {
        const comments = [];
        const commentsElements = document.querySelectorAll('ul#chat li.msg');
        commentsElements.forEach(comment => {
          const userName = comment.querySelector('.user').innerText;
          const time = comment.querySelector('.time').innerText;
          const msg = comment.querySelector('.msgbody').innerText;
          const isModer = comment.classList.contains('is_moder');
          const isAdmin = comment.classList.contains('admin');
          comments.push({ userName, time, msg, isModer, isAdmin });
        });
        return comments;
      });

      newComments.forEach(comment => {
        if (!commentsList.some(existingComment =>
          existingComment.userName === comment.userName &&
          existingComment.time === comment.time &&
          existingComment.msg === comment.msg
        )) {
          commentsList.push(comment);
          lastCommentTime = Date.now();
          // console.log(`Новый комментарий от ${comment.userName}: "${comment.msg}"`);
        }
      });
      // await axios.post(`http://localhost:49234/update-comment-count`, {
      //   title,
      //   count: commentsList.length
      // });
      console.log(`${commentsList.length} комментариев у ролика ${title}`);
    };

    const intervalId = setInterval(async () => {
      await fetchAndSaveComments();

      if (Date.now() - lastCommentTime >= 5 * 60 * 1000) {
        clearInterval(intervalId);

        const dataToSend = JSON.stringify({
          comments: commentsList,
          author,
          title,
        });

        await uploadToStorage(dataToSend, storagePath);

        await browser.close();
        parentPort.postMessage(`Завершение работы воркера для ${title} из-за отсутствия новых комментариев`);
      }
    }, 10000);

    await fetchAndSaveComments();

    // page.on('framenavigated', async () => {
    //   const dataToSend = JSON.stringify({
    //     comments: commentsList,
    //     author,
    //     title,
    //   });

    //   await uploadToStorage(dataToSend, storagePath);
    //   clearInterval(intervalId);
    //   await browser.close();
    //   parentPort.postMessage(`Завершение работы воркера для ${title} из-за отсутствия новых комментариев`);
    // });

    parentPort.on('exit', async () => {
      clearInterval(intervalId);
      await browser.close();
    });

  } catch (error) {
    parentPort.postMessage(`Ошибка при обработке URL ${url}: ${error}`);
    const dataToSend = JSON.stringify({
      comments: commentsList,
      author,
      title,
    });
    await uploadToStorage(dataToSend, storagePath);
    await browser.close();
  }
})();
