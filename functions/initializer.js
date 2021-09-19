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
        pool.query("SELECT events.id, name, description, eventDate, user, server_id, channel_id, type, time_difference FROM events join users on users.id = events.user where eventDate > addtime(sysdate(),'-20000')", function (err, rows, fields) {
            if (err) { return; }
            rows.forEach(row => {
                schedule.scheduler(row, client);
            });
        })
    }
}