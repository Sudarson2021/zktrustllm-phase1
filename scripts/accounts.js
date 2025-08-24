module.exports = async function (cb) {
  try {
    const a = await web3.eth.getAccounts();
    a.forEach((x,i)=>console.log(i, x));
    cb();
  } catch (e){ console.error(e); cb(e); }
};
