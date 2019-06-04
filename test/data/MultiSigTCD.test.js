const { shouldFail, time } = require('openzeppelin-test-helpers');

const BandMockExchange = artifacts.require('BandMockExchange');
const BandToken = artifacts.require('BandToken');
const BandRegistry = artifacts.require('BandRegistry');
const BondingCurve = artifacts.require('BondingCurve');
const CommunityToken = artifacts.require('CommunityToken');
const Parameters = artifacts.require('Parameters');
const MultiSigTCD = artifacts.require('MultiSigTCD');
const MTCDFactory = artifacts.require('MTCDFactory');
const BondingCurveExpression = artifacts.require('BondingCurveExpression');
const CommunityFactory = artifacts.require('CommunityFactory');
const MedianAggregator = artifacts.require('MedianAggregator');
const MajorityAggregator = artifacts.require('MajorityAggregator');

require('chai').should();

contract('MultiSigTCD', ([_, owner, alice, bob, carol]) => {
  beforeEach(async () => {
    this.band = await BandToken.new({ from: owner });
    await this.band.mint(owner, 100000000, { from: owner });
    this.exchange = await BandMockExchange.new(this.band.address, {
      from: owner,
    });
    this.mtcdFactory = await MTCDFactory.new();
    this.registry = await BandRegistry.new(
      this.band.address,
      this.exchange.address,
      { from: owner },
    );
    this.commFactory = await CommunityFactory.new(this.registry.address, {
      from: owner,
    });
    const testCurve = await BondingCurveExpression.new([1]);
    const data1 = await this.commFactory.create(
      'CoinHatcher',
      'CHT',
      testCurve.address,
      '0',
      '60',
      '5',
      '5',
      {
        from: owner,
      },
    );
    // console.log(data1.receipt.logs);
    this.comm = await CommunityToken.at(data1.receipt.logs[2].args.token);
    this.curve = await BondingCurve.at(data1.receipt.logs[2].args.bondingCurve);
    this.params = await Parameters.at(data1.receipt.logs[2].args.params);
    await this.comm.addCapper(this.mtcdFactory.address, { from: owner });
    const data2 = await this.mtcdFactory.createMultiSigTCD(
      web3.utils.fromAscii('data:'),
      data1.receipt.logs[2].args.bondingCurve,
      this.registry.address,
      data1.receipt.logs[2].args.params,
    );
    this.median = await MedianAggregator.new({ from: owner });
    this.majority = await MajorityAggregator.new({ from: owner });
    await this.params.setRaw(
      [
        web3.utils.fromAscii('data:min_provider_stake'),
        web3.utils.fromAscii('data:max_provider_count'),
        web3.utils.fromAscii('data:owner_revenue_pct'),
        web3.utils.fromAscii('data:query_price'),
        web3.utils.fromAscii('data:withdraw_delay'),
        web3.utils.fromAscii('data:data_aggregator'),
      ],
      [10, 3, '500000000000000000', 100, 0, this.median.address],
      { from: owner },
    );

    this.mtcd = await MultiSigTCD.at(data2.receipt.logs[0].args.mtcd);

    await this.band.transfer(alice, 10000000, { from: owner });
    await this.band.transfer(bob, 10000000, { from: owner });
    await this.band.transfer(carol, 10000000, { from: owner });
    // alice buy 1000 SDD
    const calldata1 = this.curve.contract.methods.buy(_, 0, 1000).encodeABI();
    await this.band.transferAndCall(
      this.curve.address,
      1000000,
      '0x' + calldata1.slice(2, 10),
      '0x' + calldata1.slice(138),
      { from: alice },
    );
    // bob buy 1000 SDD
    const calldata2 = this.curve.contract.methods.buy(_, 0, 1000).encodeABI();
    await this.band.transferAndCall(
      this.curve.address,
      3000000,
      '0x' + calldata2.slice(2, 10),
      '0x' + calldata2.slice(138),
      { from: bob },
    );
    // carol buy 1000 SDD
    const calldata3 = this.curve.contract.methods.buy(_, 0, 1000).encodeABI();
    await this.band.transferAndCall(
      this.curve.address,
      5000000,
      '0x' + calldata3.slice(2, 10),
      '0x' + calldata3.slice(138),
      { from: carol },
    );
    // owner buy 1000 SDD
    const calldata4 = this.curve.contract.methods.buy(_, 0, 1000).encodeABI();
    await this.band.transferAndCall(
      this.curve.address,
      7000000,
      '0x' + calldata4.slice(2, 10),
      '0x' + calldata4.slice(138),
      { from: owner },
    );

    await this.band.transfer(this.exchange.address, 10000000, { from: owner });
    await this.exchange.setExchangeRate('1000000000000000000000', {
      from: owner,
    });
  });
  context('Registration', () => {
    it('check setting of multisig tcd', async () => {
      (await this.mtcd.token()).toString().should.eq(this.comm.address);
      (await this.mtcd.params()).toString().should.eq(this.params.address);
      (await this.mtcd.getActiveDataSourceCount()).toNumber().should.eq(0);
      (await this.mtcd.getAllDataSourceCount()).toNumber().should.eq(0);
    });
    it('should revert if stake less than min_provider_stake', async () => {
      (await this.mtcd.providers(owner)).currentStatus.toNumber().should.eq(0);
      (await this.mtcd.providers(alice)).currentStatus.toNumber().should.eq(0);
      (await this.mtcd.providers(bob)).currentStatus.toNumber().should.eq(0);
      (await this.mtcd.providers(carol)).currentStatus.toNumber().should.eq(0);

      await this.mtcd.register(40, owner, { from: owner });
      await this.mtcd.register(30, alice, { from: alice });
      await this.mtcd.register(20, bob, { from: bob });
      await shouldFail.reverting(this.mtcd.register(9, carol, { from: carol }));
      await this.mtcd.register(10, carol, { from: carol });

      (await this.mtcd.getActiveDataSourceCount()).toNumber().should.eq(3);

      (await this.mtcd.getAllDataSourceCount()).toNumber().should.eq(4);

      (await this.comm.unlockedBalanceOf(owner))
        .toNumber()
        .should.eq(1000 - 40);
      (await this.comm.unlockedBalanceOf(alice))
        .toNumber()
        .should.eq(1000 - 30);
      (await this.comm.unlockedBalanceOf(bob)).toNumber().should.eq(1000 - 20);
      (await this.comm.unlockedBalanceOf(carol))
        .toNumber()
        .should.eq(1000 - 10);

      const ownerDataSource = await this.mtcd.providers(owner);
      const aliceDataSource = await this.mtcd.providers(alice);
      const bobDataSource = await this.mtcd.providers(bob);
      const carolDataSource = await this.mtcd.providers(carol);

      ownerDataSource.currentStatus.toNumber().should.eq(1);
      aliceDataSource.currentStatus.toNumber().should.eq(1);
      bobDataSource.currentStatus.toNumber().should.eq(1);
      carolDataSource.currentStatus.toNumber().should.eq(1);

      ownerDataSource.stake.toNumber().should.eq(40);
      aliceDataSource.stake.toNumber().should.eq(30);
      bobDataSource.stake.toNumber().should.eq(20);
      carolDataSource.stake.toNumber().should.eq(10);

      ownerDataSource.totalPublicOwnership.toNumber().should.eq(40);
      aliceDataSource.totalPublicOwnership.toNumber().should.eq(30);
      bobDataSource.totalPublicOwnership.toNumber().should.eq(20);
      carolDataSource.totalPublicOwnership.toNumber().should.eq(10);

      ownerDataSource.owner.toString().should.eq(owner);
      aliceDataSource.owner.toString().should.eq(alice);
      bobDataSource.owner.toString().should.eq(bob);
      carolDataSource.owner.toString().should.eq(carol);
    });
    it('should revert if try to register again', async () => {
      await this.mtcd.register(10, carol, { from: carol });
      await shouldFail.reverting(
        this.mtcd.register(10, carol, { from: carol }),
      );
    });
    it('should revert if not enough tokens', async () => {
      await shouldFail.reverting(
        this.mtcd.register(1001, carol, { from: carol }),
      );
    });
  });
  context('Get', () => {
    beforeEach(async () => {
      await this.mtcd.register(10, owner, { from: owner });
      await this.mtcd.register(20, alice, { from: alice });
      await this.mtcd.register(30, bob, { from: bob });
      await this.mtcd.register(40, carol, { from: carol });
    });
    it('should revert if value less than query', async () => {
      await shouldFail.reverting(
        this.mtcd.query(
          '0x5000000000000000000000000000000000000000000000000000000000000000',
        ),
      );
    });
    it('should return value and get eth when date retrieved', async () => {
      await this.mtcd.query(
        '0x5000000000000000000000000000000000000000000000000000000000000000',
        {
          from: owner,
          value: 100,
        },
      );
      (await web3.eth.getBalance(this.mtcd.address)).should.eq('100');
    });
    it('should distribute value when someone call', async () => {
      // Carol join owner
      await this.mtcd.vote(10, owner, { from: carol });
      await this.mtcd.query(
        '0x5000000000000000000000000000000000000000000000000000000000000000',
        {
          from: owner,
          value: 100,
        },
      );
      await this.mtcd.distributeFee(100, { from: owner });

      (await this.comm.unlockedBalanceOf(owner)).toNumber().should.eq(990);
      (await this.comm.unlockedBalanceOf(alice)).toNumber().should.eq(980);
      (await this.comm.unlockedBalanceOf(bob)).toNumber().should.eq(970);
      (await this.comm.unlockedBalanceOf(carol)).toNumber().should.eq(950);
      (await this.mtcd.getStakeInProvider(alice, alice))
        .toNumber()
        .should.eq(20);

      (await this.comm.balanceOf(carol)).toNumber().should.eq(1000);

      (await this.mtcd.getStakeInProvider(owner, carol))
        .toNumber()
        .should.eq(18);

      await this.mtcd.withdraw(10, owner, {
        from: carol,
      });

      (await this.comm.balanceOf(carol)).toNumber().should.eq(1008);
      (await this.comm.unlockedBalanceOf(carol)).toNumber().should.eq(968);

      await this.mtcd.query(
        '0x5000000000000000000000000000000000000000000000000000000000000000',
        {
          from: owner,
          value: 101,
        },
      );

      await this.mtcd.distributeFee(100, { from: owner });

      (await this.mtcd.getStakeInProvider(alice, alice))
        .toNumber()
        .should.eq(20);
      (await this.mtcd.getStakeInProvider(owner, owner))
        .toNumber()
        .should.eq(68);
      await this.mtcd.withdraw(10, owner, {
        from: owner,
      });

      (await this.comm.unlockedBalanceOf(owner)).toNumber().should.eq(1019);
      (await this.comm.balanceOf(owner)).toNumber().should.eq(1058);

      await this.mtcd.query(
        '0x5000000000000000000000000000000000000000000000000000000000000000',
        {
          from: owner,
          value: 100,
        },
      );
      await this.mtcd.query(
        '0x5000000000000000000000000000000000000000000000000000000000000000',
        {
          from: owner,
          value: 100,
        },
      );
      await this.mtcd.distributeFee(200, { from: owner });
      (await this.mtcd.getStakeInProvider(alice, alice))
        .toNumber()
        .should.eq(20);

      (await this.comm.unlockedBalanceOf(alice)).toNumber().should.eq(980);
      (await this.comm.balanceOf(alice)).toNumber().should.eq(1000);

      (await this.mtcd.getProviderPublicOwnership(alice, alice))
        .toNumber()
        .should.eq(20);
      await this.mtcd.withdraw(20, alice, {
        from: alice,
      });

      (await this.comm.unlockedBalanceOf(alice)).toNumber().should.eq(1000);
      (await this.comm.balanceOf(alice)).toNumber().should.eq(1000);
    });
    it('check active providers', async () => {
      const dsCount = await this.mtcd.getActiveDataSourceCount();
      const topProviders = [carol, bob, alice];
      dsCount.toNumber().should.eq(topProviders.length);
      for (let i = 0; i < topProviders.length; i++) {
        (await this.mtcd.dataSources(i)).toString().should.eq(topProviders[i]);
      }
    });
    // it('should be able to report', async () => {
    //   let sig = await web3.eth.sign(
    //     web3.utils.soliditySha3(nonce.alice++, dataNoFuncSig),
    //     alice,
    //   );
    // });
  });
});
