pragma solidity 0.5.0;

import "./CommunityToken.sol";
import "./Parameters.sol";
import "./CommunityCore.sol";

library LibCoreFactory{
  function createNewCore(
    BandToken _bandToken,
    CommunityToken _commToken,
    ParametersInterface _params,
    uint256[] calldata _expressions
  )
    external
    returns(CommunityCore)
  {
    return new CommunityCore(_bandToken, _commToken, _params, _expressions);
  }
}

