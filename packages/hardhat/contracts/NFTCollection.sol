// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract NFTCollection is ERC721URIStorage {
    uint256 private _currentTokenId;
    mapping(address => uint256[]) private _ownedTokens;

    constructor(
        string memory name,
        string memory symbol
    ) ERC721(name, symbol) {}

    /**
     * @dev Mint a new NFT with metadata stored at an IPFS URL.
     * @param owner The address of the NFT owner.
     * @return tokenId The ID of the minted NFT.
     */
    function mintToken(address owner, string memory ipfsHash) public returns (uint256) {
        _currentTokenId++;
        uint256 tokenId = _currentTokenId;

        _safeMint(owner, tokenId);
        _setTokenURI(tokenId, string(abi.encodePacked("ipfs://", ipfsHash)));
        _ownedTokens[owner].push(tokenId);
        return tokenId;
    }

    /**
     * @notice Get the total number of tokens minted
     * @return total Total number of tokens minted so far
     */
    function totalMinted() public view returns (uint256) {
        return _currentTokenId;
    }

    function getTokensOfOwner(address owner) public view returns (uint256[] memory) {
        return _ownedTokens[owner];
    }
}