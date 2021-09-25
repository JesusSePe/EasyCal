const {Client, Intents} = require('discord.js'); // Load Discord JS modules
const config = require("./config.json"); // Discord bot sensible variables
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGES], partials: ["CHANNEL"] }); // Connect to Discord
const { SlashCommandBuilder } = require('@discordjs/builders');
const commands = require("./functions/commands.js"); // All commands.
const schedule = require("./functions/schedule.js"); // Schedule function.
const Locale = require("./functions/getLocale.js"); // GetLocale function
const init = require("./functions/initializer.js"); // Bot initialization functions
const axios = require('axios').default; // library to make API calls
var express = require('express'); // Node server (to listen on a certain port)
var http = require('http'); // Extra module for our server
const fs = require('fs');


// Multiple variables
const prefix = config.botPrefix;
const ver = config.botVer;
const inv = config.inv;
const timezones = config.timezones;


// DB
const { networkInterfaces } = require("os");
const { slash } = require('./functions/initializer.js');
const pool = init.pool;

const promisePool = pool.promise();

client.on("ready", () => {
    init.guilds(client); // Display the amount of servers the bot is in.
    init.events(pool, schedule, client); // Load all the events on start
    
    
    // Slash commands initialization
    const { REST } = require('@discordjs/rest');
    const { Routes } = require('discord-api-types/v9');
    const rest = new REST({ version: '9' }).setToken(config.BOT_TOKEN);
    
    init.slashLoader(Routes, config, rest);
})

// guildCreate
/* Emitted whenever the client joins a guild.
PARAMETER    TYPE         DESCRIPTION
guild        Guild        The created guild    */
client.on("guildCreate", function (guild) {
    init.guilds(client); // Update the amount of servers the bot is in (status)
});

// guildDelete
/* Emitted whenever a guild is deleted/left.
PARAMETER    TYPE         DESCRIPTION
guild        Guild        The guild that was deleted    */
client.on("guildDelete", function (guild) {
    init.guilds(client); // Update the amount of servers the bot is in (status)
});


// Control interactions (Slash commands)
client.on('interactionCreate', interaction => {
	if (!interaction.isCommand()) return; // Avoid those interactions that are not commands

	if (interaction.commandName === 'ping') {
        commands.ping(interaction, 'en');
	} else if (interaction.commandName === 'version'){
        commands.version(interaction, ver, 'en');
    } else if (interaction.commandName === 'events'){
        commands.events(interaction, promisePool, 'en');
    } else if (interaction.commandName === 'invite'){
        commands.invite(interaction, inv, 'en');
    }
});

client.on("messageCreate", async function (message) {
    if (message.author.bot) return; // Avoid reading messages from bots

    // Save user language. In DMs is always in english.
    try {
        var langDef = message.guild.preferredLocale.split('-')[0];
    } catch {
        var langDef = "en";
    }

    // If language is not supported, will be changed to english.
    if (langDef != "en" && langDef != "es" && langDef != "fr" && langDef != "ru") {
        langDef = "en";
    }

    // Adding user to DB if not exists
    let user = message.author.id;
    let sql = `INSERT INTO users (id, updated_at, created_at, language, time_difference) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE updated_at = ?`;
    await promisePool.query(sql, [user, new Date, new Date, langDef, 404, new Date], function (error, results, fields) { });

    // Get user language
    let [rows, fields] = await promisePool.query(`SELECT language FROM users WHERE id = ?`, [user]);
    let lang = rows[0].language;


    // React on mention
    if (message.content == (`<@!${config.botID}>`) || message.content == (`<@${config.botID}>`)) {
        return message.channel.send(Locale.getLocale(lang, "pingBot", prefix, prefix));
    }

    if (!message.content.startsWith(prefix)) return; // Avoid reading messages that does NOT start with the prefix

    const commandBody = message.content.slice(prefix.length); // Save on commandBody the whole command, without prefix
    const args = commandBody.split(' '); // Save on args the different parts of the command
    const command = args.shift().toLowerCase(); // Delete first item on args and convert to lowecase the whole command.



    // COMMANDS
    // Ping
    if (command === "ping") {
        commands.ping(message, lang);
    }

    // Version
    else if (command === "version" || command === "ver") {
        commands.version(message, ver, lang)
    }

    // Invite command
    else if (command === "invite") {
        commands.invite(message, inv, lang);
    }

    // Language command
    else if (command === "language") {
        commands.language(message, args, pool, lang, args);
    }

    // Add event
    else if (command === "add") {
        let [rows, fields] = await promisePool.query(`SELECT time_difference FROM users WHERE id = ?`, [user])
        if (rows[0].time_difference == 404) {
            message.channel.send(Locale.getLocale(lang, "Timezone1"))
            message.channel.awaitMessages(m => m.author.id == message.author.id,
                { max: 1, time: 60000, error: ['time'] })
                .then(collected => {
                    location = collected.first().content.replace(/ /g, "+");
                    //https://api.ipgeolocation.io/timezone?apiKey=API_KEY&location=London,%20UK
                    link = "https://api.ipgeolocation.io/timezone?apiKey=¿&location=_".replace(/_/g, location).replace(/¿/g, timezones);
                    axios({
                        method: 'get',
                        url: link
                    })

                        .then(function (res) {
                            // Parse
                            var data = JSON.parse(JSON.stringify(res.data));
                            try {
                                var info = data.date_time_wti.split(' '); // Get time difference (+0200)
                                var difference = info[5].replace(/0/g, ""); // Remove unnecessary characters (+2)

                                let sql = `UPDATE users set time_difference = ${difference} where id = ${message.author.id}`;
                                pool.query(sql, function (err, result, fields) {
                                    if (err) {
                                        return message.channel.send(Locale.getLocale(lang, "internalError"));
                                    } else {
                                        message.channel.send(Locale.getLocale(lang, "TimezoneUp"));
                                        commands.add(message, args, pool, prefix, user, client, lang, "add");
                                        return;
                                    }
                                });
                            } catch {
                                return message.channel.send(Locale.getLocale(lang, "TimezoneError"));
                            }
                        })
                        .catch(function () {
                            return message.channel.send(Locale.getLocale(lang, "TimezoneError"));
                        })
                })
                .catch(collected => {
                    return message.channel.send(Locale.getLocale(lang, "TimeExpired"));
                })
        } else {
            commands.add(message, args, pool, prefix, user, client, lang, "add");
        }
    }

    // Show events
    else if (command === "events") {
        commands.events(message, promisePool, lang);
    }

    // Remove event
    else if (command === "remove") {
        commands.remove(message, args, prefix, promisePool, lang);
    }

    // Update event
    else if (command === "update") {
        commands.update(message, args, prefix, promisePool, lang, pool, user, client);
    }

    // Set timezone
    else if (command === "timezone") {
        commands.timezone(message, lang, timezones, pool, args);
    }

    // Help
    else if (command === "help") {
        commands.help(message, args, prefix, lang);
    }

});

/**############################ */
/**--SERVER TO LISTEN ON PORT-- */
/**############################ */

var app = express();
var server = http.createServer(app);

app.get('/cal/update_data', function(req, res){
    try {
        try {
            schedule.cancelJob(req.query.id);
        } catch {}
        schedule.scheduler(req.query, client);
        res.send('Roger that');
        
    } catch {
        res.send('Error');
    }
});

app.get('/cal/remove', function(req, res){
    try {
        try{
            schedule.cancelJob(req.query.id);
        }catch{}
        res.send('Roger that');
    } catch {
        res.send('Error');
    }
});

server.listen(3000, 'localhost');

client.login(config.BOT_TOKEN); // Login into the Discord bot