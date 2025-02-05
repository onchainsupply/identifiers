const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LUCID", function () {
  let contract;
  let owner, addr1, addr2;

  before(async () => {
    [owner, addr1, addr2] = await ethers.getSigners();
  });

  beforeEach(async () => {
    const LUCID = await ethers.getContractFactory("LUCID");
    contract = await LUCID.deploy();
    await contract.waitForDeployment();
  });

  describe("Registration", () => {
    it("Should register social account", async () => {
      const socialData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["string", "string", "string", "string"],
        ["twitter", "user123", "Alice", "image.jpg"]
      );

      await expect(contract.register(socialData))
        .to.emit(contract, "IdentityCreated")
        .withArgs(1, "twitter", "user123", ethers.ZeroAddress);

      const userId = await contract.getUserIdBySocial("twitter", "user123");
      expect(userId).to.equal(1);
    });

    it("Should register wallet account", async () => {
      const walletData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address"],
        [addr1.address]
      );

      await expect(contract.registerAddress(walletData))
        .to.emit(contract, "IdentityCreated")
        .withArgs(1, "wallet", "", addr1.address);

      const userId = await contract.getUserIdByWallet(addr1.address);
      expect(userId).to.equal(1);
    });

    it("Should prevent duplicate social registration", async () => {
      const socialData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["string", "string", "string", "string"],
        ["github", "dev456", "Bob", "bob.jpg"]
      );

      await contract.register(socialData);
      await expect(contract.register(socialData)).to.be.revertedWith(
        "Social account exists"
      );
    });
  });

  describe("Account Linking", () => {
    beforeEach(async () => {
      // Register 2 social accounts and 1 wallet
      const socialData1 = ethers.AbiCoder.defaultAbiCoder().encode(
        ["string", "string", "string", "string"],
        ["twitter", "user1", "User One", "img1.jpg"]
      );
      await contract.register(socialData1);

      const socialData2 = ethers.AbiCoder.defaultAbiCoder().encode(
        ["string", "string", "string", "string"],
        ["github", "user2", "User Two", "img2.jpg"]
      );
      await contract.register(socialData2);

      const walletData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address"],
        [addr1.address]
      );
      await contract.registerAddress(walletData);
    });

    it("Should link two social accounts", async () => {
      const idsToLink = [1, 2];

      await expect(contract.link(idsToLink))
        .to.emit(contract, "IdentitiesLinked")
        .withArgs([ethers.toBigInt(1), ethers.toBigInt(2)], ethers.toBigInt(1));

      const [username, wallets, socials] = await contract.getFullAccount(1);
      expect(socials.length).to.equal(2);
      expect(wallets.length).to.equal(0);
    });

    it("Should link social and wallet accounts", async () => {
      const idsToLink = [1, 3];
      await contract.link(idsToLink);

      const [username, wallets, socials] = await contract.getFullAccount(1);
      expect(socials.length).to.equal(1);
      expect(wallets.length).to.equal(1);
      expect(wallets[0]).to.equal(addr1.address);
    });

    it("Should prevent circular linking", async () => {
      await contract.link([1, 2]);
      await contract.link([2, 3]);

      const root1 = await contract.findRoot(1);
      const root3 = await contract.findRoot(3);
      expect(root1).to.equal(root3);
    });
  });

  describe("Lookup Functions", () => {
    beforeEach(async () => {
      const socialData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["string", "string", "string", "string"],
        ["discord", "gamer#1234", "Gamer", "avatar.png"]
      );
      await contract.register(socialData);

      const walletData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address"],
        [addr2.address]
      );
      await contract.registerAddress(walletData);
    });

    it("Should find account by social credentials", async () => {
      const userId = await contract.getUserIdBySocial("discord", "gamer#1234");
      expect(userId).to.equal(1);
    });

    it("Should find account by wallet address", async () => {
      const userId = await contract.getUserIdByWallet(addr2.address);
      expect(userId).to.equal(2);
    });

    it("Should return merged account after linking", async () => {
      await contract.link([1, 2]);

      const socialUserId = await contract.getUserIdBySocial(
        "discord",
        "gamer#1234"
      );
      const walletUserId = await contract.getUserIdByWallet(addr2.address);
      expect(socialUserId).to.equal(walletUserId);
    });
  });

  describe("Edge Cases", () => {
    it("Should handle multiple links", async () => {
      // Register 3 accounts
      const socialData1 = ethers.AbiCoder.defaultAbiCoder().encode(
        ["string", "string", "string", "string"],
        ["twitter", "a", "A", ""]
      );
      const socialData2 = ethers.AbiCoder.defaultAbiCoder().encode(
        ["string", "string", "string", "string"],
        ["github", "b", "B", ""]
      );
      const socialData3 = ethers.AbiCoder.defaultAbiCoder().encode(
        ["string", "string", "string", "string"],
        ["discord", "c", "C", ""]
      );

      await contract.register(socialData1);
      await contract.register(socialData2);
      await contract.register(socialData3);

      await contract.link([1, 2]);
      await contract.link([2, 3]);

      const root = await contract.findRoot(3);
      expect(root).to.equal(1);
    });

    it("Should reject invalid links", async () => {
      await expect(contract.link([1])).to.be.revertedWith(
        "Need at least 2 IDs"
      );

      await expect(contract.link([999, 1000])).to.be.revertedWith("Invalid ID");
    });
  });
});
