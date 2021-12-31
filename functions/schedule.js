const schedule = require('node-schedule'); // node-schedule package
const dateFormat = require("dateformat"); // Dateformat package
const Discord = require("discord.js"); // Load Discord JS modules
const Locale = require("./getLocale.js"); // GetLocale function

module.exports = {
    scheduler: function (row, client) {
        if (Number(dateFormat(row.eventDate, 'H')) + Number(row.time_difference) > 23) {
            console.log("[OK1]", row.id, dateFormat(row.eventDate, 'yyyy'), (dateFormat(row.eventDate, 'm') - 1), (Number(dateFormat(row.eventDate, 'd')) + Number(1)), (Number(dateFormat(row.eventDate, 'H')) + Number(row.time_difference) - Number(24)), dateFormat(row.eventDate, 'M'), dateFormat(row.eventDate, 's'));
            var date = new Date(dateFormat(row.eventDate, 'yyyy'), (dateFormat(row.eventDate, 'm') - 1), (Number(dateFormat(row.eventDate, 'd')) + Number(1)), (Number(dateFormat(row.eventDate, 'H')) + Number(row.time_difference) - Number(24)), dateFormat(row.eventDate, 'M'), dateFormat(row.eventDate, 's'));
        } else if (Number(dateFormat(row.eventDate, 'H')) + Number(row.time_difference) < 0) {
            console.log("[OK2]", row.id, dateFormat(row.eventDate, 'yyyy'), (dateFormat(row.eventDate, 'm') - 1), (Number(dateFormat(row.eventDate, 'd')) - Number(1)), (Number(dateFormat(row.eventDate, 'H')) + Number(row.time_difference) + Number(24)), dateFormat(row.eventDate, 'M'), dateFormat(row.eventDate, 's'));
            var date = new Date(dateFormat(row.eventDate, 'yyyy'), (dateFormat(row.eventDate, 'm') - 1), Number((Number(dateFormat(row.eventDate, 'd')) - Number(1))), Number((Number(dateFormat(row.eventDate, 'H')) + Number(row.time_difference) + Number(24))), dateFormat(row.eventDate, 'M'), dateFormat(row.eventDate, 's'));
        } else {
            console.log("[OK3]", row.id, dateFormat(row.eventDate, 'yyyy'), (dateFormat(row.eventDate, 'm') - 1), dateFormat(row.eventDate, 'd'), (Number(dateFormat(row.eventDate, 'H')) + Number(row.time_difference)), dateFormat(row.eventDate, 'M'), dateFormat(row.eventDate, 's'));
            var date = new Date(dateFormat(row.eventDate, 'yyyy'), (dateFormat(row.eventDate, 'm') - 1), dateFormat(row.eventDate, 'd'), (Number(dateFormat(row.eventDate, 'H')) + Number(row.time_difference)), dateFormat(row.eventDate, 'M'), dateFormat(row.eventDate, 's'));
        }
        
        schedule.scheduleJob(row.id, date, function () {
            let name = row.name;
            let description = row.description;
            let user = row.user;
            let language = row.language;
            let channel_id = row.channel_id;
            if (row.type == "server") {
                var EventEmbed = new Discord.MessageEmbed()
                    .setColor('#0099ff')
                    .setTitle(Locale.getLocale(language, "NotiTitle", name))
                    .setDescription(Locale.getLocale(language, "NotiDesc", description))
                    .setFooter(Locale.getLocale(language, "NotiFooter"));
                client.channels.fetch(`${channel_id}`)
                    .catch() //In case Discord's API fails
                    .then(channel => channel.send({embeds: [EventEmbed]}).catch()); //Catch error in case bot can't send message
            }
            else {
                var EventEmbed = new Discord.MessageEmbed()
                    .setColor('#0099ff')
                    .setTitle(Locale.getLocale(language, "NotiTitle", name))
                    .setDescription(Locale.getLocale(language, "NotiDesc", description))
                    .setFooter(Locale.getLocale(language, "NotiFooter"));
                console.log(`${user}`);
                client.users.fetch(`${user}`)
                    .then((user) => {user.send({ embeds: [EventEmbed] }).catch()}) //Catch error in case bot can't send message on DMs
                    .catch(); //In case Discord's API fails
            }
        });
    },

    /*##### CANCEL SCHEDULE JOB #####*/
    cancelJob: function (id) {
        var my_job = schedule.scheduledJobs[id];
        my_job.cancel();
    }

}
