import { createClient } from 'redis';

const redisServer = process.env.KV_URL || "redis://127.0.0.1:6379";

const client = createClient({
  url: redisServer
});

client.connect();

// 初始化余额并设置过期时间为31天
export function initBalance(key, balance) {
  console.log("initBalance", key, balance)
  console.log(redisServer)
  return client.setEx(key, 2678400, balance);
}

// 获取余额
export function getBalance(key) {
  return client.get(key).then(balance => balance).catch(() => false);
}

// 扣除余额
export function deductBalance(key, amount) {
  return client.decrBy(key, amount).then(balance => balance).catch(() => false);
}

// 检查当前余额是否足够
export function checkBalance(key, text) {
  return new Promise((resolve, reject) => {
    client.get(key).then(balance => {
      if (balance >= countBytes(text)) {
        resolve(true);
      } else {
        resolve(false);
      }
    }).catch(() => {
      reject(false);
    });
  });
}

// 计算当前字节数
export function countBytes(text) {
  return Buffer.byteLength(text, 'utf8');
}