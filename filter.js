const Redis = require("ioredis");
const client = new Redis(process.env.REDIS_URL, {
  tls: {
    rejectUnauthorized: false
  }
});

// 初始化余额
export function initBalance(key, balance) {
  return client.set(key, balance);
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

// 检查当前余额是否足够
export function checkBalance(key, text) {
  return client.get(key, (err, balance) => {
    if (err) {
      return false;
    }
    return balance >= countBytes(text);
  });
}

// 计算当前字节数
export function countBytes(text) {
  return Buffer.byteLength(text, 'utf8');
}