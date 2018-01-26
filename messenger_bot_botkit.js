require('dotenv').config();


if (!process.env.MESSENGER_PAGE_ACCESS_TOKEN) {
    console.log('Error: Specify page_token in environment');
    process.exit(1);
}

if (!process.env.MESSENGER_VALIDATION_TOKEN) {
    console.log('Error: Specify verify_token in environment');
    process.exit(1);
}

var Botkit = require('botkit');
var commandLineArgs = require('command-line-args');
var localtunnel = require('localtunnel');

const ops = commandLineArgs([
      {name: 'lt', alias: 'l', args: 1, description: 'Use localtunnel.me to make your bot available on the web.',
      type: Boolean, defaultValue: false},
      {name: 'ltsubdomain', alias: 's', args: 1,
      description: 'Custom subdomain for the localtunnel.me URL. This option can only be used together with --lt.',
      type: String, defaultValue: null},
   ]);

if(ops.lt === false && ops.ltsubdomain !== null) {
    console.log("error: --ltsubdomain can only be used together with --lt.");
    process.exit();
}

var controller = Botkit.facebookbot({
    debug: true,
    access_token: process.env.MESSENGER_PAGE_ACCESS_TOKEN,
    verify_token: process.env.MESSENGER_VALIDATION_TOKEN,
});

var bot = controller.spawn({
});

controller.setupWebserver(process.env.PORT || 5000, function(err, webserver) {
    controller.createWebhookEndpoints(webserver, bot, function() {
        console.log('ONLINE!');
        if(ops.lt) {
            var tunnel = localtunnel(process.env.port || 5000, {subdomain: ops.ltsubdomain}, function(err, tunnel) {
                if (err) {
                    console.log(err);
                    process.exit();
                }
                console.log("Your bot is available on the web at the following URL: " + tunnel.url + '/facebook/receive');
            });

            tunnel.on('close', function() {
                console.log("Your bot is no longer available on the web at the localtunnnel.me URL.");
                process.exit();
            });
        }
    });
});


// janis related code
var janis = require('janis')(process.env.JANIS_API_KEY, process.env.JANIS_CLIENT_KEY, {
    platform: 'messenger',
    useWebhook: true,
    token: process.env.MESSENGER_PAGE_ACCESS_TOKEN
});

// Listens for an intent whereby a user wants to talk to a human
controller.hears(['help', 'operator', 'human', 'start chat'], 'message_received', function(bot, message) {
    // Forwards request to talk to a human to janis
    janis.assistanceRequested(message);
    bot.reply(message,'Hang tight. Let me see what I can do.');
});

// give the bot something to listen for.
controller.hears(['hi', 'hello', 'hai', 'hallo', 'good morning'], 'message_received', function(bot, message) {
    bot.reply(message,'Hello there.');
});

// listen to 'koop huis'
controller.hears(['ik zou graag en huis willen kopen', 'koop huis', 'zoek huis'], 'message_received', function(bot, message) {
    bot.reply(message,'Ik zal kijken welke huizen te koop staan.');
});

// Handle receiving a message.
// NOTE: This handler only gets called if there are no matched intents handled by 'controller.hears'
controller.on('message_received',function(bot,message) { 
    //ignore pass_thread_control messages here
    if (message.pass_thread_control) {
        return;
    }
    // log an unknown intent with janis
    janis.logUnkownIntent(message); 
    bot.reply(message, 'Huh?');
}); 

// Handle receiving an echo and handing over thread control to Janis if the source app_id matches Janis'
controller.on('message_echo',function(bot,message) { 
    janis.passThreadControl(message)
}); 
