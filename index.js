import TelegramBotPkg from 'node-telegram-bot-api';
const TelegramBot = TelegramBotPkg.default || TelegramBotPkg;
import http from 'http';
import fs from 'fs';
import path from 'path';
import cron from 'node-cron';

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY;

const TARGET_CHANNEL = '@VipYonoFreeCode';
const POSTS_FILE = 'posts.json';
const USERS_FILE = 'users.json';
const UPCOMING_FILE = 'upcoming.json';
const GAMES_FILE = 'games.json';

const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID ? Number(process.env.ADMIN_CHAT_ID) : null;

const OFFICIAL_COMPANY_GAMES = [
    { name: "Win Rummy", aliases: ["win rummy", "উইন রামি", "विन रम्मी"] },
    { name: "Dhan Game", aliases: ["dhan game", "ধান গেম", "dhan", "धन गेम"] },
    { name: "Max Rummy", aliases: ["max rummy", "ম্যাক্স রামি", "मैक्स रम्मी"] },
    { name: "Jaiho777Vip", aliases: ["jaiho777vip", "jaiho 777", "जयहो 777 वीआईपी", "जयहो ७७७"] },
    { name: "Jaiho91", aliases: ["jaiho91", "jaiho 91", "जयहो ९१"] },
    { name: "Joy Rummy", aliases: ["joy rummy", "জয় রামি", "जॉय रम्मी"] },
    { name: "INR Rummy", aliases: ["inr rummy", "আইএনআর রামি", "आईएनआर रम्मी"] },
    { name: "BOSS Rummy", aliases: ["boss rummy", "বস রামি", "बॉस रम्मी"] },
    { name: "Ever777", aliases: ["ever777", "এবার ৭৭৭", "एवर 777"] },
    { name: "Rummy888", aliases: ["rummy888", "রামি ৮৮৮", "रम्मी 888"] },
    { name: "Rummy 77", aliases: ["rummy 77", "রামি ৭৭", "रम्मी 77"] },
    { name: "RummyLudo", aliases: ["rummyludo", "rummy ludo", "রামি লুডো", "रम्मी लूडो"] },
    { name: "777.Game", aliases: ["777.game", "777 game", "777 गेम"] },
    { name: "OKRummy", aliases: ["okrummy", "ওকে রামি", "ओके रम्मी"] },
    { name: "Hindi777", aliases: ["hindi777", "হিন্দি ৭৭৭", "हिंदी 777"] },
    { name: "ClubINR", aliases: ["clubinr", "ক্লাব আইএনআর", "क्लब आईएनआर"] },
    { name: "GameRummy", aliases: ["gamerummy", "গেম রামি", "गेम रम्मी"] },
    { name: "YesSpin", aliases: ["yesspin", "ইয়েস স্পিন", "येस स्पिन"] },
    { name: "RumbleRummy", aliases: ["rumblerummy", "रंबल रम्मी"] },
    { name: "LoveRummy", aliases: ["loverummy", "লাভ রামি", "लव रम्मी"] },
    { name: "ShareSlots", aliases: ["shareslots", "शेयर स्लॉट्स"] },
    { name: "MahaGames", aliases: ["mahagames", "মহা গেমস্", "महा गेम्स"] },
    { name: "HiRummy", aliases: ["hirummy", "হাই রামি", "हाई रम्मी"] },
    { name: "JaihoWin", aliases: ["jaihowin", "जयहो विन"] },
    { name: "INDCLUB", aliases: ["indclub", "ইন্ড ক্লাব", "इंड क्लब"] },
    { name: "TOPRummy", aliases: ["toprummy", "টপ রামি", "टॉप रम्मी"] },
    { name: "IndRummy", aliases: ["indrummy", "ইন্ড রামি", "इंड रम्मी"] },
    { name: "JaihoSlots", aliases: ["jaihoslots", "जयहो स्लॉट्स"] },
    { name: "SagaSlots", aliases: ["sagaslots", "सागा स्लॉट्स"] },
    { name: "GogoRummy", aliases: ["gogorummy", "গোগো রামি", "गो गो रम्मी"] },
    { name: "Rummy91", aliases: ["rummy91", "রামি ৯১", "रम्मी 91"] },
    { name: "ABCRummy", aliases: ["abcrummy", "एबीसी रम्मी"] },
    { name: "JaihoRummy", aliases: ["jaihorummy", "जयहो रम्मी"] },
    { name: "INDSlots", aliases: ["indslots", "इंड स्लॉट्स"] },
    { name: "Spin101", aliases: ["spin101", "স্পিন ১০১", "स्पिन 101"] },
    { name: "YonoVip", aliases: ["yonovip", "যোনো ভিআইপি", "योनो वीआईपी"] },
    { name: "Spin777", aliases: ["spin777", "স্পিন ৭৭৭", "स्पिन 777"] },
    { name: "Bet213", aliases: ["bet213", "বেট ২১৩", "बेट 213"] },
    { name: "YonoRummy", aliases: ["yonorummy", "যোনো রামি", "योनो रम्मी"] },
    { name: "Bingo101", aliases: ["bingo101", "বিঙ্গো ১০১", "बिंगो 101"] },
    { name: "789JackPots", aliases: ["789jackpots", "৭৮৯ জ্যাকপট", "789 जैकपॉट"] },
    { name: "YonoArcade", aliases: ["yonoarcade", "যোনো আর্কেड", "योनो आर्केड"] },
    { name: "YonoGames", aliases: ["yonogames", "যোনো গেমস্", "योनो गेम्स"] },
    { name: "JaiHoSpin", aliases: ["jaihospin", "जयहो स्पिन"] },
    { name: "YonoSlots", aliases: ["yonoslots", "যোনো স্লটস", "योनो स्लॉट्स"] },
    { name: "567Slots", aliases: ["567slots", "৫৬৭ স্লটস", "567 स्लॉट्स"] },
    { name: "Yono777", aliases: ["yono777", "যোনো ৭৭৭", "योनो 777"] },
    { name: "YN777", aliases: ["yn777", "वाईएन 777"] },
    { name: "SlotsSpin", aliases: ["slotsspin", "स्लॉट्स स्पिन"] },
    { name: "NetaVIP", aliases: ["netavip", "neta vip", "নেতা ভিআইপি", "নেতাভিআইপি", "नेता वीआईपी"] },
    { name: "JaiHoArcade", aliases: ["jaihoarcade", "जयहो आर्केड"] },
    { name: "JaiHo777", aliases: ["jaiho777", "जयहो 777"] },
    { name: "SlotsWinner", aliases: ["slotswinner", "স্লটস উইনার", "स्लॉट्स विनर"] },
    { name: "101Z", aliases: ["101z", "101जेड"] },
    { name: "SpinGold", aliases: ["spingold", "স্পিন গোল্ড", "स्पिन गोल्ड"] },
    { name: "SpinCrush", aliases: ["spincrush", "স্পিন ক্রাশ", "स्पिन क्रश"] },
    { name: "MBM", aliases: ["mbm", "এমবিএম", "एमबीएम"] },
    { name: "SpinWinner", aliases: ["spinwinner", "স্পিন উইনার", "स्लॉट्स विनर"] }
];

