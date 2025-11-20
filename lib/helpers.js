// lib/helpers.js
function statusName(statusNum) {
  const names = ["Created","Approved","Tendering","Ordered","Delivered","Received","Paid","Cancelled"];
  return names[Number(statusNum)] || "Unknown";
}

module.exports = { statusName };
