import axios from 'axios';
import express from 'express';
import bodyParser from 'body-parser';
import { Analytics } from "@vercel/analytics/react"
import { initBalance, checkBalance, deductBalance } from './filter.js';

const DEEPL_BASE_URL = 'https://api.deepl.com/jsonrpc';
const app = express();
const PORT = process.env.PORT || 9000;
const SECRET = process.env.SECRET || 'secret';

// Cookies storage
let cookies = process.env.DEEPL_COOKIES ? process.env.DEEPL_COOKIES.split(',') : ['95d84682-f9ac-4b15-b7e5-3dd495de1eb7'];

let cookiesCount = cookies.length; // 有效cookie的数量
let invalidCookies = []; // 失效cookie的数组
let currentCookieIndex = 0;

// Select the next cookie in a round-robin fashion
function getNextCookie() {
  let attempts = 0;
  while (attempts < cookies.length) {
    const cookieValue = cookies[currentCookieIndex];
    if (!invalidCookies.includes(cookieValue)) {
      const cookie = `dl_session=${cookieValue}`;
      currentCookieIndex = (currentCookieIndex + 1) % cookies.length;
      return cookie;
    }
    currentCookieIndex = (currentCookieIndex + 1) % cookies.length;
    attempts++;
  }
  return null; // 如果所有的cookies都无效，返回null
}

// Basic headers template, excluding the cookie which will be dynamically inserted
const baseHeaders = {
  'Content-Type': 'application/json',
  Accept: '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-site',
  'Referer': 'https://www.deepl.com/',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};

// Utility functions for the translation logic
function getICount(translateText) {
  return (translateText || '').split('i').length - 1;
}

function getRandomNumber() {
  return Math.floor(Math.random() * 100000) + 83000000000;
}

function getTimestamp(iCount) {
  const ts = Date.now();
  if (iCount === 0) {
    return ts;
  }
  iCount++;
  return ts - (ts % iCount) + iCount;
}

// The translation function
async function translate(text, sourceLang = 'AUTO', targetLang = 'ZH', numberAlternative = 0, printResult = false, tryCount = 0) {
  // 确保tryCount小于有效cookie数量
  if (tryCount >= cookiesCount) {
    console.error("No more valid cookies to try.");
    return null;
  }
  
  const iCount = getICount(text);
  const id = getRandomNumber();
  const cookie = getNextCookie();
  if (!cookie) { // 如果没有有效的cookie，直接返回null
    console.error("No valid cookies available.");
    return null;
  }
  const headers = { ...baseHeaders, 'cookie': cookie }; // Include the selected cookie

  const postData = {
    jsonrpc: '2.0',
    method: 'LMT_handle_texts',
    id: id,
    params: {
      texts: [{ text: text, requestAlternatives: numberAlternative }],
      splitting: 'newlines',
      lang: {
        source_lang_user_selected: sourceLang.toUpperCase(),
        target_lang: targetLang.toUpperCase(),
      },
      timestamp: getTimestamp(iCount),
    },
  };

  try {
    const response = await axios.post(DEEPL_BASE_URL, JSON.stringify(postData), { headers });
    if (response.status !== 200) {
      console.error('Error', response.status);
      return null;
    }
    return response.data.result.texts[0];
  } catch (err) {
    console.error("response error:" + err);
    // 如果遇到错误，则假定当前cookie失效，加入到失效列表中
    invalidCookies.push(cookie.split('=')[1]); // 添加失效的cookie
    console.log("Trying again due to assuming the current cookie is invalid error...");
    return await translate(text, sourceLang, targetLang, numberAlternative, printResult, tryCount + 1);
  }
}

// Express server setup
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('Welcome to deeplx-pro');
});

// index.js

app.post('/translate/:key', async (req, res) => {
  const { text, source_lang, target_lang } = req.body;
  const { key } = req.params;
  
  try {
    const isBalanceSufficient = await checkBalance(key, text);
    if (!isBalanceSufficient) {
      res.status(402).json({ error: '余额不足' });
      return;
    }
    deductBalance(key, text.length);  // Assuming deductBalance is also properly promisified
    const result = await translate(text, source_lang, target_lang);
    if (!result) {
      res.status(500).json({ error: 'Translation failed or too many requests' });
      return;
    }
    res.json({
      alternatives: result.alternatives,
      code: 200,
      data: result.text,
      id: Math.floor(Math.random() * 10000000000),
      method: 'Free',
      source_lang: source_lang.toUpperCase(),
      target_lang: target_lang.toUpperCase(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Translation failed' });
  }
});

app.get("/addkey", async (req, res) => {
  // Extract the Bearer token from the Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Unauthorized access: No token provided" });
  }

  const token = authHeader.split(' ')[1];
  if (token !== SECRET) {
    return res.status(403).json({ error: "Unauthorized access: Invalid token" });
  }

  const { key, balance } = req.query;
  if (!key) {
    return res.status(400).json({ error: "Missing key" });
  }
  if (!balance) {
    return res.status(400).json({ error: "Missing balance" });
  }

  // Initialize the balance using the function from 'filter.js'
  const result = await initBalance(key, balance);
  
  cookiesCount = cookies.length; // Update the cookies count
  res.json({ message: "Key added successfully" });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
