/* 
 *  @name       EvoBotz Base Bot
 *  @developer  LevviCode
 *  @telegram   t.me/lepicode
 *  @copyright  Copyright © 2026 LevviCode
 *
 *  ───────────────────────── LICENSE ─────────────────────────
 *
 *  PERMITTED:
 *  ✓ Personal use
 *  ✓ Modification and customization
 *  ✓ Bug fixing and recoding
 *  ✓ Adding new features
 *  ✓ Running your own bot
 *  ✓ Paid bot running / hosting services
 *  ✓ Paid panel services
 *  ✓ Paid installation / setup services
 *
 *  COMMERCIAL RESTRICTIONS:
 *  ✗ You may NOT sell this source code.
 *  ✗ You may NOT sell modified versions of this source code.
 *  ✗ You may NOT redistribute this source code for payment.
 *  ✗ You may NOT include this source in a paid/premium base
 *    or source-code package.
 *  ✗ You may NOT rent, license, or sublicense the source code
 *    itself to third parties.
 *  ✗ You may NOT encrypt, obfuscate, rebrand, or modify the
 *    source for the purpose of reselling it as your own.
 *
 *  SERVICE EXCEPTION:
 *  Charging for services that use or operate this source
 *  (such as bot hosting, running, panel, installation, or setup)
 *  is allowed, provided that the source code itself is not
 *  sold, redistributed, sublicensed, or provided as a product.
 *
 *  CREDIT:
 *  The original LevviCode credit must remain intact.
 *  Modifications do not transfer ownership of the original source.
 *
 *  DISCLAIMER:
 *  This software is provided "AS IS", without warranty of any kind.
 *
 *  VIOLATION:
 *  Violations may result in termination of permission to use,
 *  loss of updates/support, and further action under applicable law.
 *
 *  By using this source code, you acknowledge and agree to these terms.
 *
 *  © 2026 LevviCode — All Rights Reserved.
 */

const baileys = require('@whiskeysockets/baileys')

const {
    default: makeWASocket,
    proto,
    generateWAMessageFromContent,
    generateWAMessage,
    generateWAMessageContent,
    prepareWAMessageMedia,
    downloadContentFromMessage,
    downloadAndSaveMediaMessage,
    jidNormalizedUser,
    getContentType,
    fetchLatestBaileysVersion,
    useSingleFileAuthState,
    makeInMemoryStore,
    DisconnectReason,
    Browsers
} = baileys

const os = require('os');
const util = require('util');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { fromBuffer: fileTypeFromBuffer } = require('file-type');
const { writeExif } = require('./lib/StickerMaker.js');
const { qLive } = require('./lib/myfunc.js');

async function getQuotedDocumentBuffer(msg) {
    if (!msg?.quoted) return null

    let content = msg.quoted.message || msg.quoted.msg || msg.quoted
    if (!content) return null

    const unwrap = (obj) => {
        if (!obj || typeof obj !== 'object') return null

        if (obj.documentMessage) return obj.documentMessage

        if (obj.mtype === 'documentMessage' && obj.url) return obj
        if (obj.mtype === 'documentMessage' && obj.fileSha256) return obj
        if (obj.mtype === 'documentMessage' && obj.mimetype) return obj

        if (obj.viewOnceMessage?.message) return unwrap(obj.viewOnceMessage.message)
        if (obj.viewOnceMessageV2?.message) return unwrap(obj.viewOnceMessageV2.message)
        if (obj.viewOnceMessageV2Extension?.message) return unwrap(obj.viewOnceMessageV2Extension.message)
        if (obj.ephemeralMessage?.message) return unwrap(obj.ephemeralMessage.message)

        return null
    }

    const document = unwrap(content)
    if (!document) return null

    try {
        const stream = await downloadContentFromMessage(document, 'document')
        const chunks = []
        for await (const chunk of stream) chunks.push(chunk)

        return {
            buffer: Buffer.concat(chunks),
            fileName: document.fileName || 'RawMess.js',
            mimetype: document.mimetype || 'application/javascript'
        }
    } catch (e) {
        return null
    }
}


