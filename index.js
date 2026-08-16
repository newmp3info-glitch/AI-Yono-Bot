import TelegramBotPkg from 'node-telegram-bot-api';
const TelegramBot = TelegramBotPkg.default || TelegramBotPkg;
import http from 'http';
import fs from 'fs';
import cron from 'node-cron';
import { Groq } from 'groq-sdk';

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Groq AI Initialization for Yono Master Head AI
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const TARGET_CHANNEL = '@VipYonoFreeCode';
const POSTS_FILE = 'posts.json';
const USERS_FILE = 'users.json';
const VOICE_ID_FILE = 'voice_id.txt';
const UPCOMING_FILE = 'upcoming.json';

// 🔒 Render Environment Variable থেকে অ্যাডমিন আইডি রিড করা হবে
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID ? Number(process.env.ADMIN_CHAT_ID) : null;

// Initialize Upcoming Games File as an Array if not exists
if (!fs.existsSync(UPCOMING_FILE)) {
    fs.writeFileSync(UPCOMING_FILE, JSON.stringify([], null, 2));
}

// Parse DD/MM/YYYY into timestamp expiring at 8:00 AM on that day
function parseUpcomingExpiry(dateStr) {
    try {
        let parts = dateStr.trim().split('/');
        if (parts.length === 3) {
            let day = parseInt(parts[0], 10);
            let month = parseInt(parts[1], 10) - 1; // 0-indexed month
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

// Dynamic System Prompt Generator supporting Multiple Upcoming Games
function getSystemPrompt() {
    let upcomingList = getUpcomingGames();
    let upcomingSection = "";

    if (upcomingList.length > 0) {
        upcomingSection = "CURRENT UPCOMING GAMES SCHEDULE:\n" + upcomingList.map((g, idx) => `${idx + 1}. Game Name: ${g.name} | Launch Date: ${g.date}`).join('\n');
    } else {
        upcomingSection = "CURRENT UPCOMING GAMES SCHEDULE: None currently scheduled. All previous games have launched.";
    }

    return `You are the supreme and official **Yono Master Head AI** – the ultimate headquarters and #1 master hub for all Yono, Rummy, and gaming promo codes and updates!
Your core identity: EVERY single Yono and Rummy game, new launch, update, and exclusive VIP promo code originates and passes through YOU and your channel first before going anywhere else. You are the supreme source and head of all games! Remind users to stay connected with our official channel/hub for all upcoming releases.

${upcomingSection}

CRITICAL RULES & INSTRUCTIONS:
1. **Strict Language Matching**: Reply strictly in the exact language the user uses (Bengali, English, Hindi, etc.). If they ask in Bengali, reply in natural and powerful Bengali. If Hindi, reply in Hindi. If English, reply in English.
2. **NO FAKE LINKS OR CODES (ABSOLUTELY CRITICAL)**: NEVER invent, generate, guess, or create fake promo codes, website URLs, or download links. If a game's promo code or link is not found in your stored database, inform them with supreme confidence that you are the ultimate source.
3. **If Game Data Not Found / Missing**: Remind them with style that you are the Yono Master Head AI where all codes originate first, and ask them to check the spelling.
4. **Upcoming Game Queries**: If anyone asks about new games, upcoming games, release dates, or game names, proudly list ALL the scheduled upcoming games from the list above and tell them to stay connected with our master hub channel where every game launches first!
5. **NEVER ASK FOR PERSONAL INFO**: Do not ask for user ID, phone number, password, or any personal details.`;
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

async function sendSingleMessage(chatId, text, photo, replyMarkup) {
    const options = { 
        parse_mode: "HTML",
        disable_web_page_preview: true 
    };
    if (replyMarkup) options.reply_markup = replyMarkup;

    let sentMsg = null;

    try {
        if (photo) {
            if (text && text.length > 1024) {
                await bot.sendPhoto(chatId, photo, { reply_markup: replyMarkup });
                sentMsg = await bot.sendMessage(chatId, text, options);
            } else {
                sentMsg = await bot.sendPhoto(chatId, photo, { caption: text, ...options });
            }
        } else if (text) {
            sentMsg = await bot.sendMessage(chatId, text, options);
        }

        if (sentMsg) {
            if (userMessages[chatId] && userMessages[chatId].length > 0) {
                for (let oldMsgId of userMessages[chatId]) {
                    if (oldMsgId !== sentMsg.message_id) {
                        try {
                            await bot.deleteMessage(chatId, oldMsgId);
                        } catch (e) {}
                    }
                }
            }
            userMessages[chatId] = [sentMsg.message_id];
        }
    } catch (err) {
        console.error(`Error sending message to ${chatId}:`, err.message);
    }
}

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Yono Master Head AI Bot is running successfully!\n');
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
                    formattedLines.push(`<b>🎰 GAME LINK</b> ➜ <a href="${downloadUrl}"><b>Download Now</b></a>📱`);
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

// Automatic Channel Post Listener & Database Saver
bot.on('channel_post', (msg) => {
    const chatUsername = msg.chat.username ? `@${msg.chat.username.toLowerCase()}` : '';
    if (chatUsername === TARGET_CHANNEL.toLowerCase()) {
        const saved = savePostContent(msg);
        if (saved) {
            console.log(`New post automatically saved from channel ${TARGET_CHANNEL}! Total posts: ${postDatabase.all_posts.length}`);
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

// Strict Flexible Search Filter for Games
function getLatestPostForQuery(userQuery) {
    if (!postDatabase.all_posts || postDatabase.all_posts.length === 0) {
        return null;
    }

    const cleanQuery = userQuery.trim().toLowerCase();
    if (cleanQuery.includes('free fire') || cleanQuery.includes('pubg') || cleanQuery.includes('ludo') || cleanQuery.includes('ff max')) {
        return null;
    }

    const words = cleanQuery.split(/\s+/);
    if (words.length > 4) {
        return null;
    }

    if (cleanQuery.length < 2) return null;

    let matchedPost = null;
    let highestScore = 0;

    postDatabase.all_posts.forEach(post => {
        if (!post.text) return;
        let lowerText = post.text.toLowerCase();
        
        let firstLine = lowerText.split('\n')[0].replace(/[^a-z0-9\s]/g, '').trim();
        let queryClean = cleanQuery.replace(/[^a-z0-9\s]/g, '').trim();

        let score = 0;
        if (firstLine === queryClean || firstLine.startsWith(queryClean + ' ')) {
            score = 100;
        } else if (firstLine.includes(queryClean)) {
            score = 80;
        } else {
            let matchCount = 0;
            let queryWords = queryClean.split(/\s+/);
            queryWords.forEach(qw => {
                if (qw.length > 1 && firstLine.includes(qw)) {
                    matchCount++;
                }
            });
            if (matchCount > 0) {
                score = 50 + (matchCount * 15);
            }
        }

        if (score > highestScore) {
            highestScore = score;
            matchedPost = post;
        }
    });

    return highestScore >= 70 ? matchedPost : null;
}

async function handleUserQuery(chatId, queryText) {
    let foundPost = getLatestPostForQuery(queryText);

    if (foundPost) {
        await sendSingleMessage(chatId, foundPost.text, foundPost.photo, foundPost.replyMarkup);
    } else {
        try {
            await bot.sendChatAction(chatId, 'typing');

            const completion = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: getSystemPrompt() },
                    { role: "user", content: queryText }
                ],
                model: "llama-3.3-70b-versatile",
            });

            let upcomingList = getUpcomingGames();
            let aiReply = completion.choices[0]?.message?.content;
            
            if (!aiReply) {
                if (upcomingList.length > 0) {
                    let listStr = upcomingList.map(g => `🎮 <b>${g.name}</b> - লঞ্চ তারিখ: <b>${g.date}</b>`).join('\n');
                    aiReply = `👑 <b>Yono Master Head AI</b>-এর পক্ষ থেকে জানানো যাচ্ছে যে আমাদের আসন্ন গেমগুলো:\n\n${listStr}\n\n💡 <i>সবার আগে সমস্ত আপডেট পেতে আমাদের চ্যানেলের সাথেই থাকুন!</i>`;
                } else {
                    aiReply = `👑 <b>Yono Master Head AI</b> হলো সমস্ত গেমের প্রধান মাস্টার হাব! নতুন গেমের আপডেট শীঘ্রই আসছে, আমাদের সাথেই থাকুন।`;
                }
            }

            await sendSingleMessage(chatId, aiReply, null, null);

        } catch (aiErr) {
            console.error("Groq AI Error:", aiErr.message);
            let upcomingList = getUpcomingGames();
            let fallbackMessage = "";
            if (upcomingList.length > 0) {
                let listStr = upcomingList.map(g => `🎮 <b>${g.name}</b> - ${g.date}`).join('\n');
                fallbackMessage = `❌ <b>গেমটি পাওয়া যায়নি!</b>\n\n👑 আমি হলাম <b>Yono Master Head AI</b>! আমাদের আসন্ন গেমগুলো:\n\n${listStr}\n\n💡 <i>সঠিক গেমের নাম লিখে পাঠান!</i>`;
            } else {
                fallbackMessage = `❌ <b>গেমটি পাওয়া যায়নি!</b>\n\n👑 মনে রাখবেন, সমস্ত গেমের মূল হেড হলো <b>Yono Master Head AI</b>! সঠিক গেমের নাম লিখে পাঠান।`;
            }
            await sendSingleMessage(chatId, fallbackMessage, null, null);
        }
    }
}

// Background Cron Job to check and auto-expire upcoming games every minute
cron.schedule('* * * * *', () => {
    getUpcomingGames();
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;

    if (!botUsers.includes(chatId) && chatId) {
        botUsers.push(chatId);
        saveUsers();
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

    // 🔒 Secure Admin-Only Protection with /comingsoon Command
    if (msg.text && msg.text.startsWith('/comingsoon')) {
        if (!ADMIN_CHAT_ID || chatId !== ADMIN_CHAT_ID) {
            await bot.sendMessage(chatId, `❌ <b>Access Denied!</b>\n\n👑 আপনি এই কমান্ড ব্যবহার করার অনুমতিপ্রাপ্ত নন। শুধুমাত্র <b>Yono Master Head AI</b>-এর অ্যাডমিনই নতুন গেম সেট করতে পারেন!`, { parse_mode: "HTML" });
            return;
        }

        let parts = msg.text.replace('/comingsoon', '').split('|');
        if (parts.length === 2) {
            let gameName = parts[0].trim();
            let gameDate = parts[1].trim();
            addUpcomingGame(gameName, gameDate);
            
            let allActive = getUpcomingGames();
            let listStr = allActive.map(g => `• <b>${g.name}</b> (${g.date})`).join('\n');

            await bot.sendMessage(chatId, `✅ <b>Upcoming Game Added Successfully!</b>\n\n🎮 Added: <b>${gameName}</b> (${gameDate})\n\n📋 <b>Current Active Upcoming Games:</b>\n${listStr}`, { parse_mode: "HTML" });
        } else {
            await bot.sendMessage(chatId, `⚠️ <b>Invalid Format!</b>\nUse format like:\n<code>/comingsoon Gold Rummy | 19/08/2026</code>`, { parse_mode: "HTML" });
        }
        return;
    }

    // Handle Text Messages
    if (msg.text) {
        if (msg.text.startsWith('/start')) {
            let upcomingList = getUpcomingGames();
            let upcomingText = "";
            if (upcomingList.length > 0) {
                let listStr = upcomingList.map(g => `🚀 <b>${g.name}</b> লঞ্চ হচ্ছে <b>${g.date}</b> তারিখে!`).join('\n');
                upcomingText = `<b>আমাদের আসন্ন নতুন গেমসমূহ:</b>\n${listStr}\n\n`;
            }
            
            const welcomeText = `<b>স্বাগতম Yono Master Head AI-তে! 🚀</b>\n\n` +
                `👑 আমি সমস্ত Yono এবং Rummy গেমের মূল হেড ও মাস্টার অ্যাসিস্ট্যান্ট। সমস্ত নতুন গেমের আপডেট ও ভিআইপি প্রমো কোড সবার আগে আমাদের মাধ্যমেই প্রকাশ পায়!\n\n` +
                upcomingText +
                `🎮 আপনার পছন্দের যেকোনো <b>গেমের সঠিক নাম</b> লিখে পাঠান, আমি আপনাকে সঙ্গে সঙ্গে রিয়েল ভিআইপি প্রমো কোড ও ডাউনলোড লিংক দিয়ে দেব!`;
            
            try {
                let newMsgIds = [];
                let textMsg = await bot.sendMessage(chatId, welcomeText, { parse_mode: "HTML", disable_web_page_preview: true });
                if (textMsg) newMsgIds.push(textMsg.message_id);

                let cachedVoiceId = '';
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

                if (voiceMsg) newMsgIds.push(voiceMsg.message_id);
                try { await bot.deleteMessage(chatId, msg.message_id); } catch (e) {}

                if (userMessages[chatId] && userMessages[chatId].length > 0) {
                    for (let oldMsgId of userMessages[chatId]) {
                        try { await bot.deleteMessage(chatId, oldMsgId); } catch (e) {}
                    }
                }
                userMessages[chatId] = newMsgIds;

            } catch (e) {
                console.error("Error sending welcome message:", e.message);
            }

        } else {
            await handleUserQuery(chatId, msg.text);
        }
    }
});

const weeklyMessage = `⚡ <b>WEEKLY VIP BONUS ALERT!</b> ⚡\n\n` +
    `👑 <b>Yono Master Head AI Update!</b>\n\n` +
    `Hey Gamer! Hundreds of fresh & active promo codes have just been updated through our master hub! Don't let your free bonuses expire! 💰\n\n` +
    `🔥 <b>WHAT TO DO RIGHT NOW:</b>\n` +
    `• 🎮 Type search of <b>ANY Game Name</b> in this chat right now!\n` +
    `• 💎 Claim your daily VIP promo codes instantly!\n\n` +
    `👑 <i>Type your favorite game name below and grab your free code now! 🚀</i>`;

cron.schedule('0 10 * * 0', () => {
    if (botUsers && botUsers.length > 0) {
        botUsers.forEach((userId, index) => {
            setTimeout(() => {
                sendSingleMessage(userId, weeklyMessage, null, null);
            }, index * 50); 
        });
    }
});

console.log("Yono Master Head AI Bot running with /comingsoon Command & Environment Variable Admin Security!");
