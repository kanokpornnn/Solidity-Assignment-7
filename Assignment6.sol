
 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Bank {

    mapping(address => uint256) private _balances;

    event Deposit(address indexed owner, uint256 amount);
    event Withdraw(address indexed owner, uint256 amount);

    function deposit() public payable {
        require(msg.value > 0, "Deposit money is zero");

        _balances[msg.sender] += msg.value;

        emit Deposit(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) public {
        require(
            amount > 0 && amount <= _balances[msg.sender],
            "not enough money"
        );

        payable(msg.sender).transfer(amount);

        _balances[msg.sender] -= amount;

        emit Withdraw(msg.sender, amount);
    }

    function checkBalance() public view returns (uint256 balance) {
        return _balances[msg.sender];
    }
}
