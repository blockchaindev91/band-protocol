const { reverting } = require('openzeppelin-solidity/test/helpers/shouldFail');
const {
  increase,
  duration,
} = require('openzeppelin-solidity/test/helpers/time');

const BandToken = artifacts.require('BandToken');
const CommunityToken = artifacts.require('CommunityToken');
const Parameters = artifacts.require('Parameters');
const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .should();

contract('Parameters', ([_, owner, alice, bob, carol]) => {
  beforeEach(async () => {
    this.band = await BandToken.new(1000000, { from: owner });
    this.comm = await CommunityToken.new('CoinHatcher', 'XCH', 18, {
      from: owner,
    });
    this.params = await Parameters.new(
      this.comm.address,
      [
        'params:proposal_expiration_time',
        'params:support_required',
        'params:minimum_quorum',
      ],
      [86400, 60, 60],
      { from: owner },
    );

    this.comm.mint(owner, 100, { from: owner });
    this.comm.mint(alice, 100, { from: owner });
    this.comm.mint(bob, 100, { from: owner });
  });

  context('Checking basic functionalities', () => {
    it('should allow getting existing parameters', async () => {
      (await this.params.get(
        'params:proposal_expiration_time',
      )).should.bignumber.eq(86400);
      (await this.params.getZeroable(
        'params:proposal_expiration_time',
      )).should.bignumber.eq(86400);
    });

    it('should only allow getting zero if called via getZeroable', async () => {
      await reverting(this.params.get('xxxxxx'));
      (await this.params.getZeroable('xxxxxx')).should.bignumber.eq(0);
    });
  });

  context('Checking expiration contraints', () => {
    it('should allow voting on unexpired proposal', async () => {
      await this.params.propose(['example_proposal'], [1000000], {
        from: owner,
      });
      await increase(duration.hours(10));
      await this.params.vote(1, 100, 0, { from: owner });
    });

    it('should not allow voting on expired proposal', async () => {
      await this.params.propose(['example_proposal'], [1000000], {
        from: owner,
      });
      await increase(duration.hours(25));
      await reverting(this.params.vote(1, 100, 0, { from: owner }));
    });

    it('should use the contraints during which the proposal is proposed', async () => {
      await this.params.propose(['params:proposal_expiration_time'], [100], {
        from: owner,
      });
      await increase(86350);
      await this.params.propose(['example_proposal'], [1000000], {
        from: owner,
      });
      await this.params.vote(1, 100, 0, { from: owner });
      await this.params.vote(1, 100, 0, { from: alice });
      await increase(500);
      await this.params.resolve(1, { from: owner });
      (await this.params.get(
        'params:proposal_expiration_time',
      )).should.bignumber.eq(100);
      await increase(duration.hours(8));
      await this.params.vote(2, 100, 0, { from: owner });
    });
  });

  context('Checking voting constraints', () => {
    beforeEach(async () => {
      await this.params.propose(['params:proposal_expiration_time'], [100], {
        from: owner,
      });
    });

    it('should accept proposal only after enough holders accept', async () => {
      (await this.params.get(
        'params:proposal_expiration_time',
      )).should.bignumber.eq(86400);
      await this.params.vote(1, 100, 0, { from: owner });
      (await this.params.get(
        'params:proposal_expiration_time',
      )).should.bignumber.eq(86400);
      await this.params.vote(1, 100, 0, { from: alice });
      await increase(86400);
      await this.params.resolve(1, { from: owner });
      (await this.params.get(
        'params:proposal_expiration_time',
      )).should.bignumber.eq(100);
    });

    it('should not allow people with 0 tokens to vote', async () => {
      await reverting(this.params.vote(1, 0, 0, { from: carol }));
    });

    it('should not allow people to re-vote', async () => {
      await this.params.vote(1, 100, 0, { from: owner });
      await reverting(this.params.vote(1, 100, 0, { from: owner }));
    });

    it('should not allow voting on accepted proposal', async () => {
      await this.params.vote(1, 100, 0, { from: owner });
      await this.params.vote(1, 100, 0, { from: alice });
      await increase(86400);
      await this.params.resolve(1, { from: owner });
      await reverting(this.params.vote(1, 100, 0, { from: bob }));
    });

    it('should use tokens held during the proposed time as voting power', async () => {
      await increase(10);
      await this.comm.mint(owner, 2, { from: owner });
      (await this.comm.balanceOf(owner)).should.bignumber.eq(102);
      await reverting(this.params.vote(1, 102, 0, { from: owner }));
      await this.params.vote(1, 100, 0, { from: owner });
      await this.params.vote(1, 10, 10, { from: alice });
      (await this.params.proposals(1))[3].should.bignumber.eq(110); // currentYesCount
      (await this.params.proposals(1))[4].should.bignumber.eq(10); // currentNoCount
      (await this.params.proposals(1))[5].should.bignumber.eq(300); // totalVoteCount
    });
  });
});
