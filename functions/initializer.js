const mysql = require('mysql2');
const config = require("../config.json");
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    /*##### Initialize DB pool #####*/
    pool: mysql.createPool({
        host: config.dbhost,
        database: config.database,
        user: config.dbuser,
        password: config.dbpassword,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        supportBigNumbers: true,
        bigNumberStrings: true
    }),

    /*##### Count bot guilds #####*/
    guilds: function (client) {
        let servers = client.guilds.cache.size;
        client.user.setActivity(`Helping in ${servers} servers!`, { type: "PLAYING" });
    },

    /*##### Load events #####*/
    events: function (pool, schedule, client) {
        pool.query("SELECT events.id, name, description, eventDate, user, server_id, channel_id, type, time_difference, language FROM events join users on users.id = events.user where eventDate > addtime(sysdate(),'-20000')", function (err, rows, fields) {
            if (err) { return; }
            rows.forEach(row => {
                schedule.scheduler(row, client);
            });
        })
    },

    /*##### Load guild slash commands #####*/
    slashLoader: async function (Routes, config, rest) {
        console.log('Started refreshing application (/) commands.');

        let commands = [
            new SlashCommandBuilder().setName('events').setDescription('Returns all events on this server or DM'),

            new SlashCommandBuilder().setName('invite').setDescription('Returns an embed with a link to invite the bot to a new server'),

            new SlashCommandBuilder().setName('ping').setDescription('Get latency between users and bot'),

            new SlashCommandBuilder().setName('version').setDescription('Returns the current bot version'),

            new SlashCommandBuilder().setName('language').setDescription('Set the bot language')
                .addStringOption(option =>
                    option.setName('language')
                        .setDescription('The language')
                        .setRequired(false)
                        .addChoices(
                            { name: 'English', value: 'en' },
                            { name: 'Español', value: 'es' },
                            { name: 'Français', value: 'fr' },
                            { name: 'Pyccкий', value: 'ru' },
                        )
                ),
            
            new SlashCommandBuilder().setName('help').setDescription('Know how to use the bot')
            .addStringOption(option =>
                option.setName('section')
                    .setDescription('help section')
                    .setRequired(true)
                    .addChoices(
                        { name: 'utilities', value: 'utilities' },
                        { name: 'events', value: 'events' },
                        { name: 'all', value: 'all' },
                    )
            ),

            new SlashCommandBuilder().setName('timezone').setDescription('Set your timezone')
                .addStringOption(option =>
                    option.setName('timezone')
                        .setDescription('Your timezone (empty for utc +0)')
                        .setRequired(false)
                        .addChoices(
                            { name: 'utc+1',  value: '+1'},
                            { name: 'utc+2',  value: '+2'},
                            { name: 'utc+3',  value: '+3'},
                            { name: 'utc+4',  value: '+4'},
                            { name: 'utc+5',  value: '+5'},
                            { name: 'utc+6',  value: '+6'},
                            { name: 'utc+7',  value: '+7'},
                            { name: 'utc+8',  value: '+8'},
                            { name: 'utc+9',  value: '+9'},
                            { name: 'utc+10', value: '+10'},
                            { name: 'utc+11', value: '+11'},
                            { name: 'utc+12', value: '+12'},
                            { name: 'utc+13', value: '+13'},
                            { name: 'utc-1',  value: '-1'},
                            { name: 'utc-2',  value: '-2'},
                            { name: 'utc-3',  value: '-3'},
                            { name: 'utc-4',  value: '-4'},
                            { name: 'utc-5',  value: '-5'},
                            { name: 'utc-6',  value: '-6'},
                            { name: 'utc-7',  value: '-7'},
                            { name: 'utc-8',  value: '-8'},
                            { name: 'utc-9',  value: '-9'},
                            { name: 'utc-10', value: '-10'},
                            { name: 'utc-11', value: '-11'},
                            { name: 'utc-12', value: '-12'},
                        )
                ),

            new SlashCommandBuilder().setName('add').setDescription('add a new event')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('event name')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('day')
                        .setDescription('event day')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('month')
                        .setDescription('event month')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('year')
                        .setDescription('event year')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('hour')
                        .setDescription('event hour')
                        .setRequired(false)
                )
                .addIntegerOption(option =>
                    option.setName('minute')
                        .setDescription('event minute')
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('event description')
                        .setRequired(false)
                ),

            new SlashCommandBuilder().setName('update').setDescription('update an event')
                .addIntegerOption(option =>
                    option.setName('event')
                        .setDescription('event ID')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('event name')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('day')
                        .setDescription('event day')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('month')
                        .setDescription('event month')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('year')
                        .setDescription('event year')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('hour')
                        .setDescription('event hour')
                        .setRequired(false)
                )
                .addIntegerOption(option =>
                    option.setName('minute')
                        .setDescription('event minute')
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('event description')
                        .setRequired(false)
                ),
            
            new SlashCommandBuilder().setName('remove').setDescription('delete an event')
                .addIntegerOption(option =>
                    option.setName('event')
                        .setDescription('event ID')
                        .setRequired(true)
                ),
        ]

            .map(command => command.toJSON());

        await rest.put(Routes.applicationCommands(config.botID), { body: commands })
            .then(() => console.log('Successfully reloaded application (/) commands.'))
            .catch(console.error);
    }

}