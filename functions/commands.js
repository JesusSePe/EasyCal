const Discord = require("discord.js");
var dateFormat = require("dateformat"); // Dateformat package
const schedule = require("./schedule.js"); // Schedule function.
const Locale = require("./getLocale.js"); // GetLocale function
const { MessageButton, MessageActionRow } = require("discord-buttons");
const axios = require('axios').default; // library to make API calls


module.exports = {
    /*##### PING #####*/
    ping: async function (message, client, lang) {
        /*const timeTaken = Math.round(client.ws.ping);
        return message.channel.send(Locale.getLocale(lang, "ping", `${timeTaken}`));*/
        const sentMsg = await message.channel.send('Pinging...');
        return sentMsg.edit(Locale.getLocale(lang, "ping", `${sentMsg.createdTimestamp - (message.editedTimestamp || message.createdTimestamp)}`));
    },

    /*##### VERSION #####*/
    version: function (message, ver, lang) {
        return message.channel.send(Locale.getLocale(lang, "ver", `${ver}`));
    },

    /*##### INVITE #####*/
    invite: function (message, inv, lang) {
        message.channel.send(new Discord.MessageEmbed().addField(Locale.getLocale(lang, "inv"), Locale.getLocale(lang, "invLink", `${inv}`)));
    },

    /*##### LANGUAGE #####*/
    language: function (message, args, pool, lang) {
        if (args[0] == null) {
            message.channel.send(Locale.getLocale(lang, "CurLang", `${lang}`));
        } else {
            if (args[0].toLowerCase() === "en" || args[0].toLowerCase() === "es" || args[0].toLowerCase() === "fr" || args[0].toLowerCase() === "ru") {
                pool.query(`UPDATE users set language = ? WHERE id = ?`, [args[0].toLowerCase(), message.author.id], function (err, rows, fields) {
                    if (err) {
                        return message.channel.send(Locale.getLocale(lang, "internalError"));
                    }
                    message.channel.send(Locale.getLocale(args[0].toLowerCase(), "NewLang"));
                });
            } else {
                return message.channel.send(Locale.getLocale(lang, "InvLang"));
            }
        }
    },

    /*##### TIMEZONES #####*/
    timezone: async function (message, lang, timezones, pool, args) {
        if (typeof args[0] == "undefined") {
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
                    }).then(function (res) {
                        // Parse
                        console.log(res.data);
                        var data = JSON.parse(JSON.stringify(res.data));
                        try {
                            var info = data.date_time_wti.split(' '); // Get time difference (+0200)
                            var difference = info[5].replace(/0/g, ""); // Remove unnecessary characters (+2)

                            let sql = `UPDATE users set time_difference = ${difference} where id = ${message.author.id}`;
                            pool.query(sql, function (err, result, fields) {
                                if (err) {
                                    return message.channel.send(Locale.getLocale(lang, "internalError"));
                                } else {
                                    return message.channel.send(Locale.getLocale(lang, "TimezoneUp"));
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

                }
                )
        } else {
            location = args.join('+');
            //https://api.ipgeolocation.io/timezone?apiKey=API_KEY&location=London,%20UK
            link = "https://api.ipgeolocation.io/timezone?apiKey=¿&location=_".replace(/_/g, location).replace(/¿/g, timezones);

            axios({
                method: 'get',
                url: link
            }).then(function (res) {
                // Parse
                var data = JSON.parse(JSON.stringify(res.data));

                var info = data.date_time_wti.split(' '); // Get time difference (+0200)
                var difference = info[5].replace(/0/g, ""); // Remove unnecessary characters (+2)


                let sql = `UPDATE users set time_difference = ${difference} where id = ${message.author.id}`;
                pool.query(sql, function (err, result, fields) {
                    if (err) {
                        message.channel.send(Locale.getLocale(lang, "internalError"));
                        return;
                    } else {
                        return message.channel.send(Locale.getLocale(lang, "TimezoneUp"));
                    }
                })
            }).catch(function () {
                return message.channel.send(Locale.getLocale(lang, "TimeExpired"));
            })
        }


    },

    /*##### ADD EVENT #####*/
    add: async function (message, args, pool, prefix, user, client, lang, command, id) {

        if (args[0] == null) {
            message.channel.send(Locale.getLocale(lang, "eventNoArgs", `${prefix}`));
        } else {
            var name = command=="add"? args.join(' ') : args.slice(1, args.length).join(' '); // Name.

            // Await get messages.
            try {
                // Get description message
                await message.channel.send(Locale.getLocale(lang, "eventDesc"));

                message.channel.awaitMessages(m => m.author.id == message.author.id,
                    { max: 1, time: 60000, errors: ['time'] })
                    .then(collected => {
                        var desc = collected.first().content; // Description
                        message.channel.send(Locale.getLocale(lang, "eventDate"));
                        // Get event date message
                        message.channel.awaitMessages(m => m.author.id == message.author.id,
                            { max: 1, time: 60000, error: ['time'] })
                            .then(collected2 => {
                                try {
                                    if (Date.parse(collected2.first().content) != 'NaN') {
                                        var day = new Date(collected2.first().content); // get Dia
                                        day = day.toISOString().slice(0, 19).replace('T', ' '); // Formatting Dia
                                        try {
                                            var server = message.guild.id;
                                            var channel = message.channel.id;
                                            var type = "server";
                                        }
                                        catch {
                                            var server = 'null';
                                            var channel = message.channel.id;
                                            var type = "dm";
                                        }
                                        // Add command
                                        if (command == "add"){
                                            let sql = `INSERT INTO events (name, description, eventDate, user, server_id, channel_id, type, created_at, updated_at) VALUES (?, ?, ?, ${user}, ${server}, ${channel}, '${type}', sysdate(), sysdate())`;
                                            pool.query(sql, [name, desc, day], function (err, result, fields) {
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
                                                    })
                                                })
                                            });
                                            message.channel.send(Locale.getLocale(lang, "eventAdded"));
    
                                            var time = collected2.first().content;
                                            message.channel.send(Locale.getLocale(lang, "newEventInfo", `${name}`, `${desc}`, `${time}`));
                                        // Update command
                                        } else {
                                            //let sql = `INSERT INTO events (name, description, eventDate, user, server_id, channel_id, type, created_at, updated_at) VALUES (?, ?, ?, ${user}, ${server}, ${channel}, '${type}', sysdate(), sysdate())`;
                                            let sql = `UPDATE events set name = ?, description = ?, eventDate = ?, updated_at = sysdate() where id = ?`;
                                            pool.query(sql, [name, desc, day, id], function (err, result, fields) {
                                                if (err) {
                                                    message.channel.send(Locale.getLocale(lang, "internalError"));
                                                    return;
                                                }
                                                pool.query(`SELECT events.id, name, description, eventDate, user, server_id, channel_id, type, time_difference, users.language FROM events join users on users.id = events.user WHERE events.id = ${id}`, function (err, result2, fields) {
                                                    if (err) {
                                                        message.channel.send(Locale.getLocale(lang, "internalError"));
                                                        return;
                                                    }
                                                    result2.forEach(row => {
                                                        schedule.scheduler(row, client); // Update event with new data
                                                    })
                                                })
                                            });
                                            message.channel.send(Locale.getLocale(lang, "eventUpdated"));
    
                                            var time = collected2.first().content;
                                            message.channel.send(Locale.getLocale(lang, "newEventInfo", `${name}`, `${desc}`, `${time}`));
                                        }
                                        

                                    } else {
                                        throw ("formato incorrecto");
                                    }
                                }
                                catch {
                                    message.channel.send(Locale.getLocale(lang, "DateFormat"));
                                }
                            })
                            .catch(collected => { message.channel.send(Locale.getLocale(lang, "TimeExpired")) })
                    })
                    .catch(collected => { message.channel.send(Locale.getLocale(lang, "TimeExpired")) });
            }
            catch {
                message.channel.send(Locale.getLocale(lang, "Unexpected"));
            }

        }
    },

    /*##### EVENTS #####*/
    events: async function (message, promisePool, lang) {
        let page = 1;
        if (message.channel.type != "dm") {
            var eventsEmbed = new Discord.MessageEmbed()
                .setColor('#0099ff')
                .setTitle(Locale.getLocale(lang, "Events"))
                .setURL('https://telek.tk')
                .setDescription(Locale.getLocale(lang, "ServerTitle"))
                .setFooter(Locale.getLocale(lang, "EventsFooter"));
            try {
                var [results, fields] = await promisePool.query(`SELECT * FROM events WHERE server_id = ? order by eventDate`, [message.guild.id]);
            } catch (err) {
                console.log(err);
            }
            results.forEach(row => {
                eventsEmbed.addField(`id: ${row.id} ${dateFormat(row.eventDate, 'paddedShortDate')}: ${row.name}`, `${row.description}`);
            });
            if (results.length == 0) {
                message.channel.send(Locale.getLocale(lang, "NoEvents"))
            } else {
                message.channel.send(eventsEmbed);
            }
        }
        else {
            var eventsEmbed = new Discord.MessageEmbed()
                .setColor('#0099ff')
                .setTitle(Locale.getLocale(lang, "Events"))
                .setURL('https://telek.tk')
                .setDescription(Locale.getLocale(lang, "PersonalEvents"))
                .setFooter(Locale.getLocale(lang, "EventsFooter"));
            try {
                var [results, fields] = await promisePool.query(`SELECT * FROM events WHERE user = ? AND server_id is null order by eventDate`, [message.author.id]);
            } catch (err) {
                console.log(err);
            }
            results.forEach(row => {
                eventsEmbed.addField(`${dateFormat(row.eventDate, 'paddedShortDate')}: ${row.name}`, `${row.description}`);
            });
            if (results.length == 0) {
                message.channel.send(Locale.getLocale(lang, "NoEvents"))
            } else {
                message.channel.send(eventsEmbed);
            }
        }
    },

    /*##### REMOVE EVENT #####*/
    remove: async function (message, args, prefix, promisePool, lang) {
        if (args[0] == null) {
            console.log("Args[0] is null");
            message.channel.send(Locale.getLocale(lang, "rmEventNoArgs", `${prefix}`));
        } else {
            args.forEach(function(arg){
                if (isNaN(arg)) {
                    message.channel.send(Locale.getLocale(lang, "rmEventInvalidArgs", `${arg}`, `${prefix}`));
                } else {
                    try {
                        let sql = `DELETE FROM events WHERE id = ?`;
                        promisePool.query(sql, Number(arg), function (error, results, fields) { });
                        schedule.cancelJob(arg);
                        message.channel.send(Locale.getLocale(lang, "rmEventSuccess", `${arg}`));
                    } catch {
                        message.channel.send(Locale.getLocale(lang, "rmEventNoEvent",`${arg}`));
                    }
                }
            });
        }
    },

    /*##### UPDATE EVENT #####*/
    update: async function (message, args, prefix, promisePool, lang, pool, user, client) {
        if (args[0] == null) {
            console.log("Args[0] is null");
            message.channel.send(Locale.getLocale(lang, "upEventNoArgs", `${prefix}`));
        } else {
            if (isNaN(args[0])) {
                message.channel.send(Locale.getLocale(lang, "rmEventInvalidArgs", `${args[0]}`, `${prefix}`));
            } else {
                try {
                    schedule.cancelJob(args[0]);
                    module.exports.add(message, args, pool, prefix, user, client, lang, "update", args[0]);
                } catch {
                    message.channel.send(Locale.getLocale(lang, "rmEventNoEvent",`${args[0]}`));
                }
            }
        }
    },


    /*##### TEST #####*/
    test: async function (message, client, timezones, lang) {
        let db = ['Hello', 'World', 'uwu'];

        let button0 = new MessageButton()
            .setLabel("opt1")
            .setStyle("blurple")
            .setID("00");

        let button1 = new MessageButton()
            .setLabel("opt2")
            .setStyle("blurple")
            .setID("01");

        let buttonRow = new MessageActionRow()
            .addComponent(button0)
            .addComponent(button1)



        let m = await message.channel.send("Choose an hour", { components: buttonRow });

        client.on('clickButton', async (button) => {

            console.log(button);

            m.edit(`${button.id}`);
            button.defer();
        });
    },


    /*##### HELP #####*/
    help: function (message, args, prefix, lang) {
        try {
            if (args[0] === "utilities") {
                var helpEmbed = new Discord.MessageEmbed()
                    .setColor('#0099ff')
                    .setTitle('easyCal')
                    .setURL('https://telek.tk')
                    .setDescription(Locale.getLocale(lang, "Utilities"))
                    .addFields(
                        { name: `${prefix} ping`, value: Locale.getLocale(lang, "HelpPing") },
                        { name: `${prefix} help`, value: Locale.getLocale(lang, "HelpHelp") },
                        { name: `${prefix} invite`, value: Locale.getLocale(lang, "HelpInv") },
                        { name: `${prefix} version`, value: Locale.getLocale(lang, "HelpVer") }
                    )
                    .setTimestamp()
                    .setFooter('easyCal');
            }
            else if (args[0] === "events") {
                var helpEmbed = new Discord.MessageEmbed()
                    .setColor('#0099ff')
                    .setTitle('easyCal')
                    .setURL('https://telek.tk')
                    .setDescription(Locale.getLocale(lang, "Events"))
                    .addFields(
                        { name: `${prefix} add`, value: Locale.getLocale(lang, "HelpAdd") },
                        { name: `${prefix} events`, value: Locale.getLocale(lang, "HelpEvents") }
                    )
                    .setTimestamp()
                    .setFooter('easyCal');
            }
            else if (args[0] === "all") {
                var helpEmbed = new Discord.MessageEmbed()
                    .setColor('#0099ff')
                    .setTitle('easyCal')
                    .setURL('https://telek.tk')
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
                    .setFooter('easyCal');
            }
            else {
                throw ("Argumento no valido");
            }

        }
        catch {
            var helpEmbed = new Discord.MessageEmbed()
                .setColor('#0099ff')
                .setTitle('easyCal')
                .setURL('https://telek.tk')
                .setDescription(Locale.getLocale(lang, "HelpWelcome"))
                .addFields(
                    { name: Locale.getLocale(lang, "Utilities"), value: `${prefix} help utilities` },
                    { name: Locale.getLocale(lang, "Events"), value: `${prefix} help events` },
                    { name: Locale.getLocale(lang, "All"), value: `${prefix} help all` }
                )
                .setTimestamp()
                .setFooter('easyCal');
        }
        message.channel.send(helpEmbed);
    }
}
