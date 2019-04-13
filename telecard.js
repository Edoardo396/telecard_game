"use strict";
const Telegraf = require('telegraf');
const Extra = require('telegraf/extra');
const Markup = require('telegraf/markup');
const Dubito = require('./dubito.js');
const util = require("util");
const fs = require("fs");

const nicknames = fs.readFileSync("./random_nicks.txt").toString().split("\n");
const game = new Dubito.DubitoGame();

const db = require("tedious");

const CARDS_PER_ROW = 7;

// const Connection = require('tedious').Connection;
//
// const config = {
//     server: '192.168.192.132',
//     authentication: {
//         type: 'default',
//         options: {
//             userName: 'sa',
//             password: ''
//         }
//     }
// };
//
// const connect = new Connection(config);
//
// connect.on('connect', function (err) {
//     console.log("Connesso!");
// });

const bot = new Telegraf("817731928:AAGYI67d8NIbN0T4g6zEOdKf52o1YFMIfX4");

function getButtonsArray(hand) {
    let arr = [];

    for (let i = 0; i < hand.length; ++i) {
        let card = Dubito.cardToOutput(hand[i]);
        if (arr[Math.floor(i / CARDS_PER_ROW)] === undefined) {
            arr.push([]);
        }
        arr[Math.floor(i / CARDS_PER_ROW)].push(card)
    }

    return arr;
}


game.new_turn = function () {
    for (let player of game.players) {
        if (player === game.player_turn()) {

            let btns = getButtonsArray(player.hand);
            btns.push(["Doubt"]);

            bot.telegram.sendMessage(player.chat_id, "It's your turn", Markup.keyboard(btns).resize().extra());
        } else {
            bot.telegram.sendMessage(player.chat_id, "It's " + game.player_turn().player_name + "'s turn");
        }
    }
};

bot.start(ctx => {
    ctx.reply("Benvenuto in Telecard! Per iniziare a giocare digita /join tuonome")
    send_help(ctx.chat.id)
});

bot.command('keyboard', ctx => {
    let me = game.get_player(ctx.chat.id);

    if (game.turn === -1) {
        ctx.reply("Game not started, either /join or ask the administrator to start the game");
        return;
    }

    if (game.player_turn() !== me) {
        ctx.reply("It's not your turn");
        return;
    }

    let btns = getButtonsArray(me.hand);
    btns.push(["Doubt"]);

    bot.telegram.sendMessage(me.chat_id, "", Markup.keyboard(btns).oneTime().resize().extra());
});

bot.command('gameinfo', ctx => {
    ctx.reply("Connected players: " + game.players.map(element => element.player_name))


    if (game.turn > -1) {
        ctx.reply("Turn: " + game.turn);
        ctx.reply("Player's turn: " + game.player_turn().player_name);
    }
});

bot.command('join', (ctx) => {
    if (game.turn !== -1) {
        ctx.reply("Game already started, try again later");
        return;
    }

    if (game.get_player(ctx.chat.id) != null) {
        ctx.reply("You are already in the game");
        return;
    }

    let parts = ctx.message.text.split(' ');

    let name = parts.length === 2 ? parts[1] : nicknames[Math.round(Math.random() * (nicknames.length - 1))];

    let me = new Dubito.Player(name.replace("\r", ""), ctx.chat.id);
    game.players.push(me);


    ctx.reply(util.format("Welcome to the game %s! \nConnected players: %s\nWait for the administrator to start the game.", me.player_name, game.players.map(p => p.player_name)));

    if (game.game_admin == null) {
        ctx.reply("You're the first player, wait for others to connect and then run /startgame");
        game.game_admin = me;
    }

    game._foreach_player(p => {
        if (p !== me) {
            bot.telegram.sendMessage(p.chat_id, util.format("%s joined the game.\nConnected players: %s", me.player_name, game.players.map(pl => pl.player_name)));
        }
    });

    console.log(me.player_name + " joined the game");
});

bot.command('startgame', ctx => {
    let me = game.get_player(ctx.chat.id);

    if(game.turn > -1) {
        ctx.reply("Game is already started. Ask admin to stop it first");
        return;
    }

    if (me == null) {
        ctx.reply("You have to /join first");
        return;
    }

    if (me !== game.game_admin) {
        ctx.reply("You are not allowed to run this command");
        return;
    }

    game.start();

    for (let player of game.players) {
        bot.telegram.sendMessage(player.chat_id,
            util.format("Game is started!\nYour hand is: %s\nIt's %s's turn, wait for your turn to play", Dubito.handToOutput(player.hand), game.player_turn().player_name));

    }

    game.new_turn();

    print_debug();
});