const config = require('./config.json');
const getRuntimeConfig = () => {
    try {
        return JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'))
    } catch {
        return config
    }
};
const ownerPath = path.join(__dirname, 'database', 'owner.json');
const getLimits = () => {
    const cfg = getRuntimeConfig();
    return cfg.limits || {};
};
const premiumPath = path.join(__dirname, 'database', 'premium.json');
const restoreJSON = (value) => {
    if (value === null || value === undefined) return value;
    if (value && typeof value === 'object' && value.type === 'Buffer' && typeof value.data === 'string') {
        return Buffer.from(value.data, 'base64');
    }
    if (value && typeof value === 'object' && value.type === 'Uint8Array' && typeof value.data === 'string') {
        return Uint8Array.from(Buffer.from(value.data, 'base64'));
    }
    if (Array.isArray(value)) return value.map(restoreJSON);
    if (typeof value === 'object') {
        const out = {};
        for (const [key, val] of Object.entries(value)) out[key] = restoreJSON(val);
        return out;
    }
    return value;
};

const readJSON = (file) => {
    try {
        if (!fs.existsSync(file)) fs.writeFileSync(file, '[]');
        return JSON.parse(fs.readFileSync(file));
    } catch {
        return [];
    }
};

const saveJSON = (file, data) => {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

const getNumber = (jid = '') => String(jid).split('@')[0].replace(/\D/g, '');

const isCreator = (m) => {
    const sender = getNumber(m.sender);
    const creator = String(config.ownerNumber || '').replace(/\D/g, '');
    return sender === creator;
};

const isOwner = (m) => {
    const sender = getNumber(m.sender);
    const ownerDB = readJSON(ownerPath);
    const creator = String(config.ownerNumber || '').replace(/\D/g, '');
    return sender === creator || ownerDB.includes(sender);
};

const isPremium = (m) => {
    const sender = getNumber(m.sender);
    const premiumDB = readJSON(premiumPath);
    return isOwner(m) || premiumDB.includes(sender);
};

// System executeEval
const executeEval = async (code, conn, m) => {
    try {
        let result

        if (code.includes('\n') || code.includes(';')) {
            result = await eval(`
                (async (conn, m, require, fs, util) => {
                    ${code}
                })(conn, m, require, fs, util)
            `)
        } else {
            result = await eval(`
                (async (conn, m, require, fs, util) => {
                    return (${code})
                })(conn, m, require, fs, util)
            `)
        }

        if (typeof result !== 'string') {
            result = util.inspect(result, {
                depth: 1
            })
        }

        m.reply(result || 'undefined')
    } catch (e) {
        m.reply(String(e))
    }
}

//System Detect id all Button, id button gapake titik (.)
const extractCommandFromMessage = (m) => {
    let body = '';
    let isButtonResponse = false;
    try {
        if (m.message) {
            if (m.message.conversation) body = m.message.conversation;
            else if (m.message.extendedTextMessage?.text) body = m.message.extendedTextMessage.text;
            else if (m.message.imageMessage?.caption) body = m.message.imageMessage.caption;
            else if (m.message.videoMessage?.caption) body = m.message.videoMessage.caption;
            else if (m.message.documentMessage?.caption) body = m.message.documentMessage.caption;
            else if (m.message.interactiveResponseMessage) {
                const inter = m.message.interactiveResponseMessage;
                if (inter.nativeFlowResponseMessage) {
                    const flow = inter.nativeFlowResponseMessage;
                    if (flow.paramsJson) {
                        try {
                            const params = JSON.parse(flow.paramsJson);
                            body = params.id || params.buttonId || params.rowId || params.index || '';
                        } catch { body = flow.name || ''; }
                    } else body = flow.name || '';
                    isButtonResponse = true;
                } else if (inter.buttonReply) {
                    body = inter.buttonReply.selectedButtonId || '';
                    isButtonResponse = true;
                } else if (inter.singleSelectReply) {
                    body = inter.singleSelectReply.selectedRowId || '';
                    isButtonResponse = true;
                }
            } else if (m.message.templateButtonReplyMessage) {
                body = m.message.templateButtonReplyMessage.selectedId || '';
                isButtonResponse = true;
            } else if (m.message.buttonsResponseMessage) {
                body = m.message.buttonsResponseMessage.selectedButtonId || '';
                isButtonResponse = true;
            }
        }
    } catch (error) {
        console.error('Error parsing message:', error);
    }
    return { body, isButtonResponse };
};




module.exports = async (conn, m) => {
    try {
        const { body, isButtonResponse } = extractCommandFromMessage(m);
        if (!body) return;
        if (body) m.text = body;

        const runtimeConfig = getRuntimeConfig();

        if (runtimeConfig.mode === 'self' && !isOwner(m)) return

        let command = '';
        let args = [];

        if (isButtonResponse) {
            const parts = body.split(/ +/);
            command = parts[0].toLowerCase();
            args = parts.slice(1);
        } else {
            const trimmed = body.trim();

            if (trimmed.startsWith('=>')) {
                if (!isCreator(m)) return m.reply('Perintah eval hanya untuk creator.');
                const evalCode = trimmed.slice(2).trim();
                if (!evalCode) return m.reply('Contoh:\n=> 1+1');
                return await executeEval(evalCode, conn, m);
            }
            if (trimmed.startsWith('$')) {
                if (!isCreator(m)) return m.reply('❌ Perintah shell hanya untuk creator.');
                const shellCmd = trimmed.slice(1).trim();
                if (!shellCmd) return m.reply('Contoh: $ ls -la');
                m.reply('⏳ Menjalankan perintah shell...');
                const shellTimeoutMs = 30000;
                const shellMaxBufferBytes = 5 * 1024 * 1024;
                const shellOutputMaxChars = 2000;
                exec(shellCmd, { timeout: shellTimeoutMs, maxBuffer: shellMaxBufferBytes }, (error, stdout, stderr) => {
                    let output = stdout || stderr || error?.message || '✅ Selesai (tidak ada output)';
                    if (output.length > shellOutputMaxChars) output = output.slice(0, shellOutputMaxChars) + '\n... (output dipotong)';
                    m.reply(`💻 Output:\n${output}`);
                });
                return;
            }
            if (body.startsWith(runtimeConfig.prefix || '.')) {
                const cleanBody = body.slice(1).trim();
                const parts = cleanBody.split(/ +/);
                command = parts[0].toLowerCase();
                args = parts.slice(1);
            } else {
                return;
            }
        }

        const { reply } = m;

       // Self
       
       //Case
 
   switch (command) {

            case 'menu': {
    const now = new Date()

    const dateInfo =
        now.toLocaleDateString('id-ID', {
            timeZone: 'Asia/Jakarta',
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }) +
        ` • ` +
        now.toLocaleTimeString('id-ID', {
            timeZone: 'Asia/Jakarta',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }) +
        ' WIB'

    const uptime = process.uptime()

    const days = Math.floor(uptime / 86400)
    const hours = Math.floor((uptime % 86400) / 3600)
    const minutes = Math.floor((uptime % 3600) / 60)
    const seconds = Math.floor(uptime % 60)

    const ms = Date.now() - (Number(m.messageTimestamp || 0) * 1000)
    const response = String(Math.max(0, ms)).padStart(3, '0')

    const number = getNumber(m.sender)
    const role = isCreator(m)
        ? 'Creator'
        : isOwner(m)
            ? 'Owner'
            : isPremium(m)
                ? 'Premium'
                : 'Free'

    const menuText = `
╭┈〔 𝘽𝙊𝙏 〕
┊ ◈ 𝙉𝙖𝙢𝙚 › EvoBotz Base
┊ ◈ 𝘿𝙚𝙫 › LevviCode
┊ ◈ 𝙏𝙮𝙥𝙚 › Case
┊ ◈ 𝙈𝙤𝙙𝙚 › ${runtimeConfig.mode === 'self' ? 'Self' : 'Public'}
┊ ◈ 𝙉𝙪𝙢𝙗𝙚𝙧 › ${number}
┊ ◈ 𝘼𝙠𝙨𝙚𝙨 𝙍𝙤𝙡𝙚 › ${role}
╰┈┈┈┈┈┈┈┈

╭┈〔 𝙎𝙔𝙎𝙏𝙀𝙈 〕
┊ ◇ 𝙍𝙚𝙨𝙥𝙤𝙣𝙨𝙚 › ${response} ms
┊ ◇ 𝙍𝙪𝙣𝙩𝙞𝙢𝙚  › ${days}d ${hours}h ${minutes}m ${seconds}s
╰┈┈┈┈┈┈┈┈
`

    await conn.sendMessage(m.chat, {
        buttonsMessage: {
            locationMessage: {
                degreesLatitude: 0,
                degreesLongitude: 0,
                name: 'LevviCode',
                address: dateInfo,
                jpegThumbnail: './src/img/menu.jpg'
            },
            contentText: menuText,
            footerText: '© LevviCode',
            buttons: [
                {
                    buttonId: 'list',
                    buttonText: {
                        displayText: ' LIST'
                    },
                    type: 1,
                    nativeFlowInfo: {
                        name: 'single_select',
                        paramsJson: JSON.stringify({
                            title: 'Pilih Menu',
                            sections: [
                                {
                                    title: 'Main Menu',
                                    highlight_label: 'LevviCode',
                                    rows: [
                                        {
                                            header: '',
                                            title: 'Owner',
                                            description: 'Menu Owner',
                                            id: 'owner',
                                            highlight_label: 'NEW'
                                        },
                                        {
                                            header: '',
                                            title: 'All Menu',
                                            description: 'Semua Fitur',
                                            id: 'allmenu',
                                            highlight_label: 'POPULAR'
                                        }
                                    ]
                                }
                            ]
                        })
                    }
                },
                {
                    buttonId: 'owner',
                    buttonText: {
                        displayText: ' OWNER'
                    },
                    type: 1
                }
            ],
            headerType: 6
        }
    })

    break
}

            case 'owner': {
      const RawMess = {
        contactMessage: {
            displayName: 'LevviCode',
            vcard: `BEGIN:VCARD
VERSION:3.0
N:;;;;
FN:LevviCode
TEL;type=Ponsel;waid=6282129490997:+62 821-2949-0997
X-WA-BIZ-NAME:LevviCode
X-WA-LID:75716465037562
END:VCARD`
        },

        messageContextInfo: {
            threadId: [],

            messageSecret: Uint8Array.from(
                Buffer.from(
                    'PJk/Jc8j/MJ+q+QH48EbneUb83z0fwv0enQ75nDPNic=',
                    'base64'
                )
            )
        }
    }

    await conn.relayMessage(m.chat, RawMess, {
        messageId: conn.generateMessageTag()
    })

    break
}


case 'allmenu': {
    const allMenu = `
╭┈〔 𝘽𝘼𝙎𝙄𝘾 〕
┊ ◈ .menu
┊ ◈ .ping
┊ ◈ .owner
╰┈┈┈┈┈┈┈┈

╭┈〔 𝙊𝙒𝙉𝙀𝙍 〕
┊ ◇ .addowner
┊ ◇ .delowner
┊ ◇ .listowner
┊ ◇ .addprem
┊ ◇ .delprem
┊ ◇ .listprem
╰┈┈┈┈┈┈┈┈

╭┈〔 𝙈𝘼𝙉𝘼𝙂𝙀𝙈𝙀𝙉𝙏 〕
┊ ◇ .crm
┊ ◇ .cat
┊ ◇ .run
╰┈┈┈┈┈┈┈┈

╭┈〔 𝘿𝙀𝙑 〕
┊ ◇ .eval
┊ ◇ .exec
╰┈┈┈┈┈┈┈┈

        ⟢ 𝙇𝙀𝙑𝙑𝙄 𝘾𝙊𝘿𝙀
`

    await conn.sendMessage(m.chat, {
        buttonsMessage: {
            locationMessage: {
                degreesLatitude: 0,
                degreesLongitude: 0,
                name: 'LevviCode',
                address: (() => {
                    const now = new Date()

                    const date = now.toLocaleDateString('id-ID', {
                        timeZone: 'Asia/Jakarta',
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                    })

                    const time = now.toLocaleTimeString('id-ID', {
                        timeZone: 'Asia/Jakarta',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    })

                    return `${date} • ${time} WIB`
                })(),
                jpegThumbnail: './src/img/menu.jpg'
            },

            contentText: allMenu,

            footerText: '© LevviCode',

            buttons: [
                {
                    buttonId: 'owner',
                    buttonText: {
                        displayText: ' OWNER'
                    },
                    type: 1
                }
            ],

            headerType: 6
        }
    })

    break
}

            case 'myjid':
                await reply(`JID kamu: ${m.sender}`);
                break;

            case 'ping': {
                const ms = Date.now() - (Number(m.messageTimestamp || 0) * 1000)
                const cpus = os.cpus()
                const totalMem = os.totalmem()
                const freeMem = os.freemem()
                const usedMem = totalMem - freeMem
                const formatGB = bytes => (bytes / 1024 / 1024 / 1024).toFixed(2)
                const formatRuntime = seconds => {
                    const d = Math.floor(seconds / 86400)
                    const h = Math.floor((seconds % 86400) / 3600)
                    const m = Math.floor((seconds % 3600) / 60)
                    return `${d}d ${h}h ${m}m`
                }
                const cpuModel = cpus[0]?.model || 'Unknown'
                const ping = String(Math.max(0, ms)).padStart(3, '0')
                const pingText = [
                    '*Information*',
                    '',
                    `Response : ${ping} ms`,
                    `Runtime Bot : ${formatRuntime(process.uptime())}`,
                    '',
                    '*Server*',
                    `CPU Core : ${cpus.length} Core`,
                    `Processor : ${cpuModel.substring(0, 55)}`,
                    `RAM : ${formatGB(usedMem)} GB / ${formatGB(totalMem)} GB`,
                    `Free RAM : ${formatGB(freeMem)} GB`,
                    `OS : ${os.platform()} ${os.arch()}`,
                    `Hostname : ${os.hostname()}`,
                    `Runtime VPS : ${formatRuntime(os.uptime())}`
                ].join('\n')

                await conn.sendMessage(m.chat, {
                    text: pingText
                }, {
                    quoted: qLive()
                })
                break
            }

            case 'info': {  
                await reply(`INFO PESAN\n\nJID Pengirim: ${m.sender}\nJID Chat: ${m.chat}\nGrup: ${m.isGroup ? 'Ya' : 'Tidak'}\nDari Bot: ${m.fromMe ? 'Ya' : 'Tidak'}\nID Pesan: ${m.id || '-'}\nTeks: ${m.text || '-'}`);
                break;
            }

            case 'sticker':
            case 's': {
                if (!m.quoted && !args[0]) return reply('Reply gambar/video atau kirim URL dengan .sticker <url>');
                let mediaBuffer;
                if (m.quoted && (m.quoted.mtype === 'imageMessage' || m.quoted.mtype === 'videoMessage')) {
                    mediaBuffer = await m.quoted.download();
                } else if (args[0] && args[0].match(/https?:\/\//)) {
                    const res = await fetch(args[0]);
                    mediaBuffer = Buffer.from(await res.arrayBuffer());
                } else return reply('Format tidak dikenal. Reply media atau kirim URL.');
                if (!mediaBuffer) return reply('Gagal mengambil media.');
                const type = await fileTypeFromBuffer(mediaBuffer);
                if (!type || (!/image/.test(type.mime) && !/video/.test(type.mime))) return reply('Hanya gambar atau video yang didukung.');
                await reply('Membuat stiker...');
                try {
                    const stickerBuffer = await writeExif(mediaBuffer, { packname: 'Sticker Bot', author: 'LevviCode', cropToSquare: false });
                    await conn.sendMessage(m.chat, { sticker: stickerBuffer }, { quoted: m });
                } catch (err) {
                    console.error(err);
                    await reply('Gagal membuat stiker: ' + err.message);
                }
                break;
            }

            case 'addowner': {
                if (!isCreator(m)) return reply('Khusus creator');
                let target = args[0];
                if (m.mentionedJid?.[0]) target = m.mentionedJid[0];
                if (!target) return reply('Contoh: .addowner 628xxx');
                const ownerDB = readJSON(ownerPath);
                const num = getNumber(target);
                if (ownerDB.includes(num)) return reply('Sudah jadi owner');
                ownerDB.push(num);
                saveJSON(ownerPath, ownerDB);
                reply(`Berhasil add owner\n${num}`);
                break;
            }

            case 'delowner': {
                if (!isCreator(m)) return reply('Khusus creator');
                let target = args[0];
                if (m.mentionedJid?.[0]) target = m.mentionedJid[0];
                if (!target) return reply('Contoh: .delowner 628xxx');
                const ownerDB = readJSON(ownerPath);
                const num = getNumber(target);
                const filtered = ownerDB.filter(v => v !== num);
                saveJSON(ownerPath, filtered);
                reply(`Berhasil del owner\n${num}`);
                break;
            }

            case 'listowner':
            case 'ownerlist': {
                if (!isOwner(m)) return reply('Khusus owner');
                const ownerDB = readJSON(ownerPath).filter(Boolean);
                const creator = String(config.ownerNumber || '').replace(/\D/g, '');
                const lines = ownerDB.length
                    ? ownerDB.map((num, i) => `${i + 1}. ${num}`).join('\n')
                    : 'Belum ada owner tambahan.';
                await reply(`👑 *DAFTAR OWNER*\n\nCreator: ${creator}\n\n${lines}`);
                break;
            }

            case 'addprem': {
                if (!isOwner(m)) return reply('Khusus owner');
                let target = args[0];
                if (m.mentionedJid?.[0]) target = m.mentionedJid[0];
                if (!target) return reply('Contoh: .addprem 628xxx');
                const premiumDB = readJSON(premiumPath);
                const num = getNumber(target);
                if (premiumDB.includes(num)) return reply('Sudah premium');
                premiumDB.push(num);
                saveJSON(premiumPath, premiumDB);
                reply(`Berhasil add premium\n${num}`);
                break;
            }

            case 'delprem': {
                if (!isOwner(m)) return reply('Khusus owner');
                let target = args[0];
                if (m.mentionedJid?.[0]) target = m.mentionedJid[0];
                if (!target) return reply('Contoh: .delprem 628xxx');
                const premiumDB = readJSON(premiumPath);
                const num = getNumber(target);
                const filtered = premiumDB.filter(v => v !== num);
                saveJSON(premiumPath, filtered);
                reply(`Berhasil del premium\n${num}`);
                break;
            }

            case 'listprem':
            case 'premlist': {
                if (!isOwner(m)) return reply('Khusus owner');
                const premiumDB = readJSON(premiumPath).filter(Boolean);
                const lines = premiumDB.length
                    ? premiumDB.map((num, i) => `${i + 1}. ${num}`).join('\n')
                    : 'Belum ada premium.';
                await reply(`💎 *DAFTAR PREMIUM*\n\n${lines}`);
                break;
            }

            case 'crm': {
                if (!isOwner(m)) return reply('Khusus owner');
                if (!conn.crm?.handleCRM) return reply('CRM belum siap.')
                await conn.crm.handleCRM(conn, m, args)
                break
            }

            case 'run': {
                if (!isOwner(m)) return reply('Khusus owner / creator')

                let code
                let sourceName

                const quotedFile = await getQuotedDocumentBuffer(m)
                if (!quotedFile && !args[0]) return
                if (quotedFile) {
                    code = quotedFile.buffer.toString('utf8')
                    sourceName = quotedFile.fileName
                } else {
                    const requested = String(args[0] || '').trim().replace(/[^a-zA-Z0-9_.-]/g, '')
                    let filePath

                    if (requested) {
                        const fileName = requested.endsWith('.js') ? requested : `${requested}.js`
                        filePath = path.join(__dirname, fileName)
                    } else {
                        const files = fs.readdirSync(__dirname)
                            .filter(v => v.endsWith('.js') && !['index.js', 'Levvi.js'].includes(v))
                        if (!files.length) return reply('File type mess belum dibuat. Gunakan .crm dengan reply pesan.')
                        filePath = path.join(__dirname, files[files.length - 1])
                    }

                    if (!fs.existsSync(filePath)) return reply('File type mess tidak ditemukan.')
                    code = fs.readFileSync(filePath, 'utf8')
                    sourceName = path.basename(filePath)
                }

                try {
                    const result = await eval(`(async (conn, m, require, fs, util) => { ${code} })(conn, m, require, fs, util)`)
                    if (result !== undefined) {
                        await reply(typeof result === 'string'
                            ? result
                            : util.inspect(result, { depth: 2 }))
                    } else {
                        await reply(`${sourceName} berhasil dijalankan.`)
                    }
                } catch (e) {
                    await reply(String(e))
                }
                break
            }

            case 'cat': {
                if (!isOwner(m)) return reply('Khusus owner / creator')

                const isSnip = args.some(v => String(v).toLowerCase() === '-snip')
                const cleanArgs = args.filter(v => String(v).toLowerCase() !== '-snip')
                const quotedFile = await getQuotedDocumentBuffer(m)
                let content
                let sourceName

                if (quotedFile) {
                    content = quotedFile.buffer.toString('utf8')
                    sourceName = quotedFile.fileName || 'RawMess.js'
                } else {
                    const requested = String(cleanArgs[0] || '').trim().replace(/[^a-zA-Z0-9_.-]/g, '')
                    let filePath

                    if (requested) {
                        const fileName = requested.endsWith('.js') ? requested : `${requested}.js`
                        filePath = path.join(__dirname, fileName)
                    } else {
                        const files = fs.readdirSync(__dirname)
                            .filter(v => v.endsWith('.js') && !['index.js', 'Levvi.js'].includes(v))
                        if (!files.length) return reply('File tidak ditemukan.')
                        filePath = path.join(__dirname, files[files.length - 1])
                    }

                    if (!fs.existsSync(filePath)) return reply('File tidak ditemukan.')
                    content = fs.readFileSync(filePath, 'utf8')
                    sourceName = path.basename(filePath)
                }

                if (isSnip) {
                    await conn.sendMessage(m.chat, {
                        richMessage: {
                            editrich:{
                            title: 'CAT - SNIP',
                            text: `File : ${sourceName}`,
                            code: {
                                language: 'javascript',
                                code: content
                            }
                           } 
                        }
                    }, { quoted: m })
                    break
                }

                return reply(content)
            }

            case 'eval': {
                if (!isCreator(m)) return reply('Khusus creator');
                const code = args.join(' ');
                if (!code) return reply('Contoh:\n.eval 1+1');
                await executeEval(code, conn, m);
                break;
            }
            
           case 'public': {
    if (!isOwner(m)) return reply('Khusus owner')

    runtimeConfig.mode = 'public'
    config.mode = 'public'
    fs.writeFileSync(path.join(__dirname, 'config.json'), JSON.stringify(runtimeConfig, null, 2))

    reply('Berhasil ganti mode ke public')
}
           break

           case 'self': {
    if (!isOwner(m)) return reply('Khusus owner')

    runtimeConfig.mode = 'self'
    config.mode = 'self'
    fs.writeFileSync(path.join(__dirname, 'config.json'), JSON.stringify(runtimeConfig, null, 2))

    reply('Berhasil ganti mode ke self')
}
           break
           
        
            default:
                break;
        }
    } catch (err) {
        console.error('Error in command handler:', err);
    }
};