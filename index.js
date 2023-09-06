const { Client, GatewayIntentBits } = require('discord.js');
const ytdl = require('ytdl-core');
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const fs = require('fs');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    // Add other necessary intents here if needed
  ],
});

// Store user's YouTube URLs in a JSON file
const userDataFile = 'userData.json';
let userData = {};

if (fs.existsSync(userDataFile)) {
  userData = JSON.parse(fs.readFileSync(userDataFile));
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  
  // Register the 'set-song' and 'remove-song' slash commands globally
  const commands = [
    {
      name: 'set-song',
      description: 'Set a YouTube URL for a short song.',
      options: [
        {
          name: 'url',
          type: 3, // Type 3 represents STRING
          description: 'The YouTube URL of the short song (up to 15 seconds).',
          required: true,
        },
      ],
    },
    {
      name: 'remove-song',
      description: 'Remove your stored YouTube URL.',
    },
  ];

  const commandsGlobal = await client.application?.commands.set(commands);

  if (commandsGlobal) {
    console.log('Registered global commands');
  }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;
  
    const { commandName, user } = interaction;
  
    if (commandName === 'set-song') {
      const url = interaction.options.get('url').value;
  
      try {
        const videoInfo = await ytdl.getBasicInfo(url);
  
        if (videoInfo.length_seconds > 15) {
          interaction.reply('Sorry, the video is longer than 15 seconds.');
          return;
        }
  
        userData[user.id] = url;
        fs.writeFileSync(userDataFile, JSON.stringify(userData));
        interaction.reply('YouTube URL set successfully.');
      } catch (error) {
        console.error('Error fetching video information:', error);
        interaction.reply('Sorry, there was an error fetching video information. Make sure you provide a valid YouTube URL.');
      }
    } else if (commandName === 'remove-song') {
      // Remove the user's stored URL
      if (userData[user.id]) {
        delete userData[user.id];
        fs.writeFileSync(userDataFile, JSON.stringify(userData));
        interaction.reply('Your stored YouTube URL has been removed.');
      } else {
        interaction.reply('You don\'t have a stored YouTube URL.');
      }
    }
  });
  

client.on('voiceStateUpdate', async (oldState, newState) => {
  if (!oldState.channel && newState.channel && !newState.member.user.bot) {
    // User has joined a voice channel
    const url = userData[newState.member.user.id];
    if (url) {
      if (newState.channel.type === 2) {
        // Check for both GUILD_VOICE and GUILD_STAGE_VOICE types
        try {
          const voiceChannel = newState.channel;
          const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
          });

          const stream = ytdl(url, { filter: 'audioonly' });
          const resource = createAudioResource(stream);
          const player = createAudioPlayer();

          player.play(resource);
          connection.subscribe(player);

          player.on('stateChange', (oldState, newState) => {
            if (newState.status === 'idle') {
              console.log(`Finished playing song in ${voiceChannel.name}`);
              connection.destroy();
            }
          });

          connection.on('error', (error) => {
            console.error(`Error with voice connection: ${error}`);
          });
        } catch (error) {
          console.error(`Error joining voice channel: ${error}`);
        }
      }
    }
  }
});

  

const token = '';
client.login(token);