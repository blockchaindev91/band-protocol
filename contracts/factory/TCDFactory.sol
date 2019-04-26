pragma solidity 0.5.0;

import "../BandSimpleExchange.sol";
import "../BandToken.sol";
import "../CommunityToken.sol";
import "../ParametersBase.sol";
import "../bonding/BondingCurve.sol";
import "../data/TCD.sol";

contract TCDFactory {
  function create(
    BandToken band,
    CommunityToken token, 
    ParametersBase params,
    BondingCurve bondingCurve,
    BandSimpleExchange exchange
  ) external returns (TCD) {
    return new TCD(band, token, params, bondingCurve, exchange);
  }
}