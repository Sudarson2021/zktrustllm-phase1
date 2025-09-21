const fs=require("fs"); const c=require("crypto");
const V3=artifacts.require("LLMReputationV3");
module.exports=async function(cb){
  try{
    const addr=process.env.CONTRACT; if(!addr) throw new Error("Set CONTRACT");
    const file=process.argv[process.argv.indexOf("--")+1]; if(!file) throw new Error("Usage: truffle exec ... -- evidence.bin");
    const h="0x"+c.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
    const v3=await V3.at(addr); const [,oracle]=await web3.eth.getAccounts();
    const tx=await v3.submitScoresWithEvidence(1,92,90,99,"ipfs://demo-cid",h,{from:oracle});
    console.log("Tx:",tx.tx,"\nHash:",h); cb();
  }catch(e){cb(e)}
}
