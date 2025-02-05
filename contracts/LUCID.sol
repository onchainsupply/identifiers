// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable2Step.sol";

/// @title LUCID - Linked Universal Chain Identity Directory by ONCHAINSUPPLY
/// @notice A unified identity management system with cross-account linking
contract LUCID is Ownable2Step {
    event IdentityCreated(
        uint256 indexed identityId,
        string provider,
        string uid,
        address wallet
    );
    event IdentitiesLinked(uint256[] ids, uint256 indexed rootId);
    event SocialAdded(uint256 indexed identityId, string provider, string uid);
    event WalletAdded(uint256 indexed identityId, address wallet);

    uint256 public totalIdentities;

    struct SocialProfile {
        string provider;
        string uid;
        string image;
        string name;
    }

    struct Identity {
        uint256 id;
        string handle;
        address[] wallets;
        SocialProfile[] socials;
    }

    mapping(uint256 => Identity) public identities;
    mapping(uint256 => uint256) public identityGraph;
    mapping(bytes32 => uint256) public socialToIdentity;
    mapping(address => uint256) public walletToIdentity;

    constructor() Ownable(msg.sender) {}

    // Main registration
    function register(bytes calldata data) external {
        (
            string memory provider,
            string memory uid,
            string memory name,
            string memory image
        ) = abi.decode(data, (string, string, string, string));

        bytes32 socialHash = keccak256(abi.encode(provider, uid));
        require(socialToIdentity[socialHash] == 0, "Social account exists");

        totalIdentities++;
        uint256 newId = totalIdentities;

        socialToIdentity[socialHash] = newId;

        // Fix for socials array
        SocialProfile[] memory initialSocials = new SocialProfile[](1);
        initialSocials[0] = SocialProfile(provider, uid, image, name);

        identities[newId] = Identity({
            id: newId,
            handle: name,
            wallets: new address[](0),
            socials: initialSocials
        });

        emit IdentityCreated(newId, provider, uid, address(0));
    }

    function registerAddress(bytes calldata data) external {
        address wallet = abi.decode(data, (address));
        require(walletToIdentity[wallet] == 0, "Wallet exists");

        totalIdentities++;
        uint256 newId = totalIdentities;

        walletToIdentity[wallet] = newId;

        address[] memory initialWallets = new address[](1);
        initialWallets[0] = wallet;

        identities[newId] = Identity({
            id: newId,
            handle: "",
            wallets: initialWallets,
            socials: new SocialProfile[](0)
        });

        emit IdentityCreated(newId, "wallet", "", wallet);
    }

    // Identity linking
    function link(uint256[] calldata ids) external {
        require(ids.length >= 2, "Need at least 2 IDs");

        for (uint i = 0; i < ids.length; i++) {
            require(ids[i] != 0 && ids[i] <= totalIdentities, "Invalid ID");
        }

        uint256 primary = findRoot(ids[0]);
        for (uint i = 1; i < ids.length; i++) {
            uint256 current = findRoot(ids[i]);
            if (current != primary) {
                mergeAccounts(primary, current);
                identityGraph[current] = primary;
            }
        }
        emit IdentitiesLinked(ids, primary);
    }

    // Helper functions
    function findRoot(uint256 id) public view returns (uint256) {
        while (identityGraph[id] != 0) {
            id = identityGraph[id];
        }
        return id;
    }

    function mergeAccounts(uint256 target, uint256 source) private {
        Identity storage t = identities[target];
        Identity storage s = identities[source];

        // Merge wallets
        for (uint i = 0; i < s.wallets.length; i++) {
            address w = s.wallets[i];
            if (walletToIdentity[w] == source) {
                walletToIdentity[w] = target;
                t.wallets.push(w);
                emit WalletAdded(target, w);
            }
        }

        // Merge socials
        for (uint i = 0; i < s.socials.length; i++) {
            SocialProfile memory n = s.socials[i];
            bytes32 hash = keccak256(abi.encode(n.provider, n.uid));
            if (socialToIdentity[hash] == source) {
                socialToIdentity[hash] = target;

                // Explicitly create new storage entry
                t.socials.push(
                    SocialProfile({
                        provider: n.provider,
                        uid: n.uid,
                        image: n.image,
                        name: n.name
                    })
                );

                emit SocialAdded(target, n.provider, n.uid);
            }
        }
    }

    function getFullAccount(
        uint256 id
    )
        external
        view
        returns (
            string memory handle,
            address[] memory wallets,
            SocialProfile[] memory socials
        )
    {
        uint256 root = findRoot(id);
        Identity storage acc = identities[root];
        return (acc.handle, acc.wallets, acc.socials);
    }

    function getUserIdBySocial(
        string memory provider,
        string memory uid
    ) public view returns (uint256) {
        bytes32 hash = keccak256(abi.encode(provider, uid));
        uint256 id = socialToIdentity[hash];
        require(id != 0, "Social account not found");
        return findRoot(id); // Returns root ID if account was merged
    }

    function getUserIdByWallet(address wallet) public view returns (uint256) {
        uint256 id = walletToIdentity[wallet];
        require(id != 0, "Wallet not found");
        return findRoot(id); // Returns root ID if account was merged
    }
}