if (!fs.existsSync(GAMES_FILE)) {
    fs.writeFileSync(GAMES_FILE, JSON.stringify([], null, 2));
}

function getDynamicGames() {
    try {
        let data = JSON.parse(fs.readFileSync(GAMES_FILE, 'utf8'));
        if (!Array.isArray(data)) data = [data];
        return data;
    } catch (e) {
        return [];
    }
}

function addDynamicGame(name) {
    let list = getDynamicGames();
    let trimmed = name.trim();
    if (!list.some(g => g.name.toLowerCase() === trimmed.toLowerCase())) {
        list.push({ name: trimmed, aliases: [trimmed.toLowerCase()] });
        fs.writeFileSync(GAMES_FILE, JSON.stringify(list, null, 2));
    }
}

function getAllOfficialGames() {
    let dynamic = getDynamicGames();
    let formattedDynamic = dynamic.map(g => ({ name: g.name, aliases: g.aliases || [g.name.toLowerCase()] }));
    return [...OFFICIAL_COMPANY_GAMES, ...formattedDynamic];
}

if (!fs.existsSync(UPCOMING_FILE)) {
    fs.writeFileSync(UPCOMING_FILE, JSON.stringify([], null, 2));
}

function parseUpcomingExpiry(dateStr) {
    try {
        let parts = dateStr.trim().split('/');
        if (parts.length === 3) {
            let day = parseInt(parts[0], 10);
            let month = parseInt(parts[1], 10) - 1;
            let year = parseInt(parts[2], 10);
            let expiryDate = new Date(year, month, day, 8, 0, 0);
            return expiryDate.getTime();
        }
    } catch (e) {}
    return Date.now() + (24 * 60 * 60 * 1000);
}

