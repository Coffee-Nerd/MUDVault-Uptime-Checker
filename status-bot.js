const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const SERVICES = [
    {
        name: 'MudVault Website',
        url: 'https://mudvault.org',
        channelId: '1366029203941888030',
        messageId: '1366029878561865759',
        upChannelName: '🟢 mudvault-up',
        downChannelName: '🔴 mudvault-down',
    },
    {
        name: 'Dark Wizardry Web Client',
        url: 'https://www.darkwiz.org/play',
        channelId: '1366030516482080780',
        messageId: '1366030540209262613',
        upChannelName: '🟢 webclient-up',
        downChannelName: '🔴 webclient-down',
    },
];

async function checkWebsite(url) {
    try {
        const response = await axios.get(url, { timeout: 5000 });
        return response.status >= 200 && response.status < 300;
    } catch {
        return false;
    }
}

async function updateStatus(service) {
    const isUp = await checkWebsite(service.url);
    const emoji = isUp ? '🟢' : '🔴';
    const statusText = isUp ? '**ACTIVE**' : '**DOWN**';
    const color = isUp ? 0x00ff00 : 0xff0000;

    const embed = new EmbedBuilder()
        .setTitle(`🌐 ${service.name} Status`)
        .setDescription(`${emoji} ${statusText}`)
        .setColor(color)
        .setFooter({ text: `Monitoring ${service.name}` })
        .setTimestamp(new Date());

    try {
        const channel = await client.channels.fetch(service.channelId);
        const message = await channel.messages.fetch(service.messageId);

        // Update the message
        await message.edit({ embeds: [embed] });

        // Update the channel name
        const desiredName = isUp ? service.upChannelName : service.downChannelName;
        if (channel.name !== desiredName) {
            await channel.setName(desiredName);
            console.log(`✅ Updated channel name for ${service.name} to "${desiredName}"`);
        } else {
            console.log(`🔄 No channel name change needed for ${service.name}`);
        }
    } catch (error) {
        console.error(`❌ Failed to update ${service.name}:`, error);
    }
}

client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    for (const service of SERVICES) {
        await updateStatus(service);
    }
    console.log('✅ Status check complete, exiting.');
    client.destroy();
});

client.login(BOT_TOKEN);
