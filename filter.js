import { kv } from '@vercel/kv';

// 初始化余额并设置过期时间为31天
export async function initBalance(key, balance) {
  console.log("initBalance", key, balance);
  await kv.set(key, balance, { ex: 2678400 });
}

// 获取余额
export async function getBalance(key) {
  try {
    const balance = await kv.get(key);
    return balance;
  } catch (error) {
    return false;
  }
}

// 扣除余额
export async function deductBalance(key, amount) {
  try {
    const balance = await kv.get(key);
    const newBalance = balance - amount;
    await kv.set(key, newBalance);
    return newBalance;
  } catch (error) {
    return false;
  }
}

// 检查当前余额是否足够
export async function checkBalance(key, text) {
  try {
    const balance = await kv.get(key);
    if (balance >= countBytes(text)) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
}

// 计算当前字节数
export function countBytes(text) {
  return Buffer.byteLength(text, 'utf8');
}