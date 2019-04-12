const all_cards = ["A1",
    "A2",
    "A3",
    "A4",
    "A5",
    "A6",
    "A7",
    "A8",
    "A9",
    "A10",
    "A11",
    "A12",
    "A13",
    "B1",
    "B2",
    "B3",
    "B4",
    "B5",
    "B6",
    "B7",
    "B8",
    "B9",
    "B10",
    "B11",
    "B12",
    "B13",
    "C1",
    "C2",
    "C3",
    "C4",
    "C5",
    "C6",
    "C7",
    "C8",
    "C9",
    "C10",
    "C11",
    "C12",
    "C13",
    "D1",
    "D2",
    "D3",
    "D4",
    "D5",
    "D6",
    "D7",
    "D8",
    "D9",
    "D10",
    "D11",
    "D12",
    "D13"];

class Player {
    constructor(name, chatid) {
        this.player_name = name;
        this.chat_id = chatid;
        this.hand = [];
    }
}

class DubitoGame {

    constructor() {
        this.players = []; // type: Player
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

        const cards = Array.from(all_cards);
        cards.sort((a, b) => 0.5 - Math.random());

        const cards_per_player = Math.floor(all_cards.length / this.players.length);


        for (let player of this.players) {
            for (let i = 0; i < cards_per_player; i++) {
                player.hand.push(cards.pop())
            }
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
        this.new_turn = null
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

        let result = DubitoGame.get_number(this.last_table_card) !== this.last_declared_card

        if (result) {

            this.last_player_turn().hand.push(this.banco);
            this.banco = [];

        } else {

            this.player_turn().hand.push(this.banco);
            this.banco = [];
            this.turn++;
            this.new_turn();

        }

        this.last_declared_card = null;

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

    gioca(real, declared) {
        if (!this.player_turn().hand.includes(real)) {
            throw new Error("You can't play a card you don't have")
        }

        if(this.last_declared_card !== null && declared !== this.last_declared_card) {
            throw new Error("You must play a card with the same number of the last one!")
        }

        this.banco.push(real);
        this.last_declared_card = declared;
        this.last_table_card = real;

        this.turn++;
        this.new_turn()
    }
}

module.exports = {
    DubitoGame, Player
};