function getUpcomingGames() {
    try {
        let data = JSON.parse(fs.readFileSync(UPCOMING_FILE, 'utf8'));
        if (!Array.isArray(data)) data = [data];
        let now = Date.now();
        let activeGames = data.filter(g => g.expiry && now < g.expiry);
        if (activeGames.length !== data.length) {
            fs.writeFileSync(UPCOMING_FILE, JSON.stringify(activeGames, null, 2));
        }
        return activeGames;
    } catch (e) {
        return [];
    }
}

function addUpcomingGame(name, date) {
    let list = getUpcomingGames();
    let expiry = parseUpcomingExpiry(date);
    list.push({ name: name.trim(), date: date.trim(), expiry: expiry });
    fs.writeFileSync(UPCOMING_FILE, JSON.stringify(list, null, 2));
}

function getSystemPrompt(userQuery) {
    let upcomingList = getUpcomingGames();
    let upcomingSection = upcomingList.length > 0 
        ? "CURRENT UPCOMING GAMES LAUNCH SCHEDULE:\n" + upcomingList.map((g, idx) => `${idx + 1}. Game Name: ${g.name} | Launch Date: ${g.date}`).join('\n')
        : "CURRENT UPCOMING GAMES SCHEDULE: None currently scheduled.";

    let allOfficialGames = getAllOfficialGames();
    let officialGamesListStr = allOfficialGames.map(g => g.name).join(', ');

    return `You are "Yono Gaming Head AI", the official and professional AI assistant for Yono Gaming company.

OFFICIAL COMPANY GAMES DIRECTORY (CRITICAL KNOWLEDGE):
The following games are strictly the official games belonging to our company Yono Gaming:
[ ${officialGamesListStr} ]
Whenever a user mentions any of these games (or similar names/aliases in any language like Bengali, Hindi, Urdu, or English), you MUST recognize that they are referring to our official company game, NOT a human person. Never greet a game name as if it were a person's name.

CRITICAL RULES YOU MUST FOLLOW STRICTLY:
1. **STRICT LANGUAGE & SCRIPT MATCHING**: The user wrote or spoke: "${userQuery}". Detect the exact language and script of this message and reply **100% in that exact same language and script**.
2. **STRICT REJECTION & INVITATION FOR UNRECOGNIZED/FAKE GAMES**: If the user mentions any game name, title, or text intended as a game that is **NOT** exactly present in the "OFFICIAL COMPANY GAMES DIRECTORY" above (for example, random names like "Gogo 77", "Mama Rummy", etc.), you MUST immediately and strictly inform the user in their exact language and script that this is **not an official Yono Gaming game or title**. 
   - **MANDATORY EXTRA MESSAGE**: Immediately after stating that it is not our official game, you must warmly and professionally encourage them by adding a message inviting them to play our real, official Yono Gaming platform games (e.g., asking them if they want to play our official games, offering them to try our verified Yono Gaming titles for great winnings and bonuses).
3. **HANDLING UPCOMING GAMES VS GAME LISTS**: 
   - If the user specifically asks about **upcoming games, new games coming soon, or launch dates**, you MUST look at the "CURRENT UPCOMING GAMES LAUNCH SCHEDULE" below and tell the user about those upcoming games clearly.
   - If the user asks for a general list of all available games/library, **DO NOT PROVIDE ANY LIST OF GAMES**. Instead, professionally tell them to type or speak the exact name of the specific game they want.
4. **NO COMEDY, NO JOKES, NO FLUFF**: Maintain a strict, professional, formal, and direct tone. Do not use any comedy, jokes, or casual fluff. 
5. **MANDATORY BOT ANNOUNCEMENT SIGNATURE**: At the very end of your response, you MUST always include the following official bot announcement translated 100% accurately into the user's language and script:
"🤖 Official Bot Announcement:

Remember, all our official new games and new promo codes are created directly by Yono Gaming Head AI! Once generated, these new promo codes are instantly activated across all games. 🚀"

${upcomingSection}`;
}

