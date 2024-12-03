// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract NFTAuction is ReentrancyGuard {
    struct Auction {
        address seller;
        address highestBidder;
        uint256 highestBid;
        uint256 endTime;
        bool settled;
    }

    mapping(address => mapping(uint256 => Auction)) public auctions;
    mapping(address => uint256) public pendingWithdrawals;
    address public feeRecipient;
    uint256 public feePercent;

    event AuctionCreated(address indexed nftContract, uint256 indexed tokenId, uint256 endTime, uint256 startingBid);
    event BidPlaced(address indexed nftContract, uint256 indexed tokenId, address bidder, uint256 amount);
    event AuctionSettled(address indexed nftContract, uint256 indexed tokenId, address winner, uint256 amount);

    constructor(address _feeRecipient, uint256 _feePercent) {
        feeRecipient = _feeRecipient;
        feePercent = _feePercent;
    }

    function createAuction(
        address nftContract,
        uint256 tokenId,
        uint256 startingBid,
        uint256 duration
    ) external {
        require(auctions[nftContract][tokenId].endTime == 0, "Auction already exists");
        require(duration > 0, "Duration must be greater than zero");
        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "Not the NFT owner");

        nft.transferFrom(msg.sender, address(this), tokenId);

        uint256 endTime = block.timestamp + duration;
        auctions[nftContract][tokenId] = Auction({
            seller: msg.sender,
            highestBidder: address(0),
            highestBid: startingBid,
            endTime: endTime,
            settled: false
        });

        emit AuctionCreated(nftContract, tokenId, endTime, startingBid);
    }

    function placeBid(address nftContract, uint256 tokenId) external payable nonReentrant {
        Auction storage auction = auctions[nftContract][tokenId];
        require(block.timestamp < auction.endTime, "Auction ended");
        require(msg.value > auction.highestBid, "Bid too low");

        if (auction.highestBid > 0) {
            pendingWithdrawals[auction.highestBidder] += auction.highestBid;
        }

        auction.highestBid = msg.value;
        auction.highestBidder = msg.sender;

        emit BidPlaced(nftContract, tokenId, msg.sender, msg.value);
    }

    function withdraw() external {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No funds to withdraw");

        pendingWithdrawals[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }

    function settleAuction(address nftContract, uint256 tokenId) external nonReentrant {
        Auction storage auction = auctions[nftContract][tokenId];
        require(block.timestamp >= auction.endTime, "Auction not ended");
        require(!auction.settled, "Auction already settled");

        auction.settled = true;

        if (auction.highestBid > 0) {
            uint256 fee = (auction.highestBid * feePercent) / 10000;
            uint256 sellerProceeds = auction.highestBid - fee;

            pendingWithdrawals[feeRecipient] += fee;
            pendingWithdrawals[auction.seller] += sellerProceeds;

            IERC721(nftContract).transferFrom(address(this), auction.highestBidder, tokenId);
        } else {
            IERC721(nftContract).transferFrom(address(this), auction.seller, tokenId);
        }

        emit AuctionSettled(nftContract, tokenId, auction.highestBidder, auction.highestBid);
    }
}
