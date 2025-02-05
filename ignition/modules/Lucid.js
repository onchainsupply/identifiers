const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("Module", (m) => {
  const LUCID = m.contract("LUCID");
  return { LUCID };
});
