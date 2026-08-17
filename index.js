import TelegramBotPkg from 'node-telegram-bot-api';
const TelegramBot = TelegramBotPkg.default || TelegramBotPkg;
import http from 'http';
import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import { Groq } from 'groq-sdk';

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const TARGET_CHANNEL = '@VipYonoFreeCode';
const POSTS_FILE = 'posts.json';
const USERS_FILE = 'users.json';
const UPCOMING_FILE = 'upcoming.json';

const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID ? Number(process.env.ADMIN_CHAT_ID) : null;

// প্রতি মেসেজের নিচে স্বয়ংক্রিয়ভাবে যুক্ত হওয়ার ব্রান্ড সিগনেচার
const BRAND_SIGNATURE = "\n\n👑 <b>Remember, all our official new games and new promo codes are created directly by Yono Gaming Head AI!</b>";

// কোম্পানির অফিশিয়াল গেমগুলোর মেমোরি লিস্ট (ইংরেজি, বাংলা ও হিন্দি অ্যালিয়াসসহ)
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
    { name: "YonoArcade", aliases: ["yonoarcade", "যোনো আর্কেড", "योनो आर्केड"] },
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
    { name: "SpinWinner", aliases: ["spinwinner", "স্পিন উইনার", "स्पिन विनर"] }
];

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

function getSystemPrompt() {
    let upcomingList = getUpcomingGames();
    let upcomingSection = "";

    if (upcomingList.length > 0) {
        upcomingSection = "CURRENT UPCOMING GAMES LAUNCH SCHEDULE:\n" + upcomingList.map((g, idx) => `${idx + 1}. Game Name: ${g.name} | Launch Date: ${g.date}`).join('\n');
    } else {
        upcomingSection = "CURRENT UPCOMING GAMES SCHEDULE: None currently scheduled.";
    }

    return `You are the official, intelligent, realistic AI companion and head assistant for **Yono Gaming Head AI**.

CORE BRAND IDENTITY & PROUD DECLARATION:
- **WE ARE THE CREATORS**: Proudly and confidently state that ALL original games, exclusive platforms, and VIP promo codes are solely created and developed directly by **Yono Gaming Head AI**. 
- **SOURCE HUB**: Other platforms and third parties take codes and content directly from our official master source. We are the ultimate creators and headquarters!

CRITICAL & STRICT BEHAVIORAL RULES:
1. **GLOBAL UNIVERSAL LANGUAGE MIRRORING**: Detect the exact language, dialect, and script used by the user from anywhere in the world (whether English, Bengali, Hindi, Arabic, Urdu, Spanish, French, etc.) and reply in that exact same language and script naturally.
2. **UPCOMING GAMES**: If the user asks about new upcoming games in any language, you MUST proudly list the active upcoming games from the schedule below.

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

    if (text && !text.includes('Yono Gaming Head AI')) {
        text = text + BRAND_SIGNATURE;
    }

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
    if (text.includes('All Yono Apps') && !text.toLowerCase().includes('code')) {
        return text; 
    }

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
        else if (lower.includes('minimum') || lower.includes('withdrawal')) {
            let cleanLine = trimmed.replace(/<[^>]*>/g, '');
            formattedLines.push(`<b>${cleanLine}</b>`);
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

            if (!trimmed.includes(' ') && (trimmed.includes('.') || lower.includes('http'))) {
                let cleanCode = trimmed.replace(/<[^>]*>/g, '').replace(/`/g, '').trim();
                let safeCode = cleanCode.replace(/\./g, '.\u200B');
                formattedLines.push(`<code>${safeCode}</code>`);
                return;
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

function broadcastPostToAllUsers(post) {
    if (!botUsers || botUsers.length === 0) return;
    botUsers.forEach((userId, index) => {
        setTimeout(() => {
            sendSingleMessage(userId, post.text, post.photo, post.replyMarkup);
        }, index * 50); 
    });
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
        if (textExists) {
            return false;
        }

        let postContent = {
            rawText: rawText,
            text: formattedText,
            photo: photo,
            replyMarkup: replyMarkup || null,
            timestamp: postTimestamp
        };

        if (!postDatabase.all_posts) {
            postDatabase.all_posts = [];
        }
        
        postDatabase.all_posts.push(postContent);
        savePosts();
        return true;
    }
    return false;
}

