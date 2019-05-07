pragma solidity 0.5.0;

import "../data/TCR.sol";

library TCRFactory {
  function create(
    bytes8 prefix,
    CommunityToken token,
    Parameters params,
    VotingInterface voting,
    ExpressionInterface decayFunction
  )
    external
    returns (TCR)
  {
    return new TCR(prefix, token, params, voting, decayFunction);
  }
}
