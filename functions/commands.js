const Discord = require("discord.js");
var dateFormat = require("dateformat"); // Dateformat package
const schedule = require("./schedule.js"); // Schedule function.
const Locale = require("./getLocale.js"); // GetLocale function
const languages = require("./languages.json"); // Get languages JSON file.


module.exports = {
    /*##### PING #####*/
    ping: async function (message, lang) {
        const sentMsg = await message.channel.send('Ping...');
        message.reply(Locale.getLocale(lang, "ping", `${sentMsg.createdTimestamp - (message.editedTimestamp || message.createdTimestamp)}`));
        sentMsg.delete();
    },

    /*##### VERSION #####*/
    version: function (message, ver, lang) {
        message.reply(Locale.getLocale(lang, "ver", `${ver}`));
    },

    /*##### INVITE #####*/
    invite: function (message, inv, lang) {
        invEmbed = new Discord.MessageEmbed().addField(Locale.getLocale(lang, "inv"), Locale.getLocale(lang, "invLink", `${inv}`))
        message.reply({ embeds: [invEmbed] });
    },

    /*##### LANGUAGE #####*/
    language: function (message, pool, lang) {
        var args = message.options._hoistedOptions;
        if (args.length == 0) {
            let langName = languages.find((x) => x.value == lang).name;
            message.reply(Locale.getLocale(lang, "CurLang", `${langName}`));
            return;
        }
        pool.query(`UPDATE users set language = ? WHERE id = ?`, [args[0].value.toLowerCase(), message.user.id], function (err, rows, fields) {
            if (err) {
                return message.reply(Locale.getLocale(lang, "internalError"));
            }
            message.reply(Locale.getLocale(args[0].value.toLowerCase(), "NewLang"));
        });
    },

    /*##### TIMEZONE #####*/
    timezone: async function (message, lang, pool) {
        if (typeof (message.options._hoistedOptions[0]) != 'undefined') {
            var difference = message.options._hoistedOptions[0].value; // Get time difference 
            let sql = `UPDATE users set time_difference = ${difference} where id = ${message.user.id}`;
            pool.query(sql, function (err, result, fields) {
                if (err) {
                    message.reply(Locale.getLocale(lang, "internalError"));
                    return;
                } else {
                    return message.reply(Locale.getLocale(lang, "TimezoneUp"));
                }
            })
        }
        else {
            let sql = `SELECT time_difference FROM users WHERE id = ${message.user.id}`;
            pool.query(sql, function (err, result, fields) {
                if (err) {
                    message.reply(Locale.getLocale(lang, "internalError"));
                    return;
                } else {
                    var time = result[0].time_difference;
                    if (time == 404)
                        return message.reply(Locale.getLocale(lang), "noTimezone");
                    if (time > 0)
                        return message.reply(Locale.getLocale(lang, "TimezoneDiff", `+${time}`));
                    if (time < 0)
                        return message.reply(Locale.getLocale(lang, "TimezoneDiff", `+${time}`));
                    return message.reply(Locale.getLocale(lang, "TimezoneDiff", `-${time}`));
                }
            })
        }
    },

    /*##### ADD EVENT #####*/
    add: async function (message, pool, lang, client) {

        // Required params
        var name = message.options._hoistedOptions.find(x => x.name == 'name').value;
        var day = message.options._hoistedOptions.find(x => x.name == 'day').value;
        var month = message.options._hoistedOptions.find(x => x.name == 'month').value;
        var year = message.options._hoistedOptions.find(x => x.name == 'year').value;

        // Optional params
        try {
            var hour = message.options._hoistedOptions.find(x => x.name == 'hour').value;
            var minute = message.options._hoistedOptions.find(x => x.name == 'minute').value;
            var description = message.options._hoistedOptions.find(x => x.name == 'description').value;
        } catch {
            var hour = 0;
            var minute = 0;
            var description = "";
        }

        // Check date is valid
        let checkDate = new Date(year, month - 1, day);
        if (checkDate.getFullYear() == year && checkDate.getMonth() == month - 1 && checkDate.getDate() == day) {

            // Date is good, check time, if there's any

            if (typeof (hour) == 'undefined' || !(0 <= hour < 24)) {
                hour = 0;
            }

            if (typeof (minute) == 'undefined' || !(0 <= minute < 60)) {
                minute = 0;
            }

            let eventDate = new Date(year, month - 1, day, hour, minute, 0);

            if (typeof (description) == 'undefined') {
                description = null;
            }

            if (message.guildId == null) { var type = 'dm' } else { var type = 'server' }

            let sql = `INSERT INTO events (name, description, eventDate, user, server_id, channel_id, type, created_at, updated_at) VALUES (?, ?, ?, ${message.user.id}, ${message.guildId}, ${message.channelId}, '${type}', sysdate(), sysdate())`;
            pool.query(sql, [name, description, eventDate], function (err, result, fields) {
                if (err) {
                    message.channel.send(Locale.getLocale(lang, "internalError"));
                    return;
                }
                pool.query(`SELECT events.id, name, description, eventDate, user, server_id, channel_id, type, time_difference, users.language FROM events join users on users.id = events.user WHERE events.id = ${result.insertId}`, function (err, result2, fields) {
                    if (err) {
                        message.channel.send(Locale.getLocale(lang, "internalError"));
                        return;
                    }
                    result2.forEach(row => {
                        schedule.scheduler(row, client);

                        message.channel.send(Locale.getLocale(lang, "eventAdded"));
                        message.reply(Locale.getLocale(lang, "newEventInfo", `${name}`, `${description}`, `${eventDate.toString().split('(')[0]}`));
                    })
                })
            });

        } else {
            message.reply(Locale.getLocale(lang, "BadDate"));
        }
    },

    /*##### UPDATE EVENT #####*/
    update: async function (message, pool, lang, client) {
        try {
            // Required params
            var jobId = message.options._hoistedOptions.find(x => x.name == 'event').value.toString();
            var name = message.options._hoistedOptions.find(x => x.name == 'name').value;
            var day = message.options._hoistedOptions.find(x => x.name == 'day').value;
            var month = message.options._hoistedOptions.find(x => x.name == 'month').value;
            var year = message.options._hoistedOptions.find(x => x.name == 'year').value;

            // Optional params
            try {
                var hour = message.options._hoistedOptions.find(x => x.name == 'hour').value;
            } catch {
                var hour = 0;
            }
            try {
                var minute = message.options._hoistedOptions.find(x => x.name == 'minute').value;
            } catch {
                var minute = 0;
            }
            try {
                var description = message.options._hoistedOptions.find(x => x.name == 'description').value;
            } catch {
                var description = "";
            }

            // Check date is valid
            let checkDate = new Date(year, month - 1, day);
            if (checkDate.getFullYear() == year && checkDate.getMonth() == month - 1 && checkDate.getDate() == day) {

                // Date is good, check time, if there's any

                if (typeof (hour) == 'undefined' || !(0 <= hour < 24)) {
                    hour = 0;
                }

                if (typeof (minute) == 'undefined' || !(0 <= minute < 60)) {
                    minute = 0;
                }

                let eventDate = new Date(year, month - 1, day, hour, minute, 0);

                if (typeof (description) == 'undefined') {
                    description = null;
                }

                if (message.guildId == null) { var type = 'dm' } else { var type = 'server' }
                var ok = true;

                let sql = `UPDATE events SET name = ?, description = ?, eventDate = ?, updated_at = sysdate() WHERE events.id = ${jobId}`;
                pool.query(sql, [name, description, eventDate], function (err, result, fields) {
                    if (err) {
                        ok = false;
                        return;
                    }
                });

                pool.query(`SELECT events.id, name, description, eventDate, user, server_id, channel_id, type, time_difference, users.language FROM events join users on users.id = events.user WHERE events.id = ${jobId}`, function (err, result2, fields) {
                    if (err) {
                        ok = false;
                        return;
                    }
                    result2.forEach(row => {
                        try {
                            schedule.cancelJob(jobId)
                            schedule.scheduler(row, client);
                        } catch { }
                    })
                })

                if (!ok) {
                    message.channel.send(Locale.getLocale(lang, "internalError"));
                } else {
                    message.channel.send(Locale.getLocale(lang, "eventUpdated"));
                    message.reply(Locale.getLocale(lang, "newEventInfo", `${name}`, `${description}`, `${eventDate.toString().split('(')[0]}`));
                }

            } else {
                message.reply(Locale.getLocale(lang, "BadDate"));
            }
        } catch {
            message.reply(Locale.getLocale(lang, "rmEventNoEvent", `${jobId}`));
        }
    },

    /*##### REMOVE EVENT #####*/
    remove: async function (message, promisePool, lang, client) {
        var prefix = '/';
        var arg = message.options._hoistedOptions[0].value;
        if (isNaN(arg)) {
            message.channel.send(Locale.getLocale(lang, "rmEventInvalidArgs", `${arg}`, `${prefix}`));
        } else {
            try {
                let sql = `DELETE FROM events WHERE id = ? and user = ${message.user.id}`;
                promisePool.query(sql, Number(arg), function (error, results, fields) { });
                schedule.cancelJob(arg);
                message.reply(Locale.getLocale(lang, "rmEventSuccess", `${arg}`));
            } catch {
                message.reply(Locale.getLocale(lang, "rmEventNoEvent", `${arg}`));
            }
        }
    },

    /*##### EVENTS #####*/
    events: async function (message, promisePool, lang) {
        // Message sent from server
        if (message.channel.type != "DM") {
            var eventsEmbed = new Discord.MessageEmbed()
                .setColor('#0099ff')
                .setTitle(Locale.getLocale(lang, "Events"))
                .setURL(`https://telek.tk/dashboard/${message.guild.id}`)
                .setDescription(Locale.getLocale(lang, "ServerTitle"))
            try {
                var [results, fields] = await promisePool.query(`SELECT * FROM events WHERE server_id = ? AND eventDate > addtime(sysdate(),'-20000') order by eventDate`, [message.guild.id]);
            } catch (err) {
                console.log(err);
            }
            results.forEach(row => {
                if (row.description == "") { row.description = "-" }
                eventsEmbed.addField(`id: ${row.id} ${dateFormat(row.eventDate, 'paddedShortDate')}: ${row.name}`, `${row.description}`);
            });
            // IF there are no events
            if (results.length == 0) {
                message.reply(Locale.getLocale(lang, "NoEvents"));
                // If there are events
            } else {
                message.reply({ embeds: [eventsEmbed] }).catch();
            }
        }
        // Message sent from DMs
        else {
            var eventsEmbed = new Discord.MessageEmbed()
                .setColor('#0099ff')
                .setTitle(Locale.getLocale(lang, "Events"))
                .setURL('https://telek.tk/dashboard/dm')
                .setDescription(Locale.getLocale(lang, "PersonalEvents"))
            try {
                var usrId = message.user.id;
                var [results, fields] = await promisePool.query(`SELECT * FROM events WHERE user = ? AND server_id is null AND eventDate > addtime(sysdate(),'-20000') order by eventDate`, [usrId]);
            } catch (err) {
                console.log(err);
            }
            results.forEach(row => {
                if (row.description == "") { row.description = "-" }
                eventsEmbed.addField(`id: ${row.id} ${dateFormat(row.eventDate, 'paddedShortDate')}: ${row.name}`, `${row.description}`);
            });

            if (results.length == 0) {
                message.reply(Locale.getLocale(lang, "NoEvents"));
            } else {
                message.reply({ embeds: [eventsEmbed] }).catch();
            }
        }
    },

    /*##### HELP #####*/
    help: function (message, args, lang) {
        var prefix = '/'
        try {
            var args = message.options._hoistedOptions;
            if (args[0].value === "utilities") {
                var helpEmbed = new Discord.MessageEmbed()
                    .setColor('#0099ff')
                    .setTitle('easyCal')
                    .setURL('https://telek.tk/docs')
                    .setDescription(Locale.getLocale(lang, "Utilities"))
                    .addFields(
                        { name: `${prefix} ping`, value: Locale.getLocale(lang, "HelpPing") },
                        { name: `${prefix} help`, value: Locale.getLocale(lang, "HelpHelp") },
                        { name: `${prefix} invite`, value: Locale.getLocale(lang, "HelpInv") },
                        { name: `${prefix} version`, value: Locale.getLocale(lang, "HelpVer") },
                        { name: `${prefix} language`, value: Locale.getLocale(lang, "HelpLang", prefix, prefix) },
                        { name: `${prefix} timezone`, value: Locale.getLocale(lang, "HelpTimezone", prefix, prefix) },
                    )
                    .setTimestamp()
            }
            else if (args[0].value === "events") {
                var helpEmbed = new Discord.MessageEmbed()
                    .setColor('#0099ff')
                    .setTitle('easyCal')
                    .setURL('https://telek.tk/docs')
                    .setDescription(Locale.getLocale(lang, "Events"))
                    .addFields(
                        { name: `${prefix} add`, value: Locale.getLocale(lang, "HelpAdd") },
                        { name: `${prefix} update`, value: Locale.getLocale(lang, "HelpUpdate", prefix) },
                        { name: `${prefix} remove`, value: Locale.getLocale(lang, "HelpRemove") },
                        { name: `${prefix} events`, value: Locale.getLocale(lang, "HelpEvents") }
                    )
                    .setTimestamp()
            }
            else if (args[0].value === "all") {
                var helpEmbed = new Discord.MessageEmbed()
                    .setColor('#0099ff')
                    .setTitle('easyCal')
                    .setURL('https://telek.tk/docs')
                    .setDescription('*Un comando para gobernarlos a todos*')
                    .addFields(
                        { name: `${prefix} ping`, value: Locale.getLocale(lang, "HelpPing") },
                        { name: `${prefix} help`, value: Locale.getLocale(lang, "HelpHelp") },
                        { name: `${prefix} invite`, value: Locale.getLocale(lang, "HelpInv") },
                        { name: `${prefix} version`, value: Locale.getLocale(lang, "HelpVer") },
                        { name: `${prefix} add`, value: Locale.getLocale(lang, "HelpAdd") },
                        { name: `${prefix} events`, value: Locale.getLocale(lang, "HelpEvents") }
                    )
                    .setTimestamp()
            }
            else {
                throw ("Argumento no valido");
            }

        }
        catch {
            var helpEmbed = new Discord.MessageEmbed()
                .setColor('#0099ff')
                .setTitle('easyCal')
                .setURL('https://telek.tk/docs')
                .setDescription(Locale.getLocale(lang, "HelpWelcome"))
                .addFields(
                    { name: Locale.getLocale(lang, "Utilities"), value: `${prefix} help utilities` },
                    { name: Locale.getLocale(lang, "Events"), value: `${prefix} help events` },
                    { name: Locale.getLocale(lang, "All"), value: `${prefix} help all` }
                )
                .setTimestamp()
        }
        message.reply({ embeds: [helpEmbed] });
    },

    /*##### REMIND EVENT #####*/
    remind: async function () {
        // TODO
    },

}
