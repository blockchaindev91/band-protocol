pragma solidity 0.5.8;

import "../data/TCR.sol";

contract TCRFactory {
  event TCRCreated(TCR tcr, address creator);

  function createTCR(
    bytes8 prefix,
    Parameters params,
    BandRegistry registry
  ) external returns(TCR) {
    TCR tcr = new TCR(prefix, params, registry);
    emit TCRCreated(tcr, msg.sender);
    return tcr;
  }
}
