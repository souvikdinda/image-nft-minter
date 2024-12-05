// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

contract NFTCollectionRegistry {
    struct CollectionInfo {
        string name;
        string symbol;
        address owner;
    }
    address[] public allCollections;
    mapping(address => address[]) private ownerToCollections;
    mapping(address => CollectionInfo) private collectionMetadata;

    event CollectionRegistered(address indexed collection, address indexed owner, string name, string symbol);

    /**
     * @dev Registers a new collection with the registry.
     * @param collection The address of the collection contract.
     * @param owner The address of the owner of the collection.
     * @param name The name of the collection.
     * @param symbol The symbol of the collection.
     */
    function registerCollection(address collection, address owner, string memory name, string memory symbol) external {
        require(collection != address(0), "Collection address cannot be zero");
        require(owner != address(0), "Owner address cannot be zero");
        allCollections.push(collection);
        ownerToCollections[owner].push(collection);
        collectionMetadata[collection] = CollectionInfo({ name: name, symbol: symbol, owner: owner });
        emit CollectionRegistered(collection, owner, name, symbol);
    }

    /**
     * @dev Returns all registered collections.
     * @return An array of all collection addresses.
     */
    function getAllCollections() external view returns (address[] memory) {
        return allCollections;
    }

    /**
     * @dev Returns all collections owned by a specific address.
     * @param owner The address of the owner.
     * @return An array of collection addresses owned by the address.
     */
    function getCollectionsByOwner(address owner) external view returns (address[] memory) {
        return ownerToCollections[owner];
    }

    /**
     * @dev Returns metadata for a specific collection.
     * @param collection The address of the collection.
     * @return name The name of the collection.
     * @return symbol The symbol of the collection.
     * @return owner The owner of the collection.
     */
    function getCollectionMetadata(
        address collection
    ) external view returns (string memory name, string memory symbol, address owner) {
        CollectionInfo memory info = collectionMetadata[collection];
        return (info.name, info.symbol, info.owner);
    }
}
