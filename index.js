require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  REST,
  Routes,
  Events,
  EmbedBuilder
} = require('discord.js');

const TOKEN     = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('panel')
      .setDescription('Post the ticket panel with a button')
      .toJSON()
  ];
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  try {
    console.log('Registering commands...');
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log('✅ Commands registered.');
  } catch (err) {
    console.error('Failed to register commands:', err);
  }
}

client.once('ready', () => {
  console.log(`✅ Ticket Bot logged in as ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand() && interaction.commandName === 'panel') {
    const button = new ButtonBuilder()
      .setCustomId('create_ticket')
      .setLabel('🎫 Create Ticket')
      .setStyle(ButtonStyle.Primary);
    const row = new ActionRowBuilder().addComponents(button);
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🎫 Support Tickets')
      .setDescription('Click the button below to open a private support ticket.\nOur team will be with you shortly!')
      .setFooter({ text: 'One ticket per user at a time.' });
    await interaction.reply({ embeds: [embed], components: [row] });
    return;
  }

  if (interaction.isButton() && interaction.customId === 'create_ticket') {
    const existing = interaction.guild.channels.cache.find(
      c => c.name === `ticket-${interaction.user.username.toLowerCase()}`
    );
    if (existing) {
      await interaction.reply({ content: `You already have an open ticket: ${existing}`, ephemeral: true });
      return;
    }
    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username.toLowerCase()}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: interaction.guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      ],
    });
    const closeBtn = new ButtonBuilder()
      .setCustomId('close_ticket')
      .setLabel('🔒 Close Ticket')
      .setStyle(ButtonStyle.Danger);
    const closeRow = new ActionRowBuilder().addComponents(closeBtn);
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('Ticket Opened')
      .setDescription(`Hey ${interaction.user}, welcome to your ticket!\nDescribe your issue and staff will be with you shortly.`)
      .setFooter({ text: 'Click Close Ticket when your issue is resolved.' });
    await channel.send({ embeds: [embed], components: [closeRow] });
    await interaction.reply({ content: `Your ticket was created: ${channel}`, ephemeral: true });
    return;
  }

  if (interaction.isButton() && interaction.customId === 'close_ticket') {
    await interaction.reply({ content: '🔒 Closing ticket in 5 seconds...' });
    setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
  }
});

(async () => {
  await registerCommands();
  await client.login(TOKEN);
})();
