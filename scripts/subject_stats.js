const fs = require("fs");
const path = require("path");

async function main() {
  const addrs = JSON.parse(fs.readFileSync(path.join(__dirname, ".addr.localhost.json")));
  const abi = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "abi", "reputationWithZK.exact.json")));
  const [ , account1 ] = await ethers.getSigners();
  const zk = new ethers.Contract(addrs.ReputationWithZK, abi, account1);

  const subject = process.env.MODEL_ADDR || account1.address;
  const count = await zk.feedbackCount(subject);
  const sum = await zk.reputationSum(subject);
  const avgBP = await zk.getAverage(subject); // basis points

  console.log(JSON.stringify({
    subject,
    feedbackCount: count.toString(),
    reputationSum: sum.toString(),
    average_percent: (Number(avgBP) / 100).toFixed(2)
  }, null, 2));
}
main().catch(e => { console.error(e); process.exit(1); });
