// api/webhook.js
const axios = require("axios");
const { ethers } = require("ethers");

const COINBASE_API_KEY = "YOUR_COINBASE_API_KEY";  // کلید API شما از Coinbase Commerce
const provider = new ethers.providers.JsonRpcProvider("https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID");
const wallet = new ethers.Wallet("YOUR_PRIVATE_KEY", provider); // کلید خصوصی کیف پول شما
const contractAddress = "YOUR_CONTRACT_ADDRESS"; // آدرس قرارداد شما
const contractABI = [
  {
    "constant": false,
    "inputs": [
      { "name": "to", "type": "address" },
      { "name": "tokenId", "type": "uint256" }
    ],
    "name": "safeTransferFrom",
    "outputs": [],
    "type": "function"
  }
];

const contract = new ethers.Contract(contractAddress, contractABI, wallet);

// بررسی وضعیت پرداخت
async function checkPayment(paymentId) {
  try {
    const response = await axios.get(`https://api.commerce.coinbase.com/charges/${paymentId}`, {
      headers: {
        "X-CC-Api-Key": COINBASE_API_KEY,
        "X-CC-Version": "2018-03-22"
      }
    });

    if (response.data.data.timeline[response.data.data.timeline.length - 1].status === "COMPLETED") {
      console.log("Payment completed!");
      return true;
    } else {
      console.log("Payment pending...");
      return false;
    }
  } catch (error) {
    console.error("Error checking payment status:", error);
    return false;
  }
}

// ارسال NFT به کیف پول کاربر
async function sendNFT(userAddress, tokenId) {
  try {
    const tx = await contract.safeTransferFrom(wallet.address, userAddress, tokenId);
    await tx.wait();
    console.log(`NFT successfully sent to ${userAddress}`);
  } catch (error) {
    console.error("Error sending NFT:", error);
  }
}

// دریافت وب‌هوک و پردازش آن
export default async function handler(req, res) {
  if (req.method === 'POST') {
    const paymentId = req.body.data.id;
    const paymentConfirmed = await checkPayment(paymentId);

    if (paymentConfirmed) {
      const userAddress = req.body.data.metadata.custom;
      const tokenId = req.body.data.metadata.tokenId;
      await sendNFT(userAddress, tokenId);
      return res.status(200).send({ status: 'success' });
    } else {
      return res.status(400).send({ status: 'failed' });
    }
  } else {
    return res.status(405).send({ status: 'method not allowed' });
  }
}