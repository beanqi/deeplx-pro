import Redis from "ioredis";

const redisServer = process.env.KV_URL || "redis://127.0.0.1:6379";

const client = new Redis(redisServer);

// 初始化余额并设置过期时间为31天
export function initBalance(key, balance) {
  console.log("initBalance", key, balance)
  console.log(redisServer)
  return client.set(key, balance, 'EX', 2678400);
}

// 获取余额
export function getBalance(key) {
  return client.get(key, (err, balance) => {
    if (err) {
      return false;
    }
    return balance;
  });
}

// 扣除余额
export function deductBalance(key, amount) {
  return client.decrby(key, amount, (err, balance) => {
    if (err) {
      return false;
    }
    return balance;
  });
}

// filter.js

// 检查当前余额是否足够
export function checkBalance(key, text) {
  return new Promise((resolve, reject) => {
    client.get(key, (err, balance) => {
      if (err) {
        reject(false);  // Reject the promise if there's an error
      } else {
        resolve(balance >= countBytes(text));  // Resolve with the comparison result
      }
    });
  });
}

// 计算当前字节数
export function countBytes(text) {
  return Buffer.byteLength(text, 'utf8');
}