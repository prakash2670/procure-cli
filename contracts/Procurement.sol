// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Procurement {
    address public admin;
    uint256 public nextRequestId = 1;

    enum Status { Created, Approved, Tendering, Ordered, Delivered, Received, Paid, Cancelled }

    struct Bid {
        address vendor;
        uint256 amount;
        uint256 timestamp;
    }

    struct Request {
        uint256 id;
        address requester;
        string description;
        uint256 estimatedAmount;
        Status status;
        uint256 createdAt;
        address winner;
        uint256 winningBid;
        bool delivered;
    }

    mapping(uint256 => Request) private requests;
    mapping(uint256 => Bid[]) private bidsForRequest;
    uint256[] private requestIds;

    event RequestCreated(uint256 indexed id, address indexed requester, uint256 estimatedAmount, uint256 ts);
    event RequestApproved(uint256 indexed id, address indexed approver, uint256 ts);
    event TenderStarted(uint256 indexed id, uint256 ts);
    event BidSubmitted(uint256 indexed id, address indexed vendor, uint256 amount, uint256 ts);
    event TenderAwarded(uint256 indexed id, address indexed vendor, uint256 amount, uint256 ts);
    event VendorDelivered(uint256 indexed id, address indexed vendor, uint256 ts);
    event RequesterConfirmed(uint256 indexed id, address indexed requester, uint256 ts);
    event RequestPaid(uint256 indexed id, address indexed payer, uint256 amount, uint256 ts);
    event RequestCancelled(uint256 indexed id, address indexed cancelledBy, uint256 ts);

    modifier onlyAdmin() { require(msg.sender == admin, "only admin"); _; }
    modifier exists(uint256 id) { require(id > 0 && id < nextRequestId, "invalid id"); _; }

    constructor(address _admin) {
        admin = _admin;
    }

    function createRequest(string calldata description, uint256 estimatedAmount) external returns (uint256) {
        uint256 id = nextRequestId++;
        Request memory r = Request({
            id: id,
            requester: msg.sender,
            description: description,
            estimatedAmount: estimatedAmount,
            status: Status.Created,
            createdAt: block.timestamp,
            winner: address(0),
            winningBid: 0,
            delivered: false
        });
        requests[id] = r;
        requestIds.push(id);
        emit RequestCreated(id, msg.sender, estimatedAmount, block.timestamp);
        return id;
    }

    function approveRequest(uint256 id) external onlyAdmin exists(id) {
        Request storage r = requests[id];
        require(r.status == Status.Created, "must be Created");
        r.status = Status.Approved;
        emit RequestApproved(id, msg.sender, block.timestamp);
        r.status = Status.Tendering;
        emit TenderStarted(id, block.timestamp);
    }

    function submitBid(uint256 id, uint256 amount) external exists(id) {
        Request storage r = requests[id];
        require(r.status == Status.Tendering, "not in tendering");
        bidsForRequest[id].push(Bid({vendor: msg.sender, amount: amount, timestamp: block.timestamp}));
        emit BidSubmitted(id, msg.sender, amount, block.timestamp);
    }

    function awardTender(uint256 id, address vendor, uint256 amount) external onlyAdmin exists(id) {
        Request storage r = requests[id];
        require(r.status == Status.Tendering, "not in tendering");
        bool found = false;
        Bid[] storage arr = bidsForRequest[id];
        for (uint i = 0; i < arr.length; i++) {
            if (arr[i].vendor == vendor && arr[i].amount == amount) { found = true; break; }
        }
        require(found, "vendor bid not found");
        r.winner = vendor;
        r.winningBid = amount;
        r.status = Status.Ordered;
        emit TenderAwarded(id, vendor, amount, block.timestamp);
    }

    function markDelivered(uint256 id) external exists(id) {
        Request storage r = requests[id];
        require(r.status == Status.Ordered, "not ordered");
        require(msg.sender == r.winner, "only winner vendor");
        r.delivered = true;
        r.status = Status.Delivered;
        emit VendorDelivered(id, msg.sender, block.timestamp);
    }

    function confirmReceived(uint256 id) external exists(id) {
        Request storage r = requests[id];
        require(r.status == Status.Delivered, "not delivered");
        require(msg.sender == r.requester, "only requester");
        r.status = Status.Received;
        emit RequesterConfirmed(id, msg.sender, block.timestamp);
    }

    function payRequest(uint256 id) external payable onlyAdmin exists(id) {
        Request storage r = requests[id];
        require(r.status == Status.Received, "not received");
        require(r.winner != address(0), "no winner");
        uint256 amountToPay = r.winningBid;
        require(msg.value >= amountToPay, "insufficient payment");
        r.status = Status.Paid;
        (bool ok, ) = r.winner.call{value: amountToPay}("");
        require(ok, "transfer failed");
        emit RequestPaid(id, msg.sender, amountToPay, block.timestamp);
    }

    function cancelRequest(uint256 id) external exists(id) {
        Request storage r = requests[id];
        require(msg.sender == admin || msg.sender == r.requester, "only requester/admin");
        require(r.status == Status.Created || r.status == Status.Tendering || r.status == Status.Approved, "cannot cancel");
        r.status = Status.Cancelled;
        emit RequestCancelled(id, msg.sender, block.timestamp);
    }

    function getRequestIds() external view returns (uint256[] memory) { return requestIds; }

    function getRequest(uint256 id) external view exists(id) returns (
        uint256, address, string memory, uint256, Status, uint256, address, uint256, bool
    ) {
        Request storage r = requests[id];
        return (r.id, r.requester, r.description, r.estimatedAmount, r.status, r.createdAt, r.winner, r.winningBid, r.delivered);
    }

    function getBids(uint256 id) external view exists(id) returns (Bid[] memory) {
        return bidsForRequest[id];
    }
}
