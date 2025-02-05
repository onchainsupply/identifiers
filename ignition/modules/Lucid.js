const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("LockModule", (m) => {
  const LUCID = m.contract("LUCID");
  return { LUCID };
});
