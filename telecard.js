const Telegraf = require('telegraf');

const bot = new Telegraf("817731928:AAGYI67d8NIbN0T4g6zEOdKf52o1YFMIfX4");

bot.start(ctx => {
   ctx.reply("Benvenuto")
});


bot.launch();


