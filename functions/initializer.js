const mysql = require('mysql2');
const config = require("../config.json");

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
    guilds: function(client){
        let servers = client.guilds.cache.size;
        client.user.setActivity(`Helping in ${servers} servers!`, { type: "PLAYING" });
    },

    /*##### Load events #####*/
    events: function(pool, schedule, client){
        pool.query("SELECT events.id, name, description, eventDate, user, server_id, channel_id, type, time_difference, language FROM events join users on users.id = events.user where eventDate > addtime(sysdate(),'-20000')", function (err, rows, fields) {
            if (err) { return; }
            rows.forEach(row => {
                schedule.scheduler(row, client);
            });
        })
    },

    /*##### Load guild slash commands #####*/
    slashLoader: async function(Routes, config, rest){
        try {
            console.log('Started refreshing application (/) commands.');
            await rest.put(
                Routes.applicationCommands(config.botID),
                //{body : commands},
                {body: [{name: 'invite', description: 'Returns an embed with a link to invite the bot to a new server'},
                        {name: 'ping', description: 'Get latency between users and bot'},
                        {name: 'version', description: 'Returns the current bot version'}]},
            );
            console.log('Successfully reloaded application (/) commands.');
        } catch (error) {
            console.error(error);
        }
    }

}