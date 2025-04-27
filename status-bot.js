import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import axios from 'axios';
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const SERVICES = [
    {
        name: 'MudVault Website',
        url: 'https://mudvault.org',
        channelId: '1366029203941888030',
        messageId: '1366038668602511400',
        upChannelName: '🟢 mudvault-up',
        downChannelName: '🔴 mudvault-down',
        wasUp: true, // Add tracking flag
    },
    {
        name: 'Dark Wizardry Web Client',
        url: 'https://www.darkwiz.org/play',
        channelId: '1366030516482080780',
        messageId: '1366038675699400835',
        upChannelName: '🟢 webclient-up',
        downChannelName: '🔴 webclient-down',
        wasUp: true, // Add tracking flag
    },
];

const NOTIFY_USER_ID = '609275797475164161';

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

        await message.edit({ embeds: [embed] });

        const desiredName = isUp ? service.upChannelName : service.downChannelName;
        if (channel.name !== desiredName) {
            await channel.setName(desiredName);
            console.log(`✅ Updated channel name for ${service.name} to "${desiredName}"`);
        } else {
            console.log(`🔄 No channel name change needed for ${service.name}`);
        }

        // Ping you if it goes from up to down
        if (!isUp && service.wasUp) {
            await channel.send(`<@${NOTIFY_USER_ID}> ⚠️ **${service.name} is DOWN!**`);
            console.log(`⚠️ Alert sent for ${service.name} going down.`);
        }
        service.wasUp = isUp; // Update the tracking flag
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
