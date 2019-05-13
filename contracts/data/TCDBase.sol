pragma solidity 0.5.0;

import "openzeppelin-solidity/contracts/math/Math.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../utils/ArrayUtils.sol";


contract TCDBase {
  using SafeMath for uint256;

  address[] public dataSources;
  event DelegatedDataSourcesChanged();
  event DataRead(address indexed reader, bytes32 indexed key);

  modifier requirePayment() {
    uint256 price = getQueryPrice();
    require(msg.value >= price);
    if (msg.value > price) {
      msg.sender.transfer(msg.value.sub(price));
    }
    _;
  }

  function getQueryPrice() public view returns (uint256);

  function getActiveDataSourceCount() public view returns (uint256) {
    return dataSources.length;
  }

  function getAllDataSourceCount() public view returns (uint256) {
    return dataSources.length;
  }

  function getAsNumber(bytes32 key) public payable requirePayment returns (uint256) {
    return ArrayUtils.getMedian(_loadDataAt(key));
  }

  function getAsBytes32(bytes32 key) public payable requirePayment returns (bytes32) {
    return bytes32(ArrayUtils.getMajority(_loadDataAt(key)));
  }

  function getAsBool(bytes32 key) public payable requirePayment returns (bool) {
    return ArrayUtils.getMajority(_loadDataAt(key)) != 0;
  }

  function _loadDataAt(bytes32 key) internal returns (uint256[] memory) {
    uint256[] memory rawdata = new uint256[](dataSources.length);
    uint256 rawdataLength = 0;
    uint256 activeDataSourceCount = Math.min(getActiveDataSourceCount(), dataSources.length);
    for (uint256 index = 0; index < activeDataSourceCount; ++index) {
      address source = dataSources[index];
      (bool ok, bytes memory ret) = source.call(abi.encodeWithSignature("get(bytes32)", key));
      if (!ok || ret.length < 32) continue;
      uint256 value;
      assembly { value := mload(add(ret, 0x20)) }
      rawdata[rawdataLength++] = value;
    }
    require(rawdataLength > 0);
    uint256[] memory data = new uint256[](rawdataLength);
    for (uint256 index = 0; index < rawdataLength; ++index) {
      data[index] = rawdata[index];
    }
    emit DataRead(msg.sender, key);
    return data;
  }
}
