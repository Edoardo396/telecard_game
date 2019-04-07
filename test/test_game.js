"use strict";
const dubito = require("../dubito.js");
const assert = require("assert");
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

exports.testGameStart = function (test) {
    const game = new dubito.DubitoGame();

    game.players.push(new dubito.Player("a", "pd"));
    game.players.push(new dubito.Player("b", "pd"));
    game.players.push(new dubito.Player("c", "pd"));
    game.players.push(new dubito.Player("d", "pd"));

    game.start();

    for(let p of game.players) {
        test.equal(p.hand.length, 13);
        console.log(p.hand);
    }

    test.done();
};

exports.testBasicGame = function (test) {
    const game = new dubito.DubitoGame();

    game.players.push(new dubito.Player("a", "pd"));
    game.players.push(new dubito.Player("b", "pd"));
    game.players.push(new dubito.Player("c", "pd"));
    game.players.push(new dubito.Player("d", "pd"));

    game.start();
};