bot.on('channel_post', (msg) => {
    const chatUsername = msg.chat.username ? `@${msg.chat.username.toLowerCase()}` : '';
    if (chatUsername === TARGET_CHANNEL.toLowerCase()) {
        const saved = savePostContent(msg);
        if (saved) {
            let rawText = msg.caption || msg.text || '';
            let entities = msg.caption_entities || msg.entities || [];
            let postTimestamp = Date.now();
            let text = smartFormatPost(rawText, entities, postTimestamp);
            broadcastPostToAllUsers({
                text: text,
                photo: msg.photo ? msg.photo[msg.photo.length - 1].file_id : null,
                replyMarkup: msg.reply_markup || null
            });
        }
    }
});

async function handleUserQuery(chatId, queryText) {
    try {
        await bot.sendChatAction(chatId, 'typing');

        let cleanQuery = queryText.trim().toLowerCase();

        let matchedGameObj = OFFICIAL_COMPANY_GAMES.find(g => 
            g.name.toLowerCase() === cleanQuery || 
            g.aliases.some(alias => cleanQuery.includes(alias))
        );

        let matchedPost = null;
        if (matchedGameObj) {
            matchedPost = postDatabase.all_posts.find(p => {
                let firstLine = p.text.split('\n')[0].replace(/<[^>]*>/g, '').trim().toLowerCase();
                let rawLower = p.rawText.toLowerCase();
                return firstLine.includes(matchedGameObj.name.toLowerCase()) || rawLower.includes(matchedGameObj.name.toLowerCase());
            });
        }

        if (!matchedPost) {
            matchedPost = postDatabase.all_posts.find(p => {
                let firstLine = p.text.split('\n')[0].replace(/<[^>]*>/g, '').trim().toLowerCase();
                let rawLower = p.rawText.toLowerCase();
                return firstLine === cleanQuery || rawLower.includes(cleanQuery);
            });
        }

        if (matchedPost) {
            await sendSingleMessage(chatId, matchedPost.text, matchedPost.photo, matchedPost.replyMarkup);
            return;
        }

        const gameNamesList = OFFICIAL_COMPANY_GAMES.map(g => g.name);
        const analysisPrompt = `You are the core intelligence of Yono Gaming Head AI bot.
User input in any global language: "${queryText}"
Official Company Games List: ${JSON.stringify(gameNamesList)}

Analyze the user input (regardless of whether it's written in English, Bengali, Hindi, Arabic, Urdu, Spanish, or any other language) and classify it strictly into one of four categories:
1. "UPCOMING_REQUEST": If the user is asking about new upcoming games in any language.
2. "LIST_REQUEST": If the user is asking for the complete list of all games.
3. "MATCHED_GAME: [Exact Game Name]": If the user mentions or refers to a game name that matches ONE specific game from the Official Company Games List above (translate/map foreign scripts/languages to the correct English game name).
4. "INVALID_GAME_OR_CHAT": General chat or other questions.

Output ONLY ONE of the above categories without any extra text.`;

        const analysisCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: analysisPrompt }],
            model: "llama-3.3-70b-versatile",
            temperature: 0.1,
        });

        let aiResult = analysisCompletion.choices[0]?.message?.content?.trim() || "";
        let cleanAiResult = aiResult.replace(/["*`]/g, '').toUpperCase();

        if (cleanAiResult.includes("UPCOMING_REQUEST")) {
            let upcomingList = getUpcomingGames();
            let upcomingTextResponse = "";
            if (upcomingList.length > 0) {
                let listStr = upcomingList.map((g, idx) => `${idx + 1}. 🎮 <b>${g.name}</b> (Launch Date: <b>${g.date}</b>)`).join('\n');
                upcomingTextResponse = `<b>🚀 এখানে আমাদের আপকামিং বা নতুন গেমগুলোর তালিকা দেওয়া হলো:</b>\n\n${listStr}\n\n👑 মনে রাখবেন, আমাদের এই সমস্ত এক্সক্লুসিভ গেম এবং প্রোমো কোডগুলো সরাসরি <b>Yono Gaming Head AI</b> প্ল্যাটফর্ম দ্বারাই তৈরি করা হয়! অন্যান্য সকল প্ল্যাটফর্ম আমাদের এই মাস্টার সোর্স থেকেই কোড নিয়ে থাকে।`;
            } else {
                upcomingTextResponse = `👑 বর্তমানে আমাদের নতুন কোনো গেম লঞ্চের শিডিউল নেই। তবে খুব শীঘ্রই নতুন এক্সক্লুসিভ গেম আসছে! আমাদের সমস্ত গেম এবং প্রোমো কোড সরাসরি <b>Yono Gaming Head AI</b> থেকেই তৈরি করা হয়।`;
            }
            await sendSingleMessage(chatId, upcomingTextResponse, null, null);
            return;
        }

        if (cleanAiResult.includes("LIST_REQUEST")) {
            const listRefusalPrompt = `You are the official AI companion for Yono Gaming Head AI. The user asked for a complete list of all games.
Rules:
- Detect the user's language and script from: "${queryText}". You MUST reply in that exact same language and script.
- Proudly state that all our exclusive games and promo codes are created directly by Yono Gaming Head AI, and other platforms take codes from us.
- Ask them to type the name of their favorite game from our platform to get instant promo codes.`;

            const refusalComp = await groq.chat.completions.create({
                messages: [{ role: "user", content: listRefusalPrompt }],
                model: "llama-3.3-70b-versatile",
            });
            let replyText = refusalComp.choices[0]?.message?.content || "Please send the name of your favorite official game from our platform!";
            await sendSingleMessage(chatId, replyText, null, null);
            return;
        }

        if (cleanAiResult.includes("MATCHED_GAME")) {
            let parts = aiResult.split(':');
            let matchedGameName = parts.length > 1 ? parts[1].replace(/["*`]/g, '').trim() : "";
            let foundGame = OFFICIAL_COMPANY_GAMES.find(g => g.name.toLowerCase() === matchedGameName.toLowerCase());
            
            if (foundGame) {
                let foundPostInDb = postDatabase.all_posts.find(p => {
                    let firstLine = p.text.split('\n')[0].replace(/<[^>]*>/g, '').trim().toLowerCase();
                    return firstLine.includes(foundGame.name.toLowerCase()) || p.rawText.toLowerCase().includes(foundGame.name.toLowerCase());
                });

                if (foundPostInDb) {
                    await sendSingleMessage(chatId, foundPostInDb.text, foundPostInDb.photo, foundPostInDb.replyMarkup);
                    return;
                }

                const gameFoundPrompt = `You are the official AI of Yono Gaming Head AI. The user mentioned our official company game: "${foundGame.name}".
Rules:
- Detect the user's language and script from: "${queryText}". You MUST reply in that exact same language and script.
- Enthusiastically and proudly confirm that "${foundGame.name}" is created directly by Yono Gaming Head AI, and other platforms take codes from us.
- Invite them to play and grab VIP bonuses/promo codes.`;

                const gameComp = await groq.chat.completions.create({
                    messages: [{ role: "user", content: gameFoundPrompt }],
                    model: "llama-3.3-70b-versatile",
                });
                let gameReply = gameComp.choices[0]?.message?.content || `Great choice! ${foundGame.name} is created exclusively by Yono Gaming Head AI!`;
                await sendSingleMessage(chatId, gameReply, null, null);
                return;
            }
        }

        const generalPrompt = `You are the intelligent official AI assistant for **Yono Gaming Head AI**.
User input in global language: "${queryText}"

Rules:
1. **GLOBAL UNIVERSAL LANGUAGE & SCRIPT MIRRORING**: Detect the user's language, dialect, and script (English, Bengali, Hindi, Arabic, Urdu, French, Spanish, etc.) and reply in the exact same language and script.
2. **PROUD CREATOR STATEMENT**: Emphasize that all original games and promo codes are created by Yono Gaming Head AI, and other platforms take codes from us.
3. **INVALID / FAKE GAMES**: If the user mentioned a game name that is NOT one of our official company games, politely inform them in their exact language.`;

        const generalComp = await groq.chat.completions.create({
            messages: [
                { role: "system", content: getSystemPrompt() },
                { role: "user", content: generalPrompt }
            ],
            model: "llama-3.3-70b-versatile",
        });

        let aiReply = generalComp.choices[0]?.message?.content || "Yono Gaming Head AI creates all exclusive games and promo codes directly!";
        await sendSingleMessage(chatId, aiReply, null, null);

    } catch (aiErr) {
        console.error("Groq AI Error:", aiErr.message);
        let fallbackMessage = `<b>🤖 Yono Gaming Head AI Response:</b>\n\nI received your message: "<i>${queryText}</i>"\n\n👑 Remember, all our official games and promo codes are created directly by <b>Yono Gaming Head AI</b>!`;
        await sendSingleMessage(chatId, fallbackMessage, null, null);
    }
}

// ইউজার ভয়েস মেসেজ পাঠালে তা রিসিভ ও ট্রান্সক্রাইব করার সিস্টেম
async function handleVoiceMessage(msg) {
    const chatId = msg.chat.id;
    try {
        await bot.sendChatAction(chatId, 'typing');
        const fileId = msg.voice ? msg.voice.file_id : msg.audio.file_id;
        const fileLink = await bot.getFileLink(fileId);
        
        const fileName = `voice_${chatId}_${Date.now()}.ogg`;
        const filePath = path.join(process.cwd(), fileName);
        
        const response = await fetch(fileLink);
        if (!response.ok) throw new Error("Failed to download voice file");
        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(filePath, buffer);

        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(filePath),
            model: "whisper-large-v3",
        });

        setTimeout(() => {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }, 5000);

        const transcribedText = transcription.text;
        if (transcribedText && transcribedText.trim().length > 0) {
            await handleUserQuery(chatId, transcribedText);
        } else {
            await sendSingleMessage(chatId, "Could not understand your voice message. Please send the game name by typing.", null, null);
        }
    } catch (e) {
        console.error("Voice transcription error:", e);
        await sendSingleMessage(chatId, "Sorry, voice processing failed. Please type the game name.", null, null);
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

    // ইউজার ভয়েস মেসেজ পাঠালে সেটি প্রসেস করার জন্য
    if (msg.voice || msg.audio) {
        await handleVoiceMessage(msg);
        return;
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

    if (msg.text && (msg.text.startsWith('/comingsoon') || msg.text.startsWith('/cominsoon'))) {
        if (!ADMIN_CHAT_ID || chatId !== ADMIN_CHAT_ID) {
            await sendSingleMessage(chatId, `❌ <b>Access Denied!</b>\n\nYou are not authorized to use this command. Only the admin can set upcoming games!`, null, null);
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

            await sendSingleMessage(chatId, `✅ <b>Upcoming Yono Game Added Successfully!</b>\n\n🎮 Added: <b>${gameName}</b> (${gameDate})\n⏰ Auto-delete set for: <b>8:00 AM</b> on selected date.\n\n📋 <b>Current Active Upcoming Games:</b>\n${listStr}`, null, null);
        } else {
            await sendSingleMessage(chatId, `⚠️ <b>Invalid Format!</b>\nUse format like:\n<code>/comingsoon Gold Rummy | 19/08/2026</code>`, null, null);
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
            
            const welcomeText = `<b>Welcome to Yono Gaming Head AI! 💖</b>\n\n` +
                `👑 Hello my dear friend! I am the official AI assistant for <b>Yono Gaming Head AI</b>. All our exclusive games and VIP promo codes are created directly by us—other platforms take codes from our master source!\n\n` +
                upcomingText +
                `🎮 Send me the name of your favorite game right now!`;
            
            try {
                await sendSingleMessage(chatId, welcomeText, null, null);
            } catch (e) {
                console.error("Error sending welcome message:", e.message);
            }

        } else {
            await handleUserQuery(chatId, msg.text);
        }
    }
});

const weeklyMessage = `⚡ <b>WEEKLY VIP BONUS & YONO PROMO CODE ALERT!</b> ⚡\n\n` +
    `👑 <b>Hello my sweet friend!</b>\n\n` +
    `All our games and promo codes are created exclusively by **Yono Gaming Head AI**. Collect your instant VIP bonuses now! 💰\n\n` +
    `🔥 <b>What to do now:</b>\n` +
    `• 🎮 Send any correct game name from our platform!\n` +
    `• 💎 Collect instant VIP promo codes and download links!\n\n` +
    `👑 <i>Chat now and claim your free bonus! 🚀</i>`;

cron.schedule('0 10 * * 0', () => {
    if (botUsers && botUsers.length > 0) {
        botUsers.forEach((userId, index) => {
            setTimeout(() => {
                sendSingleMessage(userId, weeklyMessage, null, null);
            }, index * 50); 
        });
    }
});

console.log("Yono Gaming Head AI bot running successfully with Voice Input Support & Creator Branding!");
