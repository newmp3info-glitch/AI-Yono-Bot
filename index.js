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

// কোম্পানির অফিশিয়াল গেমগুলোর মেমোরি লিস্ট (এটি কাউকেই লিস্ট আকারে পাঠানো হবে না, শুধু ইন্টারনাল চেকিংয়ের জন্য ব্যবহৃত হবে)
const OFFICIAL_COMPANY_GAMES = [
    "Win Rummy", "Dhan Game", "Max Rummy", "Jaiho777Vip", "Jaiho91", "Joy Rummy", 
    "INR Rummy", "BOSS Rummy", "Ever777", "Rummy888", "Rummy 77", "RummyLudo", 
    "777.Game", "OKRummy", "Hindi777", "ClubINR", "GameRummy", "YesSpin", 
    "RumbleRummy", "LoveRummy", "ShareSlots", "MahaGames", "HiRummy", "JaihoWin", 
    "INDCLUB", "TOPRummy", "IndRummy", "JaihoSlots", "SagaSlots", "GogoRummy", 
    "Rummy91", "ABCRummy", "JaihoRummy", "INDSlots", "Spin101", "YonoVip", 
    "Spin777", "Bet213", "YonoRummy", "Bingo101", "789JackPots", "YonoArcade", 
    "YonoGames", "JaiHoSpin", "YonoSlots", "567Slots", "Yono777", "YN777", 
    "SlotsSpin", "NetaVIP", "JaiHoArcade", "JaiHo777", "SlotsWinner", "101Z", 
    "SpinGold", "SpinCrush", "MBM", "SpinWinner"
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

// এআই-এর জন্য প্রফেশনাল ও ব্র্যান্ড-কেন্দ্রিক সিস্টেম প্রম্পট
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
1. **EXCLUSIVE BRAND FOCUS**: Yono Master Gaming ONLY features our own exclusive, official company games and promo codes. We do not provide or promote any other third-party or competitor games.
2. **INTERNAL MEMORY PROTECTION**: Never output or leak the list of company games to any user.
3. **REALISTIC NATURAL CONVERSATION**: Reply intelligently, warmly, and contextually in the exact same language and script as the user. Never sound robotic or repetitive.

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
                caption: "🔊 Listen to the full audio response",
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

        // এআই-এর মাধ্যমে ইনপুট বিশ্লেষণ করা: এটি কি লিস্ট রিকোয়েস্ট, বৈধ কোম্পানির গেম নাকি ভুংভাং/অন্য গেম?
        const analysisPrompt = `You are the core intelligence of Yono Master Gaming bot.
User input: "${queryText}"
Official Company Games List: ${JSON.stringify(OFFICIAL_COMPANY_GAMES)}

Analyze the user input and classify it strictly into one of three categories:
1. "LIST_REQUEST": If the user is asking for the complete list of games, how many games exist, or asking to see all games.
2. "MATCHED_GAME: [Exact Game Name]": If the user input mentions, refers to, or spells a game name that matches ONE specific game from the Official Company Games List above (handle spelling or partial matches intelligently).
3. "INVALID_GAME_OR_CHAT": If the user mentions a fake name, unlisted game, competitor game, or if it's general casual chat/other questions.

Output ONLY ONE of the above categories without any extra text.`;

        const analysisCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: analysisPrompt }],
            model: "llama-3.3-70b-versatile",
            temperature: 0.1,
        });

        let aiResult = analysisCompletion.choices[0]?.message?.content?.trim() || "";

        // ১. যদি ইউজার সব গেমের তালিকা বা লিস্ট দেখতে চায়
        if (aiResult === "LIST_REQUEST") {
            const listRefusalPrompt = `You are the official AI companion for Yono Master Gaming. The user asked for a complete list of all games. 
Rules:
- Do NOT output any list of games.
- Politely and warmly explain in the user's language and script that we do not share full game lists publicly, but Yono Master Gaming exclusively features our own official and premium games with amazing VIP promo codes.
- Ask them to type the name of their favorite game from our platform to get instant promo codes.
User query: "${queryText}"`;

            const refusalComp = await groq.chat.completions.create({
                messages: [{ role: "user", content: listRefusalPrompt }],
                model: "llama-3.3-70b-versatile",
            });
            let replyText = refusalComp.choices[0]?.message?.content || "Yono Master Gaming-এ শুধুমাত্র আমাদের নিজস্ব এক্সক্লুসিভ গেমগুলোর ভিআইপি প্রোমো কোড পাওয়া যায়। আপনার পছন্দের গেমের নাম লিখে পাঠান!";
            await sendSingleMessage(chatId, replyText, null, null);
            return;
        }

        // ২. যদি ইউজার অফিশিয়াল কোম্পানির কোনো বৈধ গেমের নাম পাঠায়
        if (aiResult.startsWith("MATCHED_GAME:")) {
            let matchedGameName = aiResult.replace("MATCHED_GAME:", "").trim();
            if (OFFICIAL_COMPANY_GAMES.includes(matchedGameName)) {
                let foundPost = postDatabase.all_posts.find(p => {
                    let firstLine = p.text.split('\n')[0].replace(/<[^>]*>/g, '').trim();
                    return firstLine.toLowerCase() === matchedGameName.toLowerCase() || p.rawText.toLowerCase().includes(matchedGameName.toLowerCase());
                });

                if (foundPost) {
                    // ডাটাবেসে পোস্ট বা প্রমো কোড থাকলে সরাসরি সেটি পাঠিয়ে দেবে
                    await sendSingleMessage(chatId, foundPost.text, foundPost.photo, foundPost.replyMarkup);
                    return;
                } else {
                    // পোস্ট না থাকলে আকর্ষণীয়ভাবে জানাবে যে এটি আমাদের কোম্পানির নিজস্ব গেম
                    const gameFoundPrompt = `You are the official AI of Yono Master Gaming. The user mentioned our official company game: "${matchedGameName}".
Rules:
- Reply in the exact same language and script as the user query ("${queryText}").
- Enthusiastically and proudly confirm that "${matchedGameName}" is our very own official and exclusive company game at Yono Master Gaming.
- Invite them to play and grab VIP bonuses/promo codes.
- Keep it natural, engaging, and realistic (1-2 sentences).`;

                    const gameComp = await groq.chat.completions.create({
                        messages: [{ role: "user", content: gameFoundPrompt }],
                        model: "llama-3.3-70b-versatile",
                    });
                    let gameReply = gameComp.choices[0]?.message?.content || `অসাধারণ পছন্দ! ${matchedGameName} হলো আমাদের নিজস্ব Yono Master Gaming কোম্পানির একটি এক্সক্লুসিভ ও অফিশিয়াল গেম! এখানে খেলে আপনি পেতে পারেন দারুণ ভিআইপি বোনাস ও প্রোমো কোড।`;
                    await sendSingleMessage(chatId, gameReply, null, null);
                    return;
                }
            }
        }

        // ৩. যদি ইউজার ভুংভাং, অলিক বা অন্য কোনো কোম্পানির গেমের নাম পাঠায় অথবা সাধারণ কথা বলে
        const generalPrompt = `You are the intelligent official AI assistant for **Yono Master Gaming**.
User input: "${queryText}"

Rules:
1. **STRICT LANGUAGE & SCRIPT MIRRORING**: Detect the user's language and script and reply in the exact same language.
2. **INVALID / FAKE GAMES**: If the user mentioned a game name that is NOT one of our official company games (e.g. fake names, unlisted games, competitor games), clearly, politely, and naturally inform them that **this is not our company's game**, and that Yono Master Gaming only features our own exclusive official games and promo codes. Ask them to send a valid game name from our platform.
3. **GENERAL CHAT**: If it's a casual greeting, reply warmly and briefly (1-2 sentences) maintaining the Yono Master Gaming branding.`;

        const generalComp = await groq.chat.completions.create({
            messages: [
                { role: "system", content: getSystemPrompt() },
                { role: "user", content: generalPrompt }
            ],
            model: "llama-3.3-70b-versatile",
        });

        let aiReply = generalComp.choices[0]?.message?.content || "এটি আমাদের কোম্পানির কোনো গেম নয়। Yono Master Gaming-এ শুধুমাত্র আমাদের নিজস্ব এক্সক্লুসিভ গেম ও প্রোমো কোড পাওয়া যায়। সঠিক গেমের নাম লিখে পাঠান!";
        await sendSingleMessage(chatId, aiReply, null, null);

    } catch (aiErr) {
        console.error("Groq AI Error:", aiErr.message);
        let fallbackMessage = "Yono Master Gaming-এ আপনাকে স্বাগতম! আপনার পছন্দের অফিশিয়াল গেমের নামটি লিখে পাঠান।";
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
            await sendSingleMessage(chatId, "আপনার ভয়েস মেসেজটি পরিষ্কার বুঝতে পারিনি। দয়া করে গেমের নামটি লিখে পাঠান।", null, null);
        }
    } catch (e) {
        console.error("Voice transcription error:", e);
        await sendSingleMessage(chatId, "দুঃখিত, ভয়েস প্রসেস করা যায়নি। দয়া করে গেমের নামটি লিখে পাঠান।", null, null);
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
                `👑 হ্যালো আমার প্রিয় বন্ধু! আমি <b>Yono Master Gaming</b>-এর অফিশিয়াল ও স্মার্ট এআই অ্যাসিস্ট্যান্ট। আমাদের নিজস্ব এক্সক্লুসিভ গেমগুলোর ভিআইপি বোনাস ও প্রোমো কোড পেতে আপনার পছন্দের গেমের নামটি এখনই আমাকে পাঠান!\n\n` +
                upcomingText +
                `🎮 চলুন শুরু করা যাক!`;
            
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
    `👑 <b>হ্যালো আমার মিষ্টি বন্ধু!</b>\n\n` +
    `আমাদের <b>Yono Master Gaming</b> কোম্পানির চমৎকার সব এক্সক্লুসিভ গেমের ভিআইপি বোনাস আপনার জন্য অপেক্ষা করছে। 💰\n\n` +
    `🔥 <b>এখনই যা করবেন:</b>\n` +
    `• 🎮 আমাদের প্ল্যাটফর্মের যেকোনো সঠিক গেমের নাম লিখে পাঠান!\n` +
    `• 💎 ইনস্ট্যান্ট ভিআইপি প্রোমো কোড এবং ডাউনলোড লিংক সংগ্রহ করুন!\n\n` +
    `👑 <i>আজই চ্যাট করুন এবং আপনার ফ্রি বোনাস লুফে নিন! 🚀</i>`;

cron.schedule('0 10 * * 0', () => {
    if (botUsers && botUsers.length > 0) {
        botUsers.forEach((userId, index) => {
            setTimeout(() => {
                sendSingleMessage(userId, weeklyMessage, null, null);
            }, index * 50); 
        });
    }
});

console.log("Yono Master Head AI bot running successfully with smart game validation and database post delivery!");