bot.command('stopgame', ctx => {
    let me = game.get_player(ctx.chat.id);

    if (me !== game.game_admin) {
        ctx.reply("You are not allowed to run this command");
    }

    game.gameReset();

    for (let player of game.players) {
        bot.telegram.sendMessage(player.chat_id,
            "Game is finished, no winner is declared.");
    }
});

bot.command('hand', ctx => {
    let me = game.get_player(ctx.chat.id);

    if (me === undefined || game.turn === -1) {
        ctx.reply("Game is not started or you haven't joined the game.");
        return;
    }

    ctx.reply(util.format("Your hand is: %s \n(%d cards)", Dubito.handToOutput(me.hand), me.hand.length));
});

bot.command('debuginfo', ctx => {
    print_debug();
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
        "con $real indichi la carta che poserai veramente, con $expected quella che invece dici di aver posato (solo il numero)\n" +
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

    if (ctx.message.text.toString()[0] === "/") {
        ctx.reply("Invalid command");
        return;
    }

    if (game.turn === -1) {
        ctx.reply("Game is not started.");
        return;
    }

    if (game.player_turn() !== me) {
        ctx.reply("It's not your turn, you バカ!");
        return;
    }

    if (ctx.message.text.toLowerCase() === "doubt" && game.banco.length === 0) {
        ctx.reply("Cannot doubt first turn");
        return;
    }

    ctx.reply(".", Extra.markup((m) => m.removeKeyboard(true)));

    if (ctx.message.text.toLowerCase() === "doubt") {
        if (game.dubita()) {
            let send_promises = [];


            for (let player of game.players) {

                send_promises.push(bot.telegram.sendMessage(player.chat_id, util.format("%s doubted right, last card was %s and not a %s!\n%s has now %d card in hands!",
                    me.player_name, Dubito.cardToOutput(game.last_table_card), game.last_declared_card, game.last_player_turn().player_name, game.last_player_turn().hand.length))

                    .then(v => {
                    bot.telegram.sendMessage(player.chat_id, "It is " + me.player_name + "'s turn");

                }));
            }


            Promise.all(send_promises).then(val => {
                game.last_declared_card = null;
                game.new_turn();
            });

        } else {
            let send_promises = [];

            for (let p of game.players) {

                send_promises.push(bot.telegram.sendMessage(p.chat_id, util.format("%s doubted wrong, last card was effectively %s!\n%s has now %d card in hands!",
                    me.player_name, Dubito.cardToOutput(game.last_table_card), me.player_name, me.hand.length)))

            }

            Promise.all(send_promises).then(val => {
                game.last_declared_card = null;
                game.new_turn();
            });


        }

        print_debug();
        return;
    }

    let parts = ctx.message.text.split(' ');

    if (parts.length > 2) {
        ctx.reply("Invalid play message");
        return;
    }

    let real = Dubito.reverseSeedConversion(parts[0]);

    if (!game.is_card_valid(real)) {
        ctx.reply("Invalid card");
        return;
    }

    let declared = null;

    if (parts.length === 1) {
        if (game.last_declared_card == null) {
            declared = Dubito.DubitoGame.get_number(real);
        } else {
            declared = game.last_declared_card;
        }
    } else {
        declared = parts[1];
    }

    try {
        console.log(util.format("%s playing %s as %d\n", me.player_name, real, declared));
        game.gioca(real, declared)
    } catch (e) {
        ctx.reply(e.message);
        console.log("Command Failed");
        print_debug();
        return;
    }

    me.hand.splice(me.hand.indexOf(real), 1);

    game._foreach_player(p => {
        bot.telegram.sendMessage(p.chat_id, util.format("%s played %s\nThere are %d cards on the table", me.player_name, declared, game.banco.length))
    });

    game.new_turn();
    print_debug();
});

function print_debug() {
    console.log("Turn:" + game.turn);
    console.log("Players:" + game.players.map(p => p.player_name));
    console.log("Last table card:" + game.last_table_card);
    console.log("Last declared card:" + game.last_declared_card);
    console.log("Last player turn was: " + game.last_player_turn().player_name);
    console.log("Player turn is: " + game.player_turn().player_name);
    console.log("Banco:" + game.banco);

    for (let player of game.players) {
        console.log(player.player_name + " hand is " + player.hand);
    }

    console.log("\n");
}

bot.launch();