if (!fs.existsSync(POSTS_FILE)) {
    fs.writeFileSync(POSTS_FILE, JSON.stringify({ all_posts: [] }, null, 2));
}

let postDatabase = { all_posts: [] };
try {
    postDatabase = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8'));
    if (!postDatabase.all_posts) postDatabase.all_posts = [];
} catch (e) {
    postDatabase = { all_posts: [] };
}

function savePosts() {
    fs.writeFileSync(POSTS_FILE, JSON.stringify(postDatabase, null, 2));
}

if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
}

let botUsers = [];
try {
    botUsers = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
} catch (e) {
    botUsers = [];
}

function saveUsers() {
    fs.writeFileSync(USERS_FILE, JSON.stringify(botUsers, null, 2));
}

let userMessages = {};

async function trackAndManageMessages(chatId, newIds) {
    if (!userMessages[chatId]) {
        userMessages[chatId] = [];
    }
    if (Array.isArray(newIds)) {
        userMessages[chatId].push(...newIds);
    } else {
        userMessages[chatId].push(newIds);
    }

    // চ্যাটে সবসময় সর্বাধিক ৪টি মেসেজ (২টি ইউজারের, ২টি বটের) রাখার জন্য লজিক
    while (userMessages[chatId].length > 4) {
        let oldId = userMessages[chatId].shift();
        try {
            await bot.deleteMessage(chatId, oldId);
        } catch (e) {}
    }
}

async function sendSingleMessage(chatId, text, photo, replyMarkup) {
    const options = { 
        parse_mode: "HTML",
        disable_web_page_preview: true 
    };

    if (replyMarkup) {
        options.reply_markup = replyMarkup;
    }

    let sentMsg = null;
    try {
        if (photo) {
            if (text && text.length > 1024) {
                await bot.sendPhoto(chatId, photo, { reply_markup: options.reply_markup });
                sentMsg = await bot.sendMessage(chatId, text, options);
            } else {
                sentMsg = await bot.sendPhoto(chatId, photo, { caption: text, ...options });
            }
        } else if (text) {
            sentMsg = await bot.sendMessage(chatId, text, options);
        }

        if (sentMsg) {
            await trackAndManageMessages(chatId, sentMsg.message_id);
        }
    } catch (err) {
        console.error(`Error sending message to ${chatId}:`, err.message);
    }
}

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Yono Gaming Head AI is running successfully!\n');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});

