pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/math/Math.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";


/**
 * @title ApproxMath
 *
 * @dev ApproxMath allows smart contracts to do arithmetrics under the
 * assumption that the end result must be within 256-bit unsigned integer
 * range. The intermediate steps can overflow up to 2^(2^255) or underflow
 * down to 2^(-2^255). Note that integer precision is maintained only up to
 * 128 bits of information.
 */
library ApproxMath {
  using SafeMath for uint256;

  // The number that is used as the "zero" power to allow power to go negative.
  uint256 constant ZERO_POWER = (1 << 255);

  /*
   * @dev ApproxMath data structure consisting of the value and the power.
   * For instance, if val = 100 and power = ZERO_POWER + 5000, then the number
   * it represents is 100 * 2^(5000).
   */
  struct Data {
    uint256 value;
    uint256 power;
  }

  /**
   * @dev Encodes the given value to 128-bit of information ApproxMath data.
   */
  function encode(uint256 value) internal pure returns (Data) {
    Data memory data;
    data.value = value;
    data.power = ZERO_POWER;

    return to128(data);
  }

  /**
   * @dev Decodes ApproxMath data back to uint256.
   */
  function decode(Data self) internal pure returns (uint256) {
    return toPower(self, ZERO_POWER).value;
  }

  /**
   * @dev Adds two ApproxMath numbers.
   * @return the result in 128-bit form.
   */
  function add(Data _a, Data _b) internal pure returns (Data) {
    Data memory a = to128(_a);
    Data memory b = to128(_b);

    a = toPower(a, Math.max256(a.power, b.power));
    b = toPower(b, Math.max256(a.power, b.power));

    require (a.power == b.power);
    a.value = a.value.add(b.value);

    return to128(a);
  }

  /**
   * @dev Subtracts two ApproxMath numbers.
   * @return the result in 128-bit form.
   */
  function sub(Data _a, Data _b) internal pure returns (Data) {
    Data memory a = to128(_a);
    Data memory b = to128(_b);

    a = toPower(a, Math.max256(a.power, b.power));
    b = toPower(b, Math.max256(a.power, b.power));

    require (a.power == b.power);
    a.value = a.value.sub(b.value);

    return to128(a);
  }

  /**
   * @dev Multiplies two ApproxMath numbers.
   * @return the result in 128-bit form.
   */
  function mul(Data _a, Data _b) internal pure returns (Data) {
    Data memory a = to128(_a);
    Data memory b = to128(_b);

    a.value = a.value.mul(b.value);
    a.power = a.power.sub(ZERO_POWER >> 1).add(b.power).sub(ZERO_POWER >> 1);

    return to128(a);
  }

  /**
   * @dev Divides two ApproxMath numbers.
   * @return the result in 128-bit form.
   */
  function div(Data _a, Data _b) internal pure returns (Data) {
    Data memory a = to256(_a);
    Data memory b = to128(_b);

    a.value = a.value.div(b.value);
    a.power = a.power.add(ZERO_POWER >> 1).sub(b.power).add(ZERO_POWER >> 1);

    return to128(a);
  }

  /**
   * @dev Converts the given ApproxMath data to have the specified power.
   */
  function toPower(Data self, uint256 power) private pure returns (Data) {
    while (self.power > power) {
      self.value = self.value.mul(2);
      self.power = self.power.sub(1);
    }

    while (self.power < power) {
      self.value = self.value.div(2);
      self.power = self.power.add(1);
    }

    return self;
  }

  /**
   * @dev Converts the given ApproxMath data into another form where all of
   * the 256 bits are used to represent the value.
   */
  function to256(Data self) private pure returns (Data) {
    if (self.value == 0) {
      return self;
    }

    while (self.value < (1 << 255)) {
      self.value = self.value.mul(2);
      self.power = self.power.sub(1);
    }

    return self;
  }

  /**
   * @dev Similar to to256, but to the form where the bottom 128 bits are used.
   * Note that this guarantees that the top 128 bits must all be zeroes.
   */
  function to128(Data self) private pure returns (Data) {
    if (self.value == 0) {
      return self;
    }

    while (self.value < (1 << 127)) {
      self.value = self.value.mul(2);
      self.power = self.power.sub(1);
    }

    while (self.value >= (1 << 128)) {
      self.value = self.value.div(2);
      self.power = self.power.add(1);
    }

    return self;
  }
}

