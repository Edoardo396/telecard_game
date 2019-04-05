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
        this.players = [] // type: Player
    }

    start() {
        const cards = Array.from(all_cards);
        cards.sort((a, b) => 0.5 - Math.random());

        const cards_per_player = Math.floor(all_cards.length / this.players.length);


        for (let player of this.players) {
            for (let i = 0; i < cards_per_player; i++) {
                player.hand.push(cards.pop())
            }

        }

    }
}

module.exports = {
    DubitoGame, Player
};