function formatPostTimestamp(timestamp) {
    let date = new Date(timestamp || Date.now());
    return date.toLocaleString('en-GB', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

function smartFormatPost(text, entities, timestamp) {
    if (!text) return '';
    let downloadUrl = '';
    if (entities && entities.length > 0) {
        entities.forEach(entity => {
            if (entity.type === 'text_link' && entity.url) {
                if (!entity.url.includes('t.me') && !entity.url.includes('telegram')) {
                    downloadUrl = entity.url;
                }
            } else if (entity.type === 'url') {
                let extractedUrl = text.substring(entity.offset, entity.offset + entity.length);
                if (extractedUrl && !extractedUrl.includes('t.me') && !extractedUrl.includes('telegram')) {
                    downloadUrl = extractedUrl;
                }
            }
        });
    }

    if (!downloadUrl) {
        let urlMatch = text.match(/(https?:\/\/[^\s<]+)/g);
        if (urlMatch) {
            for (let u of urlMatch) {
                if (!u.includes('t.me') && !u.includes('telegram')) {
                    downloadUrl = u;
                    break;
                }
            }
        }
    }

    let lines = text.split('\n');
    let formattedLines = [];
    let hashtags = [];
    let nonEmtpyCount = 0;
    let timestampAdded = false;
    let timeStr = formatPostTimestamp(timestamp);

    lines.forEach(line => {
        let trimmed = line.trim();
        if (!trimmed) return;
        let lower = trimmed.toLowerCase();

        if (trimmed.startsWith('#')) {
            let tags = trimmed.match(/#\w+/g);
            if (tags) {
                tags.forEach(t => {
                    if (!hashtags.includes(t)) hashtags.push(t);
                });
            }
            return;
        }

        nonEmtpyCount++;

        if (nonEmtpyCount === 1) {
            let cleanLine = trimmed.replace(/<[^>]*>/g, '');
            formattedLines.push(`<b>${cleanLine}</b>`);
            return;
        }

        let isGameListItem = trimmed.startsWith('•') || trimmed.startsWith('▪️') || trimmed.startsWith('🔸');
        let isDownloadLine = (lower.includes('download now') || lower.includes('game link') || (lower.includes('link') && !lower.includes('promo')));
        
        let isQuoteLine = !isGameListItem && !isDownloadLine && (
            lower.includes('signup bonus') || 
            lower.includes('new users') || 
            lower.includes('join & pin') || 
            lower.includes('claim all extra special code') ||
            lower.includes('daily promo codes') ||
            trimmed.startsWith('🔥') ||
            trimmed.startsWith('🎁') ||
            trimmed.startsWith('📢')
        );

        if (isGameListItem) {
            let cleanItem = trimmed.replace(/<[^>]*>/g, '');
            formattedLines.push(cleanItem);
        }
        else if (isQuoteLine) {
            let cleanLine = trimmed.replace(/<[^>]*>/g, '');
            formattedLines.push(`<blockquote><b>${cleanLine}</b></blockquote>`);
            
            if (lower.includes('join & pin') && !timestampAdded) {
                formattedLines.push(`🕒 <b>Date & Time: ${timeStr}</b>`);
                timestampAdded = true;
            }
        } 
        else if (isDownloadLine) {
            if (downloadUrl) {
                let cleanLine = trimmed.replace(/<[^>]*>/g, '').replace(/Download Now/gi, '').replace(/📱/g, '').trim();
                let labelPart = cleanLine.replace(/➔|->|➜/g, '').trim();
                if (!labelPart || labelPart.toLowerCase().includes('game link') || labelPart.toLowerCase().includes('link')) {
                    formattedLines.push(`<b>🎰 YONO GAME LINK</b> ➜ <a href="${downloadUrl}"><b>Download Now</b></a>📱`);
                } else {
                    formattedLines.push(`<b>${labelPart}</b> ➜ <a href="${downloadUrl}"><b>Download Now</b></a>📱`);
                }
            } else {
                formattedLines.push(trimmed);
            }
        } 
        else {
            if (trimmed.includes('➔') || trimmed.includes('->') || trimmed.includes('➜')) {
                let parts = trimmed.split(/➔|->|➜/);
                if (parts.length === 2) {
                    let label = parts[0].replace(/<[^>]*>/g, '').trim();
                    let codeOrDomain = parts[1].replace(/<[^>]*>/g, '').trim();
                    let safeCode = codeOrDomain.replace(/\./g, '.\u200B');
                    formattedLines.push(`<b>${label}</b> ➜ <code>${safeCode}</code>`);
                    return;
                }
            }

            let formattedLine = trimmed.replace(/(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z0-9][-a-zA-Z0-9]*[^\s]*\.(com|win|net|top|app|vip|in|store|club|xyz|buzz|bet)[^\s]*)/gi, (match) => {
                return `<code>${match.replace(/\./g, '.\u200B')}</code>`;
            });

            formattedLines.push(formattedLine);
        }
    });

    if (!timestampAdded) {
        formattedLines.push(`🕒 <b>Date & Time: ${timeStr}</b>`);
        timestampAdded = true;
    }

    if (hashtags.length > 0) {
        formattedLines.push(`<blockquote><tg-spoiler>${hashtags.join(' ')}</tg-spoiler></blockquote>`);
    }

    return formattedLines.join('\n\n');
}

function savePostContent(msg) {
    let rawText = msg.caption || msg.text || '';
    let entities = msg.caption_entities || msg.entities || [];
    let postTimestamp = Date.now();
    
    let formattedText = smartFormatPost(rawText, entities, postTimestamp);
    if (!formattedText) formattedText = rawText;
    
    const photo = msg.photo ? msg.photo[msg.photo.length - 1].file_id : null;
    const replyMarkup = msg.reply_markup || null;
    
    if (formattedText || photo) {
        const textExists = postDatabase.all_posts.some(p => p.rawText === rawText);
        if (textExists) return false;

        let postContent = {
            rawText: rawText,
            text: formattedText,
            photo: photo,
            replyMarkup: replyMarkup || null,
            timestamp: postTimestamp
        };

        if (!postDatabase.all_posts) postDatabase.all_posts = [];
        postDatabase.all_posts.push(postContent);
        savePosts();
        return true;
    }
    return false;
}

bot.on('channel_post', (msg) => {
    const chatUsername = msg.chat.username ? `@${msg.chat.username.toLowerCase()}` : '';
    if (chatUsername === TARGET_CHANNEL.toLowerCase()) {
        savePostContent(msg);
    }
});

async function handleUserQuery(chatId, queryText) {
    try {
        await bot.sendChatAction(chatId, 'typing');

        let cleanQuery = queryText.trim().toLowerCase();
        let normCleanQuery = cleanQuery.replace(/[\s._-]/g, '');

        let allOfficialGames = getAllOfficialGames();
        let matchedGameObj = allOfficialGames.find(g => {
            let nameLower = g.name.toLowerCase();
            let normName = nameLower.replace(/[\s._-]/g, '');

            if (cleanQuery === nameLower || normCleanQuery === normName) {
                return true;
            }

            for (let alias of g.aliases) {
                let aliasLower = alias.toLowerCase();
                let normAlias = aliasLower.replace(/[\s._-]/g, '');
                if (cleanQuery === aliasLower || normCleanQuery === normAlias) {
                    return true;
                }
            }
            return false;
        });

        if (matchedGameObj) {
            let matchedPost = postDatabase.all_posts.find(p => {
                let firstLine = p.text.split('\n')[0].replace(/<[^>]*>/g, '').trim().toLowerCase();
                let rawLower = p.rawText.toLowerCase();
                return firstLine.includes(matchedGameObj.name.toLowerCase()) || rawLower.includes(matchedGameObj.name.toLowerCase());
            });

            if (matchedPost) {
                await sendSingleMessage(chatId, matchedPost.text, matchedPost.photo, matchedPost.replyMarkup);
                return;
            }
        }

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "openai/gpt-oss-20b",
                messages: [
                    { role: "system", content: getSystemPrompt(queryText) },
                    { role: "user", content: queryText }
                ],
                temperature: 0.7
            })
        });

        const data = await response.json();

        if (data.error) {
            await sendSingleMessage(chatId, `⚠️ <b>Groq API Error:</b> ${data.error.message}`, null, null);
            return;
        }

        let aiReply = data.choices?.[0]?.message?.content;

        if (aiReply) {
            await sendSingleMessage(chatId, aiReply, null, null);
        } else {
            await sendSingleMessage(chatId, "Please type or speak your official game name to get promo codes.", null, null);
        }

    } catch (aiErr) {
        console.error("Groq AI Error:", aiErr.message);
        await sendSingleMessage(chatId, `⚠️ <b>AI Connection Error:</b> ${aiErr.message}`, null, null);
    }
}

