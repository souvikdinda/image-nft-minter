// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract NFTCollection is ERC721, ERC721URIStorage {
    uint256 private _currentTokenId;
    mapping(address => uint256[]) private _ownedTokens;

    constructor(string memory name, string memory symbol) ERC721(name, symbol) {}

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

    /**
     * @dev Override the transferFrom function to update ownership mappings.
     */
    function transferFrom(address from, address to, uint256 tokenId) public override(ERC721, IERC721) {
        require(from != address(0), "Transfer from zero address");
        require(to != address(0), "Transfer to zero address");

        _removeTokenFromOwner(from, tokenId);
        _addTokenToOwner(to, tokenId);

        super.transferFrom(from, to, tokenId);
    }

    /**
     * @dev Override the safeTransferFrom function to update ownership mappings.
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public override(ERC721, IERC721) {
        require(from != address(0), "Transfer from zero address");
        require(to != address(0), "Transfer to zero address");

        _removeTokenFromOwner(from, tokenId);
        _addTokenToOwner(to, tokenId);

        super.safeTransferFrom(from, to, tokenId, data);
    }

    /**
     * @dev Helper function to add a token to the owner's list.
     */
    function _addTokenToOwner(address owner, uint256 tokenId) internal {
        _ownedTokens[owner].push(tokenId);
    }

    /**
     * @dev Helper function to remove a token from the owner's list.
     */
    function _removeTokenFromOwner(address owner, uint256 tokenId) internal {
        uint256[] storage ownerTokens = _ownedTokens[owner];
        for (uint256 i = 0; i < ownerTokens.length; i++) {
            if (ownerTokens[i] == tokenId) {
                ownerTokens[i] = ownerTokens[ownerTokens.length - 1];
                ownerTokens.pop();
                break;
            }
        }
    }

    function getTokensOfOwner(address owner) public view returns (uint256[] memory) {
        return _ownedTokens[owner];
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
