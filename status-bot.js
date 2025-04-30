import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import axios from 'axios';
import net from 'net';

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const NOTIFY_USER_ID = '609275797475164161';

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

const SERVICES = [
    {
        name: 'MudVault Website',
        url: 'https://mudvault.org',
        channelId: '1366029203941888030',
        messageId: '1366038668602511400',
        upChannelName: '🟢 mudvault-up',
        downChannelName: '🔴 mudvault-down',
        wasUp: true,
    },
    {
        name: 'Dark Wizardry Web Client',
        url: 'https://www.darkwiz.org/play',
        channelId: '1366030516482080780',
        messageId: '1366038675699400835',
        upChannelName: '🟢 webclient-up',
        downChannelName: '🔴 webclient-down',
        wasUp: true,
    },
    {
        name: 'Dark Wizardry MUD',
        host: 'darkwiz.org',
        port: 6969,
        channelId: '1367121064030638160',
        messageId: '1367132886897266719', // <— hardcoded ID
        upChannelName: '🟢 dark-wizardry-up',
        downChannelName: '🔴 dark-wizardry-down',
        wasUp: true,
    },
];

async function checkWebsite(url) {
    try {
        const res = await axios.get(url, { timeout: 5000 });
        return res.status >= 200 && res.status < 300;
    } catch {
        return false;
    }
}

async function checkTcp(host, port, timeout = 5000) {
    return new Promise(resolve => {
        const socket = new net.Socket();
        let done = false;

        socket.setTimeout(timeout);

        socket.once('connect', () => {
            done = true;
            socket.destroy();
            resolve(true);
        });

        socket.once('timeout', () => {
            if (!done) {
                done = true;
                socket.destroy();
                resolve(false);
            }
        });

        socket.once('error', () => {
            if (!done) {
                done = true;
                resolve(false);
            }
        });

        socket.connect(port, host);
    });
}

async function updateStatus(service) {
    let isUp;
    if (service.url) {
        isUp = await checkWebsite(service.url);
    } else {
        isUp = await checkTcp(service.host, service.port);
    }

    const emoji = isUp ? '🟢' : '🔴';
    const statusText = isUp ? '**ACTIVE**' : '**DOWN**';
    const color = isUp ? 0x00ff00 : 0xff0000;

    const embed = new EmbedBuilder()
        .setTitle(`🌐 ${service.name} Status`)
        .setDescription(`${emoji} ${statusText}`)
        .setColor(color)
        .setFooter({ text: `Monitoring ${service.name}` })
        .setTimestamp();

    try {
        const channel = await client.channels.fetch(service.channelId);
        const message = await channel.messages.fetch(service.messageId);

        await message.edit({ embeds: [embed] });

        const desiredName = isUp ? service.upChannelName : service.downChannelName;
        if (channel.name !== desiredName) {
            await channel.setName(desiredName);
            console.log(`✅ Renamed channel for ${service.name} to "${desiredName}"`);
        }

        if (!isUp && service.wasUp) {
            await channel.send(`<@${NOTIFY_USER_ID}> ⚠️ **${service.name} is DOWN!**`);
            console.log(`⚠️ Alert sent for ${service.name} down.`);
        }

        service.wasUp = isUp;
    } catch (err) {
        console.error(`❌ Failed updating ${service.name}:`, err);
    }
}

client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    for (const svc of SERVICES) {
        await updateStatus(svc);
    }
    console.log('✅ All checks complete, shutting down.');
    client.destroy();
});

client.login(BOT_TOKEN);
