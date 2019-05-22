const BandToken = artifacts.require('BandToken');
const BandRegistry = artifacts.require('BandRegistry');
const BondingCurve = artifacts.require('BondingCurve');
const CommunityCore = artifacts.require('CommunityCore');
const CommunityToken = artifacts.require('CommunityToken');
const BondingCurveExpression = artifacts.require('BondingCurveExpression');
const TCRMinDepositExpression = artifacts.require('TCRMinDepositExpression');
const TCR = artifacts.require('TCR');

module.exports = function() {
  BandToken.deployed()
    .then(async band => {
      const accounts = await web3.eth.getAccounts();
      console.log(band.address);
      const registry = await BandRegistry.deployed();
      const data = await registry.createCommunity(
        'TestCommunity',
        'TC',
        BondingCurveExpression.address,
        '0',
        '300',
        '10000000000000000',
        '800000000000000000',
      );
      const TC = await CommunityCore.at(data.receipt.logs[0].args.community);
      console.log(TC.address);

      // const TC = await CommunityCore.at(
      //   '0x662511FeAD5e5949C78110f77b8B5AC376717d59',
      // );
      const bondingCurve = await BondingCurve.at(await TC.bondingCurve());
      console.log(bondingCurve.address);
      await band.approve(bondingCurve.address, '50000000000000000000000000');
      console.log(await band.allowance(accounts[0], bondingCurve.address));
      await bondingCurve.buy(
        accounts[0],
        '50000000000000000000000000',
        '40000000000000000000000',
      );
      console.log('Buy Complete!');
      const TCToken = await CommunityToken.at(await TC.token());
      await TCToken.transferFeeless(
        accounts[0],
        accounts[1],
        '10000000000000000000000',
        // { from: accounts[0] },
      );
      await TCToken.transferFeeless(
        accounts[0],
        accounts[2],
        '10000000000000000000000',
        // { from: accounts[0] },
      );
      await TCToken.transferFeeless(
        accounts[0],
        accounts[3],
        '10000000000000000000000',
        // { from: accounts[0] },
      );

      // Create TCR
      const dataTCR = await TC.createTCR(
        web3.utils.fromAscii('test:'),
        TCRMinDepositExpression.address,
        '1000000000000000000000',
        '300',
        '500000000000000000',
        '300',
        '300',
        '100000000000000000',
        '500000000000000000',
      );
      const tcr = await TCR.at(dataTCR.receipt.logs[0].args.tcr);
      // const tcr = await TCR.at('0x8B6dA7EF0cDCABC49EFD6DFb5A64C0B1E8717E8C');
      const dataHash = web3.utils.soliditySha3('some entry');
      await TCToken.approve(tcr.address, '1100000000000000000000', {
        from: accounts[1],
      });
      await tcr.applyEntry(accounts[1], '1100000000000000000000', dataHash, {
        from: accounts[1],
      });
      const reasonHash = web3.utils.soliditySha3('some reason');
      await TCToken.approve(tcr.address, '1000000000000000000000', {
        from: accounts[2],
      });
      await tcr.initiateChallenge(
        accounts[2],
        '1000000000000000000000',
        dataHash,
        reasonHash,
        {
          from: accounts[2],
        },
      );
      await tcr.commitVote(accounts[0], 1, web3.utils.soliditySha3(true, 21));
    })
    .catch(console.log);
};