async function transcribeVoice(fileId) {
    try {
        const fileLink = await bot.getFileLink(fileId);
        const response = await fetch(fileLink);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const formData = new FormData();
        formData.append('model', 'whisper-large-v3');
        const blob = new Blob([buffer], { type: 'audio/ogg' });
        formData.append('file', blob, 'voice.ogg');

        const transcriptionResponse = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`
            },
            body: formData
        });

        const data = await transcriptionResponse.json();
        return data.text || '';
    } catch (e) {
        console.error("Transcription error:", e.message);
        return '';
    }
}

cron.schedule('* * * * *', () => {
    getUpcomingGames();
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;

    if (!botUsers.includes(chatId) && chatId) {
        botUsers.push(chatId);
        saveUsers();
    }

    if (msg.message_id) {
        await trackAndManageMessages(chatId, msg.message_id);
    }

    if (msg.forward_from_chat) {
        const forwardedChannelUsername = msg.forward_from_chat.username ? `@${msg.forward_from_chat.username.toLowerCase()}` : '';

        if (forwardedChannelUsername === TARGET_CHANNEL.toLowerCase()) {
            let isSaved = savePostContent(msg);
            if (isSaved) {
                await sendSingleMessage(chatId, `✅ <b>Post successfully saved to database!</b>\n📊 Total saved posts: <b>${postDatabase.all_posts.length}</b>`, null, null);
            } else {
                await sendSingleMessage(chatId, `⚠️ <b>This post already exists in the database or is empty!</b>`, null, null);
            }
            return;
        }
    }

    if (msg.text && msg.text.startsWith('/addgame')) {
        if (!ADMIN_CHAT_ID || chatId !== ADMIN_CHAT_ID) {
            await sendSingleMessage(chatId, `❌ <b>Access Denied!</b>\n\nYou are not authorized to use this command.`, null, null);
            return;
        }

        let cleanText = msg.text.replace('/addgame', '').trim();
        if (cleanText) {
            addDynamicGame(cleanText);
            let allOfficial = getAllOfficialGames();
            await sendSingleMessage(chatId, `✅ <b>New Official Game Added Successfully!</b>\n\n🎮 Added: <b>${cleanText}</b>\n📊 Total Official Games: <b>${allOfficial.length}</b>`, null, null);
        } else {
            await sendSingleMessage(chatId, `⚠️ <b>Invalid Format!</b>\nUse format like:\n<code>/addgame Gold Rummy</code>`, null, null);
        }
        return;
    }

    if (msg.text && (msg.text.startsWith('/comingsoon') || msg.text.startsWith('/cominsoon'))) {
        if (!ADMIN_CHAT_ID || chatId !== ADMIN_CHAT_ID) {
            await sendSingleMessage(chatId, `❌ <b>Access Denied!</b>\n\nYou are not authorized to use this command.`, null, null);
            return;
        }

        let cleanText = msg.text.replace('/comingsoon', '').replace('/cominsoon', '').trim();
        let parts = cleanText.split('|');
        if (parts.length === 2) {
            let gameName = parts[0].trim();
            let gameDate = parts[1].trim();
            addUpcomingGame(gameName, gameDate);
            
            let allActive = getUpcomingGames();
            let listStr = allActive.map(g => `• <b>${g.name}</b> (Launch: ${g.date} at 8:00 AM)`).join('\n');

            await sendSingleMessage(chatId, `✅ <b>Upcoming Yono Game Added Successfully!</b>\n\n🎮 Added: <b>${gameName}</b> (${gameDate})\n\n📋 <b>Current Active Upcoming Games:</b>\n${listStr}`, null, null);
        } else {
            await sendSingleMessage(chatId, `⚠️ <b>Invalid Format!</b>\nUse format like:\n<code>/comingsoon Gold Rummy | 19/08/2026</code>`, null, null);
        }
        return;
    }

    if (msg.voice || msg.audio) {
        let fileId = msg.voice ? msg.voice.file_id : msg.audio.file_id;
        await bot.sendChatAction(chatId, 'typing');
        let transcribedText = await transcribeVoice(fileId);
        
        if (transcribedText) {
            await handleUserQuery(chatId, transcribedText);
        } else {
            await sendSingleMessage(chatId, "Sorry, I could not understand your voice message. Please speak the official game name clearly or type it.", null, null);
        }
        return;
    }

    if (msg.text) {
        if (msg.text.startsWith('/start')) {
            let upcomingList = getUpcomingGames();
            let upcomingText = "";
            if (upcomingList.length > 0) {
                let listStr = upcomingList.map(g => `🚀 <b>${g.name}</b> launching on <b>${g.date}</b>!`).join('\n');
                upcomingText = `<b>Upcoming Games:</b>\n${listStr}\n\n`;
            }
            
            const welcomeText = `<b>Welcome to Yono Gaming Head AI!</b>\n\n` +
                `👑 Hello! I am the official AI assistant. Please type or speak the exact name of your official game to receive verified promo codes and download links.\n\n` +
                upcomingText +
                `🤖 <b>Official Bot Announcement:</b>\n\nRemember, all our official new games and new promo codes are created directly by Yono Gaming Head AI! Once generated, these new promo codes are instantly activated across all games. 🚀`;
            
            await sendSingleMessage(chatId, welcomeText, null, null);
        } else {
            await handleUserQuery(chatId, msg.text);
        }
    }
});

console.log("Yono Gaming Head AI bot running successfully with Enhanced Rejection & Invitation System!");
