const _ = require("underscore/underscore");

const deckSize = {
    1: 12,
    2: 16,
    3: 36,
    5: 52
};

const seedConversion = {
    "A": String.fromCharCode(0x2660),
    "B": String.fromCharCode(0x2665),
    "C": String.fromCharCode(0x2666),
    "D": String.fromCharCode(0x2663)
};

function reverseSeedConversion(value) {
    let str = value.substring(value.length - 1);

    let converted;

    if (str === "D") {
        converted = "C"
    } else if (str === "C") {
        converted = "A"
    } else if (str === "H") {
        converted = "B"
    } else if (str === "S") {
        converted = "D"
    } else {
        converted = _.invert(seedConversion)[str]
    }

    return converted + value.substring(0, value.length - 1);
}

function handToOutput(hand) {
    hand.sort();

    return hand.map(c => cardToOutput(c))
}

class Player {
    constructor(name, chatid) {
        this.player_name = name;
        this.chat_id = chatid;
        this.hand = [];
    }
}

function cardToOutput(card) {
    let suit = seedConversion[card[0]];

    let number = card.substring(1);

    return number + suit;
}

function createDeck(nPlayers) {
    let cards = [];

    let number = nPlayers <= 5 ? deckSize[nPlayers] : nPlayers[5];

    for (let i = 1; i <= number / 4; i++) {
        cards.push("A" + i);
        cards.push("B" + i);
        cards.push("C" + i);
        cards.push("D" + i);
    }

    return cards;
}

class DubitoGame {

    constructor() {
        this.players = []; // type: Player
        this.cards = [];
        this.turn = -1;
        this.last_table_card = null;
        this.last_declared_card = null;
        this.banco = [];
        this.game_admin = null;
        this.new_turn = null
    }

    get_player(chat_id) {
        return this.players.find(el => el.chat_id === chat_id)
    }

    start() {
        if (this.players.length === 0) {
            throw new Error("Can't play with 0 players");
        }

        this.cards = createDeck(this.players.length);

        const cards = Array.from(this.cards);
        cards.sort((a, b) => 0.5 - Math.random());

        for (let i = 0; i < cards.length; ++i) {
            let player = i % this.players.length;
            this.players[player].hand.push(cards[i]);
        }

        this.turn = 0;
    }

    gameReset() {
        this.players = []; // type: Player
        this.turn = -1;
        this.last_table_card = null;
        this.last_declared_card = null;
        this.banco = [];
        this.game_admin = null;
    }

    player_turn() {
        return this.players[this.turn % this.players.length]
    }

    last_player_turn() {
        if (this.turn % this.players.length === 0)
            return this.players[this.players.length - 1];
        else
            return this.players[(this.turn % this.players.length) - 1]
    }

    dubita() {

        let result = DubitoGame.get_number(this.last_table_card) !== this.last_declared_card;

        if (result) {

            this.last_player_turn().hand.concat(this.banco);
            this.banco = [];

        } else {

            this.player_turn().hand.concat(this.banco);
            this.banco = [];
            this.turn++;

        }

        return result
    }

    _foreach_player(f) {
        for (let player of this.players) {
            f(player)
        }
    }

    static get_number(card) {
        return card.substring(1);
    }

    is_card_valid(card) {
        return this.cards.includes(card);
    }

    gioca(real, declared) {
        if (!this.player_turn().hand.includes(real)) {
            throw new Error("You can't play a card you don't have")
        }

        if (this.last_declared_card !== null && declared !== this.last_declared_card) {
            throw new Error("You must play a card with the same number of the last one!")
        }

        this.banco.push(real);
        this.last_declared_card = declared;
        this.last_table_card = real;

        this.turn++;
    }
}

module.exports = {
    DubitoGame, Player, cardToOutput, handToOutput, reverseSeedConversion
};