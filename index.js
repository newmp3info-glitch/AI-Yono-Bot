import TelegramBotPkg from 'node-telegram-bot-api';
const TelegramBot = TelegramBotPkg.default || TelegramBotPkg;
import http from 'http';
import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import { Groq } from 'groq-sdk';
import { detect } from 'langdetect';
import googleTTS from 'google-tts-api';

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const TARGET_CHANNEL = '@VipYonoFreeCode';
const POSTS_FILE = 'posts.json';
const USERS_FILE = 'users.json';
const VOICE_ID_FILE = 'voice_id.txt';
const UPCOMING_FILE = 'upcoming.json';

const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID ? Number(process.env.ADMIN_CHAT_ID) : null;

// কোম্পানির অফিশিয়াল গেমগুলোর মেমোরি লিস্ট (বাংলা ও ইংরেজি নাম ম্যাপিংসহ)
const OFFICIAL_COMPANY_GAMES = [
    { name: "Win Rummy", aliases: ["win rummy", "উইন রামি"] },
    { name: "Dhan Game", aliases: ["dhan game", "ধান গেম", "dhan"] },
    { name: "Max Rummy", aliases: ["max rummy", "ম্যাক্স রামি"] },
    { name: "Jaiho777Vip", aliases: ["jaiho777vip", "jaiho 777", "জైহো"] },
    { name: "Jaiho91", aliases: ["jaiho91", "jaiho 91"] },
    { name: "Joy Rummy", aliases: ["joy rummy", "জয় রামি"] },
    { name: "INR Rummy", aliases: ["inr rummy", "আইএনআর রামি"] },
    { name: "BOSS Rummy", aliases: ["boss rummy", "বস রামি"] },
    { name: "Ever777", aliases: ["ever777", "এবার ৭৭৭"] },
    { name: "Rummy888", aliases: ["rummy888", "রামি ৮৮৮"] },
    { name: "Rummy 77", aliases: ["rummy 77", "রামি ৭৭"] },
    { name: "RummyLudo", aliases: ["rummyludo", "rummy ludo", "রামি লুডো"] },
    { name: "777.Game", aliases: ["777.game", "777 game"] },
    { name: "OKRummy", aliases: ["okrummy", "ওকে রামি"] },
    { name: "Hindi777", aliases: ["hindi777", "হিন্দি ৭৭৭"] },
    { name: "ClubINR", aliases: ["clubinr", "ক্লাব আইএনআর"] },
    { name: "GameRummy", aliases: ["gamerummy", "গেম রামি"] },
    { name: "YesSpin", aliases: ["yesspin", "ইয়েস স্পিন"] },
    { name: "RumbleRummy", aliases: ["rumblerummy"] },
    { name: "LoveRummy", aliases: ["loverummy", "লাভ রামি"] },
    { name: "ShareSlots", aliases: ["shareslots"] },
    { name: "MahaGames", aliases: ["mahagames", "মহা গেমস্"] },
    { name: "HiRummy", aliases: ["hirummy", "হাই রামি"] },
    { name: "JaihoWin", aliases: ["jaihowin"] },
    { name: "INDCLUB", aliases: ["indclub", "ইন্ড ক্লাব"] },
    { name: "TOPRummy", aliases: ["toprummy", "টপ রামি"] },
    { name: "IndRummy", aliases: ["indrummy", "ইন্ড রামি"] },
    { name: "JaihoSlots", aliases: ["jaihoslots"] },
    { name: "SagaSlots", aliases: ["sagaslots"] },
    { name: "GogoRummy", aliases: ["gogorummy", "গোগো রামি"] },
    { name: "Rummy91", aliases: ["rummy91", "রামি ৯১"] },
    { name: "ABCRummy", aliases: ["abcrummy"] },
    { name: "JaihoRummy", aliases: ["jaihorummy"] },
    { name: "INDSlots", aliases: ["indslots"] },
    { name: "Spin101", aliases: ["spin101", "স্পিন ১০১"] },
    { name: "YonoVip", aliases: ["yonovip", "যোনো ভিআইপি"] },
    { name: "Spin777", aliases: ["spin777", "স্পিন ৭৭৭"] },
    { name: "Bet213", aliases: ["bet213", "বেট ২১৩"] },
    { name: "YonoRummy", aliases: ["yonorummy", "যোনো রামি"] },
    { name: "Bingo101", aliases: ["bingo101", "বিঙ্গো ১০১"] },
    { name: "789JackPots", aliases: ["789jackpots", "৭৮৯ জ্যাকপট"] },
    { name: "YonoArcade", aliases: ["yonoarcade", "যোনো আর্কেড"] },
    { name: "YonoGames", aliases: ["yonogames", "যোনো গেমস্"] },
    { name: "JaiHoSpin", aliases: ["jaihospin"] },
    { name: "YonoSlots", aliases: ["yonoslots", "যোনো স্লটস"] },
    { name: "567Slots", aliases: ["567slots", "৫৬৭ স্লটস"] },
    { name: "Yono777", aliases: ["yono777", "যোনো ৭৭৭"] },
    { name: "YN777", aliases: ["yn777"] },
    { name: "SlotsSpin", aliases: ["slotsspin"] },
    { name: "NetaVIP", aliases: ["netavip", "neta vip", "নেতা ভিআইপি", "নেতাভিআইপি"] },
    { name: "JaiHoArcade", aliases: ["jaihoarcade"] },
    { name: "JaiHo777", aliases: ["jaiho777"] },
    { name: "SlotsWinner", aliases: ["slotswinner", "স্লটস উইনার"] },
    { name: "101Z", aliases: ["101z"] },
    { name: "SpinGold", aliases: ["spingold", "স্পিন গোল্ড"] },
    { name: "SpinCrush", aliases: ["spincrush", "স্পিন ক্রাশ"] },
    { name: "MBM", aliases: ["mbm", "এমবিএম"] },
    { name: "SpinWinner", aliases: ["spinwinner", "স্পিন উইনার"] }
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

    return `You are the official, intelligent, realistic AI companion and head assistant for **Yono Master Gaming**.

CRITICAL & STRICT BEHAVIORAL RULES:
1. **UNIVERSAL LANGUAGE MIRRORING**: Detect the exact language, dialect, and script used by the user and reply in that exact same language and script naturally.
2. **EXCLUSIVE BRAND FOCUS**: Yono Master Gaming ONLY features our own exclusive, official company games and promo codes.
3. **INTERNAL MEMORY PROTECTION**: Never output or leak the internal list of company games to any user.

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

async function generateAndSendAudio(chatId, text) {
    try {
        const cleanText = text.replace(/<[^>]*>/g, '').trim(); 
        
        let detectedLang = 'en';
        if (/[\u0980-\u09FF]/.test(cleanText)) {
            detectedLang = 'bn'; 
        } else if (/[\u0900-\u097F]/.test(cleanText)) {
            detectedLang = 'hi'; 
        } else if (/[\u0600-\u06FF]/.test(cleanText)) {
            detectedLang = 'ar'; 
        } else {
            try {
                const languages = detect(cleanText);
                if (languages && languages.length > 0) {
                    detectedLang = languages[0].lang;
                }
            } catch (e) {
                detectedLang = 'en';
            }
        }

        if (!detectedLang) detectedLang = 'en';

        const audioUrls = googleTTS.getAllAudioUrls(cleanText, {
            lang: detectedLang,
            slow: false,
            host: 'https://translate.google.com',
        });

        const fileName = `speech_${chatId}_${Date.now()}.mp3`;
        const filePath = path.join(process.cwd(), fileName);

        let audioBuffers = [];

        for (let item of audioUrls) {
            const response = await fetch(item.url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                }
            });
            if (response.ok) {
                const buffer = Buffer.from(await response.arrayBuffer());
                audioBuffers.push(buffer);
            }
        }

        if (audioBuffers.length === 0) {
            throw new Error("Failed to fetch any audio chunks.");
        }

        const finalBuffer = Buffer.concat(audioBuffers);
        fs.writeFileSync(filePath, finalBuffer);

        try {
            let audioMsg = await bot.sendAudio(chatId, filePath, {
                caption: "🔊 Listen to the audio response",
                performer: "Yono Master AI",
                title: "Voice Response"
            });
            if (audioMsg) {
                await trackAndManageMessages(chatId, audioMsg.message_id);
            }
        } catch (sendErr) {
            console.error("Audio send error:", sendErr);
        }

        setTimeout(() => {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }, 15000);

    } catch (e) {
        console.error("Audio generation error:", e);
    }
}

async function sendSingleMessage(chatId, text, photo, replyMarkup) {
    const options = { 
        parse_mode: "HTML",
        disable_web_page_preview: true 
    };

    const listenButton = { text: "🔊 Listen Audio", callback_data: "listen_btn" };
    
    if (replyMarkup && replyMarkup.inline_keyboard) {
        replyMarkup.inline_keyboard.push([listenButton]);
        options.reply_markup = replyMarkup;
    } else {
        options.reply_markup = { inline_keyboard: [[listenButton]] };
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

bot.on('callback_query', async (query) => {
    if (query.data === 'listen_btn') {
        await bot.answerCallbackQuery(query.id, { text: "Generating audio..." });
        const textToSpeak = query.message.text || query.message.caption;
        if (textToSpeak) {
            await generateAndSendAudio(query.message.chat.id, textToSpeak);
        }
    }
});

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Yono Master Head AI is running successfully!\n');
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

        // ১. উন্নত ডাটাবেস ম্যাচিং: বাংলা বা ইংরেজি যেকোনো নাম ইনপুট দিলেই সরাসরি পোস্ট খুঁজে বের করবে
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

        // যদি সরাসরি নামে না মেলে, তবে পুরো পোস্ট ডাটাবেসে কুয়েরি করবে
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

        // ২. এআই প্রম্পট ও ভাষা শনাক্তকরণ
        const gameNamesList = OFFICIAL_COMPANY_GAMES.map(g => g.name);
        const analysisPrompt = `You are the core intelligence of Yono Master Gaming bot.
User input: "${queryText}"
Official Company Games List: ${JSON.stringify(gameNamesList)}

Analyze the user input and classify it strictly into one of three categories:
1. "LIST_REQUEST": If the user is asking for the complete list of games, how many games exist, or asking to see all games.
2. "MATCHED_GAME: [Exact Game Name]": If the user input mentions or refers to a game name that matches ONE specific game from the Official Company Games List above (even if written in Bengali/Hindi/English transliteration).
3. "INVALID_GAME_OR_CHAT": If the user mentions a fake name, unlisted game, competitor game, or if it's general casual chat/other questions.

Output ONLY ONE of the above categories without any extra text.`;

        const analysisCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: analysisPrompt }],
            model: "llama-3.3-70b-versatile",
            temperature: 0.1,
        });

        let aiResult = analysisCompletion.choices[0]?.message?.content?.trim() || "";

        if (aiResult === "LIST_REQUEST") {
            const listRefusalPrompt = `You are the official AI companion for Yono Master Gaming. The user asked for a complete list of all games.
Rules:
- Detect the user's language and script from: "${queryText}". You MUST reply in that exact same language and script.
- Do NOT output any list of games.
- Politely and warmly explain that we do not share full game lists publicly, but Yono Master Gaming exclusively features our own official and premium games with amazing VIP promo codes.
- Ask them to type the name of their favorite game from our platform to get instant promo codes.`;

            const refusalComp = await groq.chat.completions.create({
                messages: [{ role: "user", content: listRefusalPrompt }],
                model: "llama-3.3-70b-versatile",
            });
            let replyText = refusalComp.choices[0]?.message?.content || "Please send the name of your favorite official game from our platform!";
            await sendSingleMessage(chatId, replyText, null, null);
            return;
        }

        if (aiResult.startsWith("MATCHED_GAME:")) {
            let matchedGameName = aiResult.replace("MATCHED_GAME:", "").trim();
            let foundGame = OFFICIAL_COMPANY_GAMES.find(g => g.name.toLowerCase() === matchedGameName.toLowerCase());
            
            if (foundGame) {
                // যদি পুনরায় ডাটাবেসে পোস্ট খুঁজে পাওয়া যায়
                let foundPostInDb = postDatabase.all_posts.find(p => {
                    let firstLine = p.text.split('\n')[0].replace(/<[^>]*>/g, '').trim().toLowerCase();
                    return firstLine.includes(foundGame.name.toLowerCase()) || p.rawText.toLowerCase().includes(foundGame.name.toLowerCase());
                });

                if (foundPostInDb) {
                    await sendSingleMessage(chatId, foundPostInDb.text, foundPostInDb.photo, foundPostInDb.replyMarkup);
                    return;
                }

                const gameFoundPrompt = `You are the official AI of Yono Master Gaming. The user mentioned our official company game: "${foundGame.name}".
Rules:
- Detect the user's language and script from: "${queryText}". You MUST reply in that exact same language and script.
- Enthusiastically and proudly confirm that "${foundGame.name}" is our very own official and exclusive company game at Yono Master Gaming.
- Invite them to play and grab VIP bonuses/promo codes.
- Keep it natural, engaging, and realistic (1-2 sentences).`;

                const gameComp = await groq.chat.completions.create({
                    messages: [{ role: "user", content: gameFoundPrompt }],
                    model: "llama-3.3-70b-versatile",
                });
                let gameReply = gameComp.choices[0]?.message?.content || `Great choice! ${foundGame.name} is our official exclusive game at Yono Master Gaming!`;
                await sendSingleMessage(chatId, gameReply, null, null);
                return;
            }
        }

        const generalPrompt = `You are the intelligent official AI assistant for **Yono Master Gaming**.
User input: "${queryText}"

Rules:
1. **UNIVERSAL LANGUAGE & SCRIPT MIRRORING**: Detect the user's language, dialect, and script and reply in the exact same language and script.
2. **INVALID / FAKE GAMES**: If the user mentioned a game name that is NOT one of our official company games (fake names, unlisted games, competitor games), clearly and politely inform them in their own language that **this is not our company's game**, and that Yono Master Gaming only features our own exclusive official games and promo codes. Ask them to send a valid game name from our platform.
3. **GENERAL CHAT**: If it's a casual greeting, reply warmly and briefly (1-2 sentences) maintaining the Yono Master Gaming branding in their language.`;

        const generalComp = await groq.chat.completions.create({
            messages: [
                { role: "system", content: getSystemPrompt() },
                { role: "user", content: generalPrompt }
            ],
            model: "llama-3.3-70b-versatile",
        });

        let aiReply = generalComp.choices[0]?.message?.content || "This is not our company's game. Yono Master Gaming features only our exclusive official games and promo codes!";
        await sendSingleMessage(chatId, aiReply, null, null);

    } catch (aiErr) {
        console.error("Groq AI Error:", aiErr.message);
        let fallbackMessage = "Welcome to Yono Master Gaming! Please send your favorite official game name.";
        await sendSingleMessage(chatId, fallbackMessage, null, null);
    }
}

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

    if (msg.voice || msg.audio) {
        await handleVoiceMessage(msg);
        return;
    }

    if (msg.forward_from_chat) {
        const forwardedChannelUsername = msg.forward_from_chat.username ? `@${msg.forward_from_chat.username.toLowerCase()}` : '';

        if (forwardedChannelUsername === TARGET_CHANNEL.toLowerCase()) {
            let isSaved = savePostContent(msg);
            if (isSaved) {
                await bot.sendMessage(chatId, `✅ <b>Post successfully saved to database!</b>\n📊 Total saved posts: <b>${postDatabase.all_posts.length}</b>`, { parse_mode: "HTML" });
            } else {
                await bot.sendMessage(chatId, `⚠️ <b>This post already exists in the database or is empty!</b>`, { parse_mode: "HTML" });
            }
            return;
        }
    }

    if (msg.text && msg.text.startsWith('/comingsoon')) {
        if (!ADMIN_CHAT_ID || chatId !== ADMIN_CHAT_ID) {
            await bot.sendMessage(chatId, `❌ <b>Access Denied!</b>\n\nYou are not authorized to use this command. Only the admin can set upcoming games!`, { parse_mode: "HTML" });
            return;
        }

        let parts = msg.text.replace('/comingsoon', '').split('|');
        if (parts.length === 2) {
            let gameName = parts[0].trim();
            let gameDate = parts[1].trim();
            addUpcomingGame(gameName, gameDate);
            
            let allActive = getUpcomingGames();
            let listStr = allActive.map(g => `• <b>${g.name}</b> (${g.date})`).join('\n');

            await bot.sendMessage(chatId, `✅ <b>Upcoming Yono Game Added Successfully!</b>\n\n🎮 Added: <b>${gameName}</b> (${gameDate})\n\n📋 <b>Current Active Upcoming Games:</b>\n${listStr}`, { parse_mode: "HTML" });
        } else {
            await bot.sendMessage(chatId, `⚠️ <b>Invalid Format!</b>\nUse format like:\n<code>/comingsoon Gold Rummy | 19/08/2026</code>`, { parse_mode: "HTML" });
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
            
            const welcomeText = `<b>Welcome to Yono Master Head AI! 💖</b>\n\n` +
                `👑 Hello my dear friend! I am the official AI assistant for <b>Yono Master Gaming</b>. To get VIP bonuses and promo codes for our exclusive games, send me the name of your favorite game right now!\n\n` +
                upcomingText +
                `🎮 Let's get started!`;
            
            try {
                let textMsg = await bot.sendMessage(chatId, welcomeText, { parse_mode: "HTML", disable_web_page_preview: true });
                if (textMsg) await trackAndManageMessages(chatId, textMsg.message_id);

                let cachedVoiceId = ``;
                if (fs.existsSync(VOICE_ID_FILE)) {
                    cachedVoiceId = fs.readFileSync(VOICE_ID_FILE, 'utf8').trim();
                }

                let voiceMsg = null;
                if (cachedVoiceId) {
                    voiceMsg = await bot.sendVoice(chatId, cachedVoiceId);
                } else if (fs.existsSync('./audio.mp3')) {
                    voiceMsg = await bot.sendVoice(chatId, fs.createReadStream('./audio.mp3'));
                    if (voiceMsg && voiceMsg.voice && voiceMsg.voice.file_id) {
                        fs.writeFileSync(VOICE_ID_FILE, voiceMsg.voice.file_id);
                    }
                }

                if (voiceMsg) {
                    await trackAndManageMessages(chatId, voiceMsg.message_id);
                }

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
    `Exclusive VIP bonuses for all our <b>Yono Master Gaming</b> platform games are waiting for you. 💰\n\n` +
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

console.log("Yono Master Head AI bot running successfully with multi-lingual fuzzy game matching and instant post delivery!");
