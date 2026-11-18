// 1. Infura Configuration
// ใส่ Infura API Key ของตัวเองแทน YOUR_INFURA_API_KEY
const INFURA_RPC_URL =
  "https://sepolia.infura.io/v3/2bf36610439d42cfba48388c2656d587";

// เชื่อมต่อ Sepolia ผ่าน Infura
const infuraWeb3 = new Web3(INFURA_RPC_URL);

// 2. Smart Contract Configuration
// ใช้ Contract Address เดิมจาก Assignment 6
const contractAddress =
  "0x7ca6bd2e327b247ffe68230ee4ffc5eb801e6dbb";

// ABI สำหรับ Ethers.js (MetaMask)
const contractABI = [
  "function deposit() payable",
  "function withdraw(uint256 amount)",
  "function checkBalance() view returns (uint256)",
];

// ABI สำหรับ Web3.js (Infura)
const web3ContractABI = [
  {
    inputs: [],
    name: "checkBalance",
    outputs: [
      {
        name: "balance",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

// สร้าง Contract สำหรับอ่านข้อมูลผ่าน Infura
const infuraContract = new infuraWeb3.eth.Contract(
  web3ContractABI,
  contractAddress
);

// Sepolia Network
const SEPOLIA_CHAIN_ID = "0xaa36a7";

// 3. Variables
let provider;
let signer;
let contract;

// 4. HTML Elements
const connectBtn = document.getElementById("connectBtn");
const checkBtn = document.getElementById("checkBtn");
const depositBtn = document.getElementById("depositBtn");
const withdrawBtn = document.getElementById("withdrawBtn");

const walletAddress = document.getElementById("walletAddress");
const balance = document.getElementById("balance");
const amountInput = document.getElementById("amount");
const statusText = document.getElementById("status");

// 5. Display Status
function showStatus(message) {
  statusText.textContent = message;
}

// 6. Error Handling
function getError(error) {
  if (
    error.code === 4001 ||
    error.code === "ACTION_REJECTED"
  ) {
    return "Transaction cancelled.";
  }

  return (
    error.shortMessage ||
    error.message ||
    "Something went wrong."
  );
}

// 7. Test Infura Connection
async function testInfuraConnection() {
  try {
    const blockNumber = await infuraWeb3.eth.getBlockNumber();

    console.log(
      "Infura connected! Latest Sepolia block:",
      blockNumber.toString()
    );
  } catch (error) {
    console.error("Infura connection failed:", error);
  }
}

// 8. Connect MetaMask
async function connectWallet() {
  try {
    if (!window.ethereum) {
      showStatus("Please install MetaMask.");
      return;
    }

    const chainId = await window.ethereum.request({
      method: "eth_chainId",
    });

    if (chainId.toLowerCase() !== SEPOLIA_CHAIN_ID) {
      showStatus("Please switch MetaMask to Sepolia Testnet.");
      return;
    }

    provider = new ethers.BrowserProvider(window.ethereum);

    await provider.send("eth_requestAccounts", []);

    signer = await provider.getSigner();

    contract = new ethers.Contract(
      contractAddress,
      contractABI,
      signer
    );

    const address = await signer.getAddress();

    walletAddress.textContent = address;
    connectBtn.textContent = "Wallet Connected";

    showStatus("Wallet connected successfully.");

    // อ่านยอดเงินผ่าน Infura
    await checkBalance();

  } catch (error) {
    showStatus(getError(error));
  }
}

// 9. Check Balance via Infura + Web3.js
async function checkBalance() {
  try {
    if (!signer) {
      showStatus("Please connect your wallet first.");
      return;
    }

    // ดึง Wallet Address จาก MetaMask
    const address = await signer.getAddress();

    // อ่านยอดเงินจาก Smart Contract ผ่าน Infura
    const result = await infuraContract.methods
      .checkBalance()
      .call({ from: address });

    // แปลง Wei เป็น ETH
    const ethBalance = infuraWeb3.utils.fromWei(
      result.toString(),
      "ether"
    );

    balance.textContent = ethBalance + " ETH";

    showStatus("Balance updated via Infura.");

    console.log("Balance from Infura:", ethBalance, "ETH");

  } catch (error) {
    showStatus(getError(error));
    console.error("Check Balance Error:", error);
  }
}

// 10. Validate ETH Amount
function getAmount() {
  const value = amountInput.value.trim();

  if (!/^\d+(\.\d+)?$/.test(value)) {
    throw new Error("Please enter a valid ETH amount.");
  }

  const amount = ethers.parseEther(value);

  if (amount <= 0n) {
    throw new Error("Amount must be greater than zero.");
  }

  return amount;
}

// 11. Deposit ETH
async function deposit() {
  try {
    if (!contract) {
      showStatus("Please connect your wallet first.");
      return;
    }

    const amount = getAmount();

    showStatus("Waiting for MetaMask confirmation...");

    // ฝากเงินผ่าน MetaMask
    const tx = await contract.deposit({
      value: amount,
    });

    showStatus("Transaction pending...");

    const receipt = await tx.wait();

    if (receipt.status !== 1) {
      throw new Error("Transaction failed.");
    }

    // อัปเดตยอดเงินผ่าน Infura
    await checkBalance();

    showStatus("Deposit successful!");
    amountInput.value = "";

    console.log("Deposit transaction:", tx.hash);

  } catch (error) {
    showStatus(getError(error));
    console.error("Deposit Error:", error);
  }
}

// 12. Withdraw ETH
async function withdraw() {
  try {
    if (!contract) {
      showStatus("Please connect your wallet first.");
      return;
    }

    const amount = getAmount();

    // ตรวจสอบยอดเงินผ่าน Infura
    const address = await signer.getAddress();

    const available = await infuraContract.methods
      .checkBalance()
      .call({ from: address });

    if (amount > BigInt(available.toString())) {
      showStatus("Insufficient bank balance.");
      return;
    }

    showStatus("Waiting for MetaMask confirmation...");

    // ถอนเงินผ่าน MetaMask
    const tx = await contract.withdraw(amount);

    showStatus("Transaction pending...");

    const receipt = await tx.wait();

    if (receipt.status !== 1) {
      throw new Error("Transaction failed.");
    }

    // อัปเดตยอดเงินผ่าน Infura
    await checkBalance();

    showStatus("Withdrawal successful!");
    amountInput.value = "";

    console.log("Withdraw transaction:", tx.hash);

  } catch (error) {
    showStatus(getError(error));
    console.error("Withdraw Error:", error);
  }
}

// 13. Button Events
connectBtn.addEventListener("click", connectWallet);
checkBtn.addEventListener("click", checkBalance);
depositBtn.addEventListener("click", deposit);
withdrawBtn.addEventListener("click", withdraw);

// 14. MetaMask Account / Network Changes
if (window.ethereum) {
  window.ethereum.on("accountsChanged", () => {
    window.location.reload();
  });

  window.ethereum.on("chainChanged", () => {
    window.location.reload();
  });
}

// 15. Start Infura Connection Test
testInfuraConnection();
