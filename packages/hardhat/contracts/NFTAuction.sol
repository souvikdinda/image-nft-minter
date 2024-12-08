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
        address nftContract;
        uint256 tokenId;
    }

    mapping(address => mapping(uint256 => Auction)) public auctions;
    mapping(address => mapping(uint256 => Auction)) public settledAuctions;
    address[] public auctionContracts;
    mapping(address => uint256[]) public auctionTokenIds;
    address public feeRecipient;
    uint256 public feePercent;
    
    event AuctionCreated(address indexed nftContract, uint256 indexed tokenId, uint256 endTime, uint256 startingBid);
    event BidPlaced(address indexed nftContract, uint256 indexed tokenId, address bidder, uint256 amount);
    event AuctionSettled(address indexed nftContract, uint256 indexed tokenId, address winner, uint256 amount);

    constructor(address _feeRecipient, uint256 _feePercent) {
        feeRecipient = _feeRecipient;
        feePercent = _feePercent;
    }

    function createAuction(address nftContract, uint256 tokenId, uint256 startingBid, uint256 duration) external {
        require(auctions[nftContract][tokenId].endTime == 0, "Auction already exists");
        require(startingBid > 0, "Starting bid must be greater than zero");
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
            settled: false,
            nftContract: nftContract,
            tokenId: tokenId
        });

        if (auctionTokenIds[nftContract].length == 0) {
            auctionContracts.push(nftContract);
        }
        auctionTokenIds[nftContract].push(tokenId);

        emit AuctionCreated(nftContract, tokenId, endTime, startingBid);
    }

    function placeBid(address nftContract, uint256 tokenId) external payable nonReentrant {
        Auction storage auction = auctions[nftContract][tokenId];
        require(block.timestamp < auction.endTime, "Auction ended");
        require(msg.sender != auction.seller, "Seller cannot bid on their own auction");
        require(msg.value > auction.highestBid, "Bid too low");

        if (auction.highestBid > 0 && auction.highestBidder != address(0)) {
            address previousBidder = auction.highestBidder;
            uint256 previousBid = auction.highestBid;

            (bool refundSuccess, ) = previousBidder.call{ value: previousBid }("");
            require(refundSuccess, "Refund to previous bidder failed");
        }

        auction.highestBid = msg.value;
        auction.highestBidder = msg.sender;

        emit BidPlaced(nftContract, tokenId, msg.sender, msg.value);
    }

    function settleAuction(address nftContract, uint256 tokenId) external nonReentrant {
        Auction storage auction = auctions[nftContract][tokenId];
        require(auction.endTime > 0, "Auction does not exist");
        require(block.timestamp >= auction.endTime, "Auction not ended");
        require(!auction.settled, "Auction already settled");
        require(
            msg.sender == auction.seller || msg.sender == auction.highestBidder,
            "Only the seller or highest bidder can settle the auction"
        );

        auction.settled = true;

        if (auction.highestBid > 0 && auction.highestBidder != address(0)) {
            uint256 fee = (auction.highestBid * feePercent) / 10000;
            uint256 sellerProceeds = auction.highestBid - fee;

            (bool feeTransferSuccess, ) = feeRecipient.call{ value: fee }("");
            require(feeTransferSuccess, "Fee transfer failed");

            (bool sellerTransferSuccess, ) = auction.seller.call{ value: sellerProceeds }("");
            require(sellerTransferSuccess, "Seller transfer failed");

            IERC721(nftContract).transferFrom(address(this), auction.highestBidder, tokenId);
        } else {
            IERC721(nftContract).transferFrom(address(this), auction.seller, tokenId);
        }

        settledAuctions[nftContract][tokenId] = auction;

        delete auctions[nftContract][tokenId];
        _removeAuction(nftContract, tokenId);

        emit AuctionSettled(nftContract, tokenId, auction.highestBidder, auction.highestBid);
    }

    function getAuction(address nftContract, uint256 tokenId) external view returns (Auction memory) {
        return auctions[nftContract][tokenId];
    }

    function getAllActiveAuctions() external view returns (Auction[] memory activeAuctions) {
        uint256 totalActive = 0;

        for (uint256 i = 0; i < auctionContracts.length; i++) {
            address nftContract = auctionContracts[i];
            uint256[] storage tokenIds = auctionTokenIds[nftContract];
            for (uint256 j = 0; j < tokenIds.length; j++) {
                if (!auctions[nftContract][tokenIds[j]].settled) {
                    totalActive++;
                }
            }
        }

        activeAuctions = new Auction[](totalActive);
        uint256 index = 0;

        for (uint256 i = 0; i < auctionContracts.length; i++) {
            address nftContract = auctionContracts[i];
            uint256[] storage tokenIds = auctionTokenIds[nftContract];
            for (uint256 j = 0; j < tokenIds.length; j++) {
                Auction storage auction = auctions[nftContract][tokenIds[j]];
                if (!auction.settled) {
                    activeAuctions[index] = auction;
                    index++;
                }
            }
        }

        return activeAuctions;
    }

    function getAllAuctions() external view returns (Auction[] memory allAuctions) {
        uint256 totalAuctions = 0;

        for (uint256 i = 0; i < auctionContracts.length; i++) {
            totalAuctions += auctionTokenIds[auctionContracts[i]].length;
        }

        allAuctions = new Auction[](totalAuctions);
        uint256 index = 0;

        for (uint256 i = 0; i < auctionContracts.length; i++) {
            address nftContract = auctionContracts[i];
            uint256[] storage tokenIds = auctionTokenIds[nftContract];
            for (uint256 j = 0; j < tokenIds.length; j++) {
                allAuctions[index] = auctions[nftContract][tokenIds[j]];
                index++;
            }
        }

        return allAuctions;
    }

    function isAuctionSettled(address nftContract, uint256 tokenId) external view returns (bool) {
        return settledAuctions[nftContract][tokenId].endTime != 0;
    }


    function _removeAuction(address nftContract, uint256 tokenId) internal {
        uint256[] storage tokenIds = auctionTokenIds[nftContract];
        for (uint256 i = 0; i < tokenIds.length; i++) {
            if (tokenIds[i] == tokenId) {
                tokenIds[i] = tokenIds[tokenIds.length - 1];
                tokenIds.pop();
                break;
            }
        }

        if (auctionTokenIds[nftContract].length == 0) {
            for (uint256 i = 0; i < auctionContracts.length; i++) {
                if (auctionContracts[i] == nftContract) {
                    auctionContracts[i] = auctionContracts[auctionContracts.length - 1];
                    auctionContracts.pop();
                    break;
                }
            }
        }
    }
}
