const all_cards = ["1A", "2A", "3A", "4A", "5A", "6A", "7A", "8A", "9A", "10A", "11A", "12A", "13A",
    "1B", "2B", "3B", "4B", "5B", "6B", "7B", "8B", "9B", "10B", "11B", "12B", "13B",
    "1C", "2C", "3C", "4C", "5C", "6C", "7C", "8C", "9C", "10C", "11C", "12C", "13C",
    "1D", "2D", "3D", "4D", "5D", "6D", "7D", "8D", "9D", "10D", "11D", "12D", "13D"];

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
        this.turn = null;
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
        if(this.players.length === 0) {
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
        this.turn = null;
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
        if(this.turn % this.players.length === 0)
            return this.players[this.players.length-1];
        else
            return this.players[(this.turn % this.players.length) - 1]
    }

    dubita() {

        if(this.last_table_card !== this.last_declared_card) {

            this.last_player_turn().hand.push(this.banco);
            this.banco = [];
            return true

        } else {

           this.player_turn().hand.push(this.banco);
           this.banco = [];
            this.turn++;
            this.new_turn();
           return false

        }
    }

    _foreach_player(f) {
        for (let player of this.players) {
            f(player)
        }
    }

    gioca(real, declared) {
        if(!this.player_turn().hand.includes(real)) {
            throw new Error("You can't play a card you don't have")
        }

        this.banco.push(real);
        this.last_declared_card = declared;
        this.last_table_card = real;

        this.turn++;
        this.new_turn()
    }

    print_debug() {
        console.log(this);

        for (let player of this.players) {
            console.log(player.player_name + " hand is " + player.hand)
        }
    }
}

module.exports = {
    DubitoGame, Player
};