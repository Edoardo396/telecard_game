"use strict";
const Telegraf = require('telegraf');
const Dubito = require('./dubito.js');
const util = require("util");
let game = new Dubito.DubitoGame();

const bot = new Telegraf("817731928:AAGYI67d8NIbN0T4g6zEOdKf52o1YFMIfX4");

game.new_turn = function () {
    for (let player of game.players) {
        if (player === game.player_turn()) {
            bot.telegram.sendMessage(player.chat_id, "It's your turn");
        } else {
            bot.telegram.sendMessage(player.chat_id, "It's " + game.player_turn().player_name + "'s turn");
        }
    }
};

bot.start(ctx => {
    ctx.reply("Benvenuto in Telecard! Per iniziare a giocare digita /join tuonome")
});

bot.command('join', (ctx) => {
    if (game.turn > 0) {
        ctx.reply("Game already started, try again later");
        return;
    }

    let parts = ctx.message.text.split(' ');
    let me = new Dubito.Player(parts[1], ctx.chat.id);
    game.players.push(me);


    if (game.game_admin == null) {
        ctx.reply("You're the first player, wait for others to connect and then run /startgame");
        game.game_admin = me;
    }

    if (me !== game.game_admin) {
        bot.telegram.sendMessage(game.game_admin.chat_id, me.player_name + " joined the game");
    }
});

bot.command('startgame', ctx => {
    let me = game.get_player(ctx.chat.id);

    if (me !== game.game_admin) {
        ctx.reply("You are not allowed to run this command");
    }

    game.start();

    for (let player of game.players) {
        bot.telegram.sendMessage(player.chat_id,
            util.format("Game is started!\nYour hand is: %s\nIt's %s's turn, wait for your turn to play", me.hand, game.player_turn().player_name));

    }

    game.new_turn();
});

bot.command('stopgame', ctx => {
    let me = game.get_player(ctx.chat.id);

    if (me !== game.game_admin) {
        ctx.reply("You are not allowed to run this command");
    }

    game = new Dubito.DubitoGame();

    for (let player of game.players) {
        bot.telegram.sendMessage(player.chat_id,
            "Game is finished, no winner is declared.");
    }
});

bot.command('hand', ctx => {
    let me = game.get_player(ctx.chat.id);

    ctx.reply("Your hand is: " + me.hand);
});

bot.command('debuginfo', ctx => {
    ctx.reply("Table: " + game.banco);
    ctx.reply("Turn: " + game.turn);
    ctx.reply("Player's turn: " + game.player_turn().player_name);

    for (let player of game.players) {
        ctx.reply(util.format("%s's hand: %s", player.player_name, player.hand))
    }
});

function send_help(id) {
    bot.telegram.sendMessage(id, "Entra nalla partita con /join $nome, aspetta che la partita inizi dopodichè segui il gioco utilizzando i messagi che il bot invierà,\n" +
        "Quando è il tuo turno puoi dubitare inviando \"doubt it\" oppure posare una carta inviando \"play $real $expected\",\n" +
        "con $real indichi la carta che poserai veramente, con $expected quella che invece dici di aver posato\n" +
        "\n" +
        "\n" +
        "Commands:\n" +
        "/join $yourname Entra in gioco, specificando il tuo nome come parametro\n" +
        "/startgame Inizia la partita (solo admin)\n" +
        "/hand Ottieni le carte che hai in mano\n" +
        "/stopgame Chiudi la partita (solo admin)\n" +
        "/help Ottieni questa schermata")
}

bot.command('help', ctx => {
    send_help(ctx.chat.id);
});

bot.on('message', ctx => {
    let me = game.get_player(ctx.chat.id);

    if (game.player_turn() !== me) {
        ctx.reply("It's not your turn, you バカ!");
        return;
    }

    if (ctx.message.text.toLowerCase() === "doubt it") {
        game.dubita()
    } else {

    }
});

bot.launch();


