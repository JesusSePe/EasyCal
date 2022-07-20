
const { Client, Intents } = require('discord.js'); // Load Discord JS modules
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGES], partials: ["CHANNEL"] }); // Connect to Discord
const config = require("./config.json"); // Discord bot sensible variables
const commands = require("./functions/commands.js"); // All commands.
const schedule = require("./functions/schedule.js"); // Schedule function.
const Locale = require("./functions/getLocale.js"); // GetLocale function
const init = require("./functions/initializer.js"); // Bot initialization functions
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
});

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
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return; // Avoid those interactions that are not commands

    // Save user language. In DMs is always in english.
    try {
        var langDef = interaction.guildLocale.split('-')[0];
    } catch {
        var langDef = "en";
    }

    // If language is not supported, will be changed to english.
    if (langDef != "en" && langDef != "es" && langDef != "fr" && langDef != "ru") {
        langDef = "en";
    }

    // Adding user to DB if not exists
    let user = interaction.user.id;
    let sql = `INSERT INTO users (id, updated_at, created_at, language, time_difference) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE updated_at = ?`;
    await promisePool.query(sql, [user, new Date, new Date, langDef, 0, new Date], function (error, results, fields) { });

    // Get user language
    let [rows, fields] = await promisePool.query(`SELECT language FROM users WHERE id = ?`, [user]);
    let lang = rows[0].language;

    switch (interaction.commandName) {
        case 'ping':
            commands.ping(interaction, lang);
            break;
        
        case 'version':
            commands.version(interaction, ver, lang);
            break;
        
        case 'events':
            commands.events(interaction, promisePool, lang);
            break;
        
        case 'invite':
            commands.invite(interaction, inv, lang);
            break;
        
        case 'language':
            commands.language(interaction, pool, lang);
            break;
        
        case 'timezone':
            commands.timezone(interaction, lang, pool);
            break;
        
        case 'add':
            commands.add(interaction, pool, lang, client);
            break;
        
        case 'remove':
            commands.remove(interaction, pool, lang, client);
            break;

        case 'update':
            commands.update(interaction, pool, lang, client);
            break;

        case 'events':
            commands.events(interaction, pool, lang);
            break;

        case 'help':
            commands.help(interaction, pool, lang);
            break;

        default:
            break;
    }
});

client.on("messageCreate", async function (message) {
    if (message.author.bot) return; // Avoid reading messages from bots

    // COMMANDS

    // Remind event
    if (command === "remind") {
        commands.remind(message, args, pool, prefix, user, client, lang, "remind");
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

app.get('/cal/update_data', function (req, res) {
    try {
        try {
            schedule.cancelJob(req.query.id);
        } catch { }
        schedule.scheduler(req.query, client);
        res.send('Roger that');

    } catch {
        res.send('Error');
    }
});

app.get('/cal/remove', function (req, res) {
    try {
        try {
            schedule.cancelJob(req.query.id);
        } catch { }
        res.send('Roger that');
    } catch {
        res.send('Error');
    }
});

server.listen(3000, 'localhost');

client.login(config.BOT_TOKEN); // Login into the Discord bot