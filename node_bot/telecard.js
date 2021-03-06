"use strict";

const Telegraf = require('telegraf');
const Extra = require('telegraf/extra');
const statics = require('./statics');
const Markup = require('telegraf/markup');
const Dubito = require('./dubito.js');
const util = require("util");
const fs = require("fs");
const {Client} = require('pg');
const process = require('process');
require('dotenv').config();


const client = new Client({
    host: process.env.DB_HOST,
    port: 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

const game = new Dubito.DubitoGame();

const CARDS_PER_ROW = 7; // max number of cards per keyboard row

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

game.new_turn = async function () {

    // check for discardable cards

    for (let i = 0; i < game.players.length; ++i) {
        let player = game.players[i];

        let discarded = player.findQuadris();

        if (discarded.length > 0) {
            game._foreach_player(p => {
                bot.telegram.sendMessage(p.chat_id, util.format("%s has discarded %d card(s) with number(s) %s", player.player_name, discarded.length, discarded.filter(statics.distinct)));
            });

            player.discard(discarded);
        }
    }


    // check if game if finished

    if (game.players.length === 1) {
        await bot.telegram.sendMessage(game.players[0].chat_id, "You lost! Game is finished, to start a new one /join again");
        client.query(
            'update "users_games" set position=$1 where game_id = $2 and user_id=(select user_id from "users" where chat_id=$3)',
            [game.start_players_number, game.game_id, game.players[0].chat_id]);
        game.gameReset();
        return;
    }


    // send keyboard to users

    for (let player of game.players) {
        if (player === game.player_turn()) {

            let btns = getButtonsArray(player.hand);
            btns.push(["Doubt"]);

            bot.telegram.sendMessage(player.chat_id, "It's your turn", Markup.keyboard(btns).resize().extra());
        } else {
            bot.telegram.sendMessage(player.chat_id, "It's " + game.player_turn().player_name + "'s turn", Markup.removeKeyboard(true).extra());
        }
    }
};

game.on_player_wins = async function (p) {

    let player_position = game.start_players_number - game.players.length + 1;

    for (let pl of game.players) {
        if (p === pl) {
            bot.telegram.sendMessage(pl.chat_id, util.format("You have won and will be removed from the game! Your position is number %d", player_position));
        } else {
            bot.telegram.sendMessage(pl.chat_id, util.format("%s has won and will be removed from the game!", p.player_name));
        }
    }

    await client.query(
        'update "users_games" set position=$1 where game_id = $2 and user_id=(select user_id from "users" where chat_id=$3)',
        [player_position, game.game_id, p.chat_id]);


};

bot.start(async (ctx) => {
    await ctx.reply("Benvenuto in Telecard! Per iniziare a giocare digita /join tuonome");
    send_help(ctx.chat.id)
});

bot.command('join', async (ctx) => {
    if (game.turn !== -1) {
        ctx.reply("Game already started, try again later");
        return;
    }

    if (game.get_player(ctx.chat.id) != null) {
        ctx.reply("You are already in the game");
        return;
    }

    let parts = ctx.message.text.split(' ');

    const res = await client.query('select * from "users" where chat_id = $1', [ctx.chat.id]);

    let name;
    let id;

    if (res.rowCount > 0) {
        name = parts.length === 2 ? parts[1] : res.rows[0].nickname;
        id = res.rows[0].user_id;
        await ctx.reply(util.format("Welcome back %s! Your first visit was %s", name, res.rows[0].first_seen.toISOString().slice(0, 10)));

        client.query('update "users" set last_seen=$1,nickname=$3 where user_id=$2', [new Date().toISOString(), id, name])
    } else {
        name = parts.length === 2 ? parts[1] : ctx.from.username;

        if (name === undefined) {
            await ctx.reply("You must set a nickname in your telegram settings or specify a nickname in the join command to play");
            return;
        }

        await ctx.reply("Welcome to fcard_bot!");

        const result = await client.query('insert into "users"(chat_id, nickname, first_seen) values ($1, $2, $3) returning user_id', [ctx.chat.id, name, new Date().toISOString()]);
        id = result.rows[0].user_id;
    }

    let me = new Dubito.Player(name.replace("\r", ""), ctx.chat.id);
    me.id = id;

    game.players.push(me);


    await ctx.reply(util.format("Welcome to the game %s! \nConnected players: %s", me.player_name, game.players.map(p => p.player_name)));

    if (game.game_admin == null) {
        await ctx.reply("You're the first player, wait for others to connect and then run /startgame");
        game.game_admin = me;
        if (!ctx.message.text.includes("private")) {
            sendSubscriptionNotification(me);
        }
    } else {
        await ctx.reply("Wait for the administrator to start the game.")
    }

    game._foreach_player(p => {
        if (p !== me) {
            bot.telegram.sendMessage(p.chat_id, util.format("%s joined the game.\nConnected players: %s", me.player_name, game.players.map(pl => pl.player_name)));
        }
    });

    console.log(me.player_name + " joined the game");
});

bot.command('startgame', async (ctx) => {
    let me = game.get_player(ctx.chat.id);

    if (game.turn > -1) {
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

    if (game.players.length === 1) {
        ctx.reply("You are not allowed to play alone");
        return;
    }

    game.start();
    const result = await client.query('insert into "games"(timestamp) values ($1) returning game_id', [new Date().toISOString()]);

    game.game_id = result.rows[0].game_id;


    for (let player of game.players) {
        await client.query(
            'insert into "users_games"(user_id, game_id, position) select user_id, $1, NULL from "users" where chat_id=$2',
            [game.game_id, player.chat_id]);

        bot.telegram.sendMessage(player.chat_id,
            util.format("Game is started!\nYour hand is: %s\nIt's %s's turn, wait for your turn to play", Dubito.handToOutput(player.hand), game.player_turn().player_name));


    }

    await game.new_turn();

    print_debug();
});

bot.command('stopgame', async (ctx) => {
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

bot.command('hand', async (ctx) => {
    let me = game.get_player(ctx.chat.id);

    if (me === undefined || game.turn === -1) {
        ctx.reply("Game is not started or you haven't joined the game.");
        return;
    }

    ctx.reply(util.format("Your hand is: %s \n(%d cards)", Dubito.handToOutput(me.hand), me.hand.length));
});

bot.command('leave', async (ctx) => {
    let me = game.get_player(ctx.chat.id);


    if (game.turn > -1) {
        await ctx.reply("You cannot leave a game that is already started. Please ask the administrator to run /stopgame");
        return;
    }

    game._foreach_player(async p => {
        if (p !== me) {
            await bot.telegram.sendMessage(p.chat_id, me.player_name + " has left the game");
        }
    });

    bot.telegram.sendMessage(me.chat_id, "You left the game");


    game.players.splice(game.players.indexOf(me), 1);
});

bot.command('gameinfo', async (ctx) => {
    if (game.turn === -1) {
        ctx.reply("Game is not started");
        return;
    }

    let str = util.format("Connected players: %s\nTurn number: %d\nIt's %s's turn\nThere are %d cards on the table\n\n",
        game.players.map(p => p.player_name), game.turn, game.player_turn().player_name, game.banco.length);


    for (let player of game.players) {
        str += util.format("%s has %d cards in hand\n", player.player_name, player.hand.length)
    }

    await ctx.reply(str, null);
});

bot.command('help', async (ctx) => {
    send_help(ctx.chat.id);
});

bot.command('debuginfo', async (ctx) => {
    print_debug();
    ctx.reply("Table: " + game.banco);
    ctx.reply("Turn: " + game.turn);
    ctx.reply("Player's turn: " + game.player_turn().player_name);

    for (let player of game.players) {
        ctx.reply(util.format("%s's hand: %s", player.player_name, player.hand))
    }
});

bot.command('keyboard', async (ctx) => {
    let me = game.get_player(ctx.chat.id);

    if (game.turn === -1) {
        await ctx.reply("Game not started, either /join or ask the administrator to start the game");
        return;
    }

    if (game.player_turn() !== me) {
        await ctx.reply("It's not your turn");
        return;
    }

    let btns = getButtonsArray(me.hand);
    btns.push(["Doubt"]);

    bot.telegram.sendMessage(me.chat_id, ".", Markup.keyboard(btns).oneTime().resize().extra());
});

bot.command('stats', async (ctx) => {
    const mer = await client.query('select * from "users" where chat_id=$1', [ctx.chat.id]);
    const result = await client.query('select count(*) from "users_games" where user_id=$1 and position=1 union select count(*) from "users_games" where user_id=$1', [mer.rows[0].user_id]);

    await ctx.reply(util.format("Your first game was on %s.\nYou played your last game on %s\nYou won %d games out of %d games played", mer.rows[0].first_seen.toISOString().slice(0, 10), mer.rows[0].last_seen.toISOString().slice(0, 10), result.rows[0].count, result.rows[1].count))
});

bot.command('subscribe', async (ctx) => {
    await client.query('update "users" set subscribed=true where chat_id=$1', [ctx.chat.id]);
    ctx.reply("You will now be informed when a new game is started")
});

bot.command('unsubscribe', async (ctx) => {
    await client.query('update "users" set subscribed=false where chat_id=$1', [ctx.chat.id]);
    ctx.reply("You won't be informed when a new game is started anymore")
});

bot.command('suits', async (ctx) => {

    let str = util.format("%s is Spades (S). ITA: Picche\n%s is Hearts (H). ITA: Cuori\n%s is Diamonds (D). ITA: Quadri\n%s is Clubs (C). ITA: Fiori",
        String.fromCharCode(0x2660),
        String.fromCharCode(0x2665),
        String.fromCharCode(0x2666),
        String.fromCharCode(0x2663),
    );

    ctx.reply(str);

});

bot.command('leaderboard', async (ctx) => {
    const result = await client.query('select nickname, count(*) from users U join users_games UG on U.user_id = UG.user_id where position=1 group by U.user_id order by count(*) desc');

    let str = "Leaderboard of players based on number of games won\n";

    for (let i = 0; i < result.rows.length; ++i) {
        str += util.format("%d: %s (%d games won)\n", i + 1, result.rows[i].nickname, result.rows[i].count);
    }

    ctx.reply(str);
});

bot.on('message', async (ctx) => {
// return;
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

    // ctx.reply(".", Extra.markup((m) => m.removeKeyboard(true)));

    if (ctx.message.text.toLowerCase() === "doubt") {

        console.log(me.player_name + " has doubted");

        if (await game.dubita()) {
            let send_promises = [];
            for (let player of game.players) {

                send_promises.push(bot.telegram.sendMessage(player.chat_id, util.format("%s doubted right, last card was %s and not a %s!\n%s has now %d card in hands!",
                    me.player_name, Dubito.cardToOutput(game.last_table_card), game.last_declared_card, game.last_player_turn().player_name, game.last_player_turn().hand.length))

                    .then(v => {
                        // bot.telegram.sendMessage(player.chat_id, "It is " + me.player_name + "'s turn");

                    }));
            }

            Promise.all(send_promises).then(async val => {
                game.last_declared_card = null;
                await game.new_turn();
            });

        } else {
            let send_promises = [];

            for (let p of game.players) {

                send_promises.push(bot.telegram.sendMessage(p.chat_id, util.format("%s doubted wrong, last card was effectively %s!\n%s has now %d card in hands!",
                    me.player_name, Dubito.cardToOutput(game.last_table_card), me.player_name, me.hand.length)))
            }

            Promise.all(send_promises).then(async val => {
                game.last_declared_card = null;
                await game.new_turn();
            });
        }
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
        await game.gioca(real, declared)
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

    print_debug();
    await game.new_turn();
});

function print_debug() {
    if (game.game_id === null || game.game_id === undefined) {
        return;
    }

    console.log("This is game number: " + game.game_id);
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

function send_help(id) {
    bot.telegram.sendMessage(id, fs.readFileSync("./game_help.txt").toString())
}

function getButtonsArray(_hand) {
    let arr = [];
    let hand = _hand.slice(0);

    hand.sort(function (a, b) {
        let cmp = statics.compare(a.substring(1), b.substring(1));

        return cmp === 0 ? statics.compare(a.substring(0), b.substring(0)) : cmp;
    });

    for (let i = 0; i < hand.length; ++i) {
        let card = Dubito.cardToOutput(hand[i]);
        if (arr[Math.floor(i / CARDS_PER_ROW)] === undefined) {
            arr.push([]);
        }
        arr[Math.floor(i / CARDS_PER_ROW)].push(card)
    }

    return arr;
}

async function sendSubscriptionNotification(me) {
    const res = await client.query('select chat_id from "users" where subscribed=true and user_id<>$1', [me.id]);

    for (let row of res.rows) {
        await bot.telegram.sendMessage(row.chat_id, util.format("%s is starting new game, /join quickly to join it!\nSend /unsubscribe if you don't want to be informed when a new game starts", me.player_name))
    }
}

(async function main() {

    let retries = 5;

    while (retries) {
        try {
            await client.connect();
            break;
        } catch (err) {
            console.log(err);
            retries -= 1;
            await new Promise(res => setTimeout(res, 5000));
        }
    }


    await client.query("set search_path to public,fcard_game");
    bot.launch();
})();