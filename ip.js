const os = require('os');
const axios = require('axios');
const http = require('http');
const https = require('https');

let cachedPublicIPs = null;

function getPublicIPAddresses() {
  if (cachedPublicIPs) {
    return cachedPublicIPs;
  }

  const interfaces = os.networkInterfaces();
  const publicIPs = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // 跳过内部（本地环回）接口和未分配的地址
      if (iface.internal || !iface.address || iface.family !== 'IPv6') {
        continue;
      }

      // 直接添加到结果数组中
      publicIPs.push(iface.address);
    }
  }

  cachedPublicIPs = publicIPs;
  console.log('Public IP addresses:', publicIPs);
  return publicIPs;
}

function getRandomPublicIPAddress() {
  const publicIPs = getPublicIPAddresses();
  if (publicIPs.length === 0) {
    throw new Error('No public IP addresses found');
  }
  const randomIndex = Math.floor(Math.random() * publicIPs.length);
  return publicIPs[randomIndex];
}

function createAgent(localAddress) {
  return {
    httpAgent: new http.Agent({ localAddress }),
    httpsAgent: new https.Agent({ localAddress })
  };
}

async function sendRequest(url, data, headers) {
    const localAddress = getRandomPublicIPAddress();
    const { httpAgent, httpsAgent } = createAgent(localAddress);
  
    try {
      const response = await axios.post(url, data, {
        headers,
        httpAgent,
        httpsAgent
      });
      return response;
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  module.exports = { sendRequest };