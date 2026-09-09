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
const path = require('path')
const fs = require('fs')
const { fileTypeFromBuffer } = require('file-type')
const {
    default: _makeWaSocket,
    proto,
    downloadContentFromMessage,
} = require('@whiskeysockets/baileys')
const { qLive } = require('./myfunc.js')

function makeWASocket(connectionOptions, options = {}) {
    let conn = _makeWaSocket(connectionOptions)

    const rawGroupMetadata = typeof conn.groupMetadata === 'function'
        ? conn.groupMetadata.bind(conn)
        : null
    const groupMetadataCache = new Map()
    const groupMetadataInflight = new Map()
    const botConfig = (() => {
        try { return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config.json'), 'utf8')) } catch { return {} }
    })()
    const GROUP_METADATA_CACHE_MS = 10 * 60 * 1000

    conn.clearGroupMetadataCache = jid => {
        if (!jid) return
        groupMetadataCache.delete(jid)
    }

    if (rawGroupMetadata) {
        conn.groupMetadata = async jid => {
            if (!jid || !jid.endsWith('@g.us')) return rawGroupMetadata(jid)

            const now = Date.now()
            const cached = groupMetadataCache.get(jid)
            if (cached && cached.expires > now) return cached.metadata

            const pending = groupMetadataInflight.get(jid)
            if (pending) return pending

            const request = rawGroupMetadata(jid)
                .then(metadata => {
                    if (metadata) {
                        groupMetadataCache.set(jid, {
                            metadata,
                            expires: Date.now() + GROUP_METADATA_CACHE_MS
                        })
                    }
                    return metadata
                })
                .finally(() => {
                    groupMetadataInflight.delete(jid)
                })

            groupMetadataInflight.set(jid, request)
            return request
        }
    }

    conn.decodeJid = (jid) => {
        if (!jid || typeof jid !== 'string') return jid
        jid = jid.trim()
        if (/^\d+$/.test(jid)) return jid + '@s.whatsapp.net'
        const at = jid.lastIndexOf('@')
        if (at < 1) return jid
        const user = jid.slice(0, at)
        const server = jid.slice(at + 1).toLowerCase()
        if (server === 's.whatsapp.net' || server === 'lid' || server === 'g.us' || server === 'broadcast') {
            return user + '@' + server
        }
        const colon = user.indexOf(':')
        if (colon > 0) return user.slice(0, colon) + '@' + server
        return user + '@' + server
    }

    conn.sameJid = (a, b) => {
        if (!a || !b) return false
        return conn.decodeJid(a) === conn.decodeJid(b)
    }

    conn.resolveSenderJid = async (jid, chatJid) => {
        const fallback = typeof jid === 'string' && jid ? conn.decodeJid(jid) : ''
        if (!fallback) return ''

        if (fallback.endsWith('@lid')) {
            const resolved = await conn.resolveLidEnhanced(fallback, chatJid)
            return resolved || fallback
        }

        return fallback
    }

    conn.reply = (jid, text, m, options = {}) => {
        return conn.sendMessage(jid, { text: text }, {
            ...options,
            quoted: qLive()
        })
    }

    conn.getFile = async (PATH, saveToFile = false) => {
        let res, filename
        const data = Buffer.isBuffer(PATH)
            ? PATH
            : PATH instanceof ArrayBuffer
                ? Buffer.from(PATH)
                : /^data:.*?\/.*?;base64,/i.test(PATH)
                    ? Buffer.from(PATH.split`,`[1], 'base64')
                    : /^https?:\/\//.test(PATH)
                        ? (res = await fetch(PATH), Buffer.from(await res.arrayBuffer()))
                        : fs.existsSync(PATH)
                            ? (filename = PATH, fs.readFileSync(PATH))
                            : typeof PATH === 'string'
                                ? Buffer.from(PATH)
                                : Buffer.alloc(0)
        if (!Buffer.isBuffer(data)) throw new TypeError('Result is not a buffer')
        const type = await fileTypeFromBuffer(data) || { mime: 'application/octet-stream', ext: '.bin' }
        if (data && saveToFile && !filename) {
            const tmpDir = './tmp'
            if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir)
            filename = path.join(tmpDir, `${Date.now()}.${type.ext}`)
            fs.writeFileSync(filename, data)
        }
        return {
            res,
            filename,
            ...type,
            data,
            deleteFile() {
                return filename && fs.unlinkSync(filename)
            }
        }
    }

    conn.sendFile = async (jid, path, filename = '', caption = '', quoted, ptt = false, options = {}) => {
        let type = await conn.getFile(path, true)
        let { res, data: file, filename: pathFile } = type
        if (res?.status !== 200 || file.length <= 65536) {
            try { throw { json: JSON.parse(file.toString()) } }
            catch (e) { if (e.json) throw e.json }
        }
        const fileSize = fs.statSync(pathFile).size / 1024 / 1024
        if (fileSize >= 100) throw new Error('File size is too big!')
        let opt = {}
        if (quoted) opt.quoted = quoted
        if (!type) options.asDocument = true
        let mtype = '', mimetype = options.mimetype || type.mime
        if (/webp/.test(type.mime) || (/image/.test(type.mime) && options.asSticker)) mtype = 'sticker'
        else if (/image/.test(type.mime) || (/webp/.test(type.mime) && options.asImage)) mtype = 'image'
        else if (/video/.test(type.mime)) mtype = 'video'
        else if (/audio/.test(type.mime)) mtype = 'audio'
        else mtype = 'document'
        if (options.asDocument) mtype = 'document'

        let message = {
            ...options,
            caption,
            ptt,
            [mtype]: { url: pathFile },
            mimetype,
            fileName: filename || pathFile.split('/').pop()
        }
        let m
        try {
            m = await conn.sendMessage(jid, message, { ...opt, ...options })
        } catch (e) {
            m = null
        } finally {
            if (!m) m = await conn.sendMessage(jid, { ...message, [mtype]: file }, { ...opt, ...options })
            return m
        }
    }

    conn.downloadM = async (m, type, saveToFile) => {
        let M = m.msg || m
        let mtype = M.mtype ? M.mtype.replace(/Message/i, '') : type
        let message = M.message ? M.message[mtype] : M
        let stream = await downloadContentFromMessage(message, mtype)
        let buffer = Buffer.from([])
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])
        }
        if (saveToFile) {
            let ran = Math.floor(Math.random() * 100000)
            let ext = message.mimetype.split('/')[1]
            let filename = path.join('./tmp', `${ran}.${ext}`)
            fs.writeFileSync(filename, buffer)
            return filename
        }
        return buffer
    }

    // LID -> JID global cache. Never scan every group to resolve a LID.
    conn.lidJidCache = new Map()
    // Reverse index: LID -> one known group. This avoids scanning every group for PV messages.
    conn.lidGroupCache = new Map()
    const LID_JID_CACHE_MS = 10 * 60 * 1000

    conn.loadLidJidCache = async chatJid => {
        if (!chatJid || !chatJid.endsWith('@g.us')) return null

        const now = Date.now()
        const cached = conn.lidJidCache.get(chatJid)
        if (cached && cached.expires > now) return cached.map

        try {
            // First use metadata already present in the Baileys store/chat cache.
            // This keeps the first incoming message responsive even in large groups.
            const cachedMetadata =
                conn.store?.groupMetadata?.[chatJid] ||
                conn.chats?.[chatJid]?.metadata ||
                null

            const metadata = cachedMetadata || await conn.groupMetadata(chatJid)
            if (!metadata) return null

            const map = new Map()
            for (const participant of metadata.participants || []) {
                const lid = participant?.lid || (typeof participant?.id === 'string' && participant.id.endsWith('@lid') ? participant.id : null)
                if (!lid) continue

                const jid = [participant?.jid, participant?.id]
                    .find(value => typeof value === 'string' && value.endsWith('@s.whatsapp.net'))

                const resolvedJid = jid || lid
                map.set(lid, resolvedJid)
                if (resolvedJid !== lid) {
                    const expires = Date.now() + LID_JID_CACHE_MS
                    conn.lidJidCache.set(lid, { jid: resolvedJid, expires })
                    // Remember only one group as the lookup source for PV resolution.
                    conn.lidGroupCache.set(lid, { group: chatJid, expires })
                }
            }

            conn.lidJidCache.set(chatJid, {
                map,
                expires: Date.now() + LID_JID_CACHE_MS
            })

            return map
        } catch (e) {
            return cached?.map || null
        }
    }

    conn.setLidJidCache = (lid, jid, chatJid = null) => {
        if (!lid || !jid || typeof lid !== 'string' || typeof jid !== 'string') return
        if (!lid.endsWith('@lid')) return

        if (chatJid?.endsWith('@g.us')) {
            let groupCached = conn.lidJidCache.get(chatJid)
            if (!groupCached || !groupCached.map) {
                groupCached = { map: new Map(), expires: Date.now() + LID_JID_CACHE_MS }
                conn.lidJidCache.set(chatJid, groupCached)
            }
            groupCached.map.set(lid, jid)
            groupCached.expires = Date.now() + LID_JID_CACHE_MS
        }

        // Direct LID -> JID lookup. No iteration over other groups.
        const expires = Date.now() + LID_JID_CACHE_MS
        conn.lidJidCache.set(lid, { jid, expires })
        if (chatJid?.endsWith('@g.us')) {
            conn.lidGroupCache.set(lid, { group: chatJid, expires })
        }
    }

    conn.resolveLidEnhanced = async (lid, chatJid) => {
        if (!lid || !lid.endsWith('@lid')) return lid

        const now = Date.now()

        // 1. Direct LID -> JID cache first.
        const direct = conn.lidJidCache.get(lid)
        if (direct?.jid && direct.expires > now) return direct.jid
        if (direct) conn.lidJidCache.delete(lid)

        // 2. Group message: ONLY resolve against the group this message came from.
        if (chatJid?.endsWith('@g.us')) {
            const cached = conn.lidJidCache.get(chatJid)
            if (cached?.map && cached.expires > now) {
                const resolved = cached.map.get(lid)
                if (resolved && resolved !== lid) {
                    conn.lidJidCache.set(lid, { jid: resolved, expires: now + LID_JID_CACHE_MS })
                    conn.lidGroupCache.set(lid, { group: chatJid, expires: now + LID_JID_CACHE_MS })
                    return resolved
                }
                return resolved || lid
            }

            // Never block the incoming message on a large-group metadata fetch.
            // Warm the cache in the background; the current message continues with LID.
            void conn.loadLidJidCache(chatJid).catch(() => {})
            return lid
        }

        // 3. Private chat: cache first. If absent, use exactly ONE known group
        // as the mapping source. Never iterate/fetch metadata for all groups.
        const groupRef = conn.lidGroupCache.get(lid)
        if (groupRef?.group && groupRef.expires > now) {
            const cachedGroup = conn.lidJidCache.get(groupRef.group)
            const resolved = cachedGroup?.map?.get(lid)
            if (resolved && resolved !== lid) return resolved
            // Cache miss: refresh in background instead of blocking the message.
            void conn.loadLidJidCache(groupRef.group).catch(() => {})
            return lid
        }
        if (groupRef) conn.lidGroupCache.delete(lid)

        // Keep unresolved LID as-is; do not fabricate a JID.
        return lid
    }

    return conn
}

async function smsg(conn, m) {
    if (!m) return m
    if (m.key) {
        m.id = m.key.id || ''
        m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16
        m.chat = m.key.remoteJid || ''
        m.fromMe = !!m.key.fromMe
        m.isGroup = m.chat.endsWith('@g.us')
        if (m.fromMe) {
            m.sender = conn.user?.id
                ? conn.decodeJid(conn.user.id)
                : (m.key.participant || m.key.remoteJid || '')
        } else {
            // WhatsApp can provide the real phone-number JID alongside a LID.
            // Prefer those fields so normal messages never wait for groupMetadata().
            const pnCandidates = [
                m.senderPn,
                m.key.senderPn,
                m.participantPn,
                m.key.participantPn,
                m.participantAlt,
                m.key.participantAlt
            ].filter(value => typeof value === 'string' && value.endsWith('@s.whatsapp.net'))

            const senderCandidates = [
                ...pnCandidates,
                m.key.participant,
                m.participant,
                m.senderPn,
                m.key.senderPn,
                m.participantAlt,
                m.key.participantAlt
            ].filter(value => typeof value === 'string' && value)

            const senderRaw = senderCandidates[0] || (!m.isGroup ? m.key.remoteJid : '')
            m.sender = await conn.resolveSenderJid(senderRaw, m.chat)

            // If WhatsApp supplied a PN JID, immediately seed the LID cache.
            const rawLid = [
                m.key.participant,
                m.participant,
                m.key.participantAlt,
                m.participantAlt
            ].find(value => typeof value === 'string' && value.endsWith('@lid'))
            const realPn = pnCandidates[0]

            if (rawLid && realPn) {
                conn.setLidJidCache(rawLid, realPn, m.chat)
                m.sender = conn.decodeJid(realPn)
            }
            if (!m.sender) m.sender = senderRaw || m.key.remoteJid || ''
        }

        if (m.chat.endsWith('@lid') && !m.isGroup) {
            const originalChat = m.chat
            const resolvedChat = await conn.resolveLidEnhanced(m.chat)
            m.chat = resolvedChat || originalChat
            if (resolvedChat) {
                conn.setLidJidCache(originalChat, resolvedChat)
            }
        }
    }
    if (m.message && typeof m.message === 'object') {
        const messageTypes = Object.keys(m.message).filter(key => m.message[key] !== undefined && m.message[key] !== null)
        m.mtype = messageTypes[0] || ''
        m.msg = m.mtype ? m.message[m.mtype] : null

        if (m.mtype === 'viewOnceMessageV2' || m.mtype === 'viewOnceMessage' || m.mtype === 'ephemeralMessage') {
            const nested = m.msg?.message
            if (nested && typeof nested === 'object') {
                const nestedTypes = Object.keys(nested).filter(key => nested[key] !== undefined && nested[key] !== null)
                m.mtype = nestedTypes[0] || m.mtype
                m.msg = m.mtype ? nested[m.mtype] : null
            }
        }

        const msgObject = m.msg && typeof m.msg === 'object' ? m.msg : null
        const contextInfo = msgObject?.contextInfo || null
        const text = typeof m.msg === 'string'
            ? m.msg
            : m.message.conversation ||
              msgObject?.text ||
              msgObject?.caption ||
              msgObject?.contentText ||
              msgObject?.selectedDisplayText ||
              msgObject?.title ||
              ''

        m.text = String(text || '')
        m.download = (saveToFile = false) => conn.downloadM(m, String(m.mtype || '').replace(/Message/i, ''), saveToFile)

        let quoted = null
        let quotedStored = null
        let quotedStoredKey = null

        if (contextInfo?.stanzaId && typeof conn.getStoredMessage === 'function') {
            try {
                const quotedChats = [...new Set([
                    contextInfo.remoteJid,
                    m.chat,
                    m.key?.remoteJid
                ].filter(v => typeof v === 'string' && v))]

                const participantCandidates = [...new Set([
                    contextInfo.participant,
                    contextInfo.participantPn,
                    contextInfo.senderPn
                ].filter(v => typeof v === 'string' && v))]

                for (const quotedChat of quotedChats) {
                    const keys = []
                    for (const participant of participantCandidates) {
                        keys.push({
                            remoteJid: quotedChat,
                            id: contextInfo.stanzaId,
                            fromMe: false,
                            participant
                        })
                    }
                    keys.push({
                        remoteJid: quotedChat,
                        id: contextInfo.stanzaId,
                        fromMe: false
                    })
                    keys.push({
                        remoteJid: quotedChat,
                        id: contextInfo.stanzaId,
                        fromMe: true
                    })

                    for (const key of keys) {
                        const stored = await conn.getStoredMessage(key)
                        if (stored?.message) {
                            quotedStored = stored
                            quotedStoredKey = stored.key || key
                            break
                        }
                    }

                    if (quotedStored?.message) break
                }

                if (quotedStored?.message) {
                    const storedMessage = quotedStored.message
                    const edited = storedMessage?.protocolMessage?.editedMessage?.message
                    quoted = edited || storedMessage
                }
            } catch {}
        }

        if (!quoted && contextInfo?.quotedMessage) {
            quoted = contextInfo.quotedMessage
        }

        m.quoted = quoted
        if (m.quoted) {
            let type = Object.keys(m.quoted)[0]
            let quotedMsg = m.quoted[type]
            if (!quotedMsg) {
                m.quoted = null
            } else {
                m.quoted = quotedMsg
                if (typeof m.quoted === 'string') m.quoted = { text: m.quoted }
                m.quoted.mtype = type
                m.quoted.id = contextInfo?.stanzaId || null
                m.quoted.chat = contextInfo?.remoteJid || m.chat
                const quotedSenderRaw = quotedStoredKey?.participant
                    || quotedStoredKey?.senderPn
                    || contextInfo?.participant
                    || contextInfo?.participantPn
                    || contextInfo?.senderPn
                    || (!m.quoted.chat.endsWith('@g.us') ? quotedStoredKey?.remoteJid : null)
                    || null
                m.quoted.sender = await conn.resolveSenderJid(quotedSenderRaw, m.quoted.chat)
                if (!m.quoted.sender) {
                    m.quoted.sender = quotedSenderRaw || quotedStored?.key?.remoteJid || m.quoted.chat || ''
                }

                if (m.quoted.chat && m.quoted.chat.endsWith('@lid') && !m.isGroup) {
                    const originalQuotedChat = m.quoted.chat
                    const resolvedQuotedChat = await conn.resolveLidEnhanced(m.quoted.chat)
                    m.quoted.chat = resolvedQuotedChat || originalQuotedChat
                    if (resolvedQuotedChat) {
                        conn.setLidJidCache(originalQuotedChat, resolvedQuotedChat)
                    }
                }
                
                m.quoted.fromMe = !!m.quoted.sender && !!conn.user?.id && conn.sameJid(m.quoted.sender, conn.user.id)
                m.quoted.text = String(m.quoted.text || m.quoted.caption || '')
                m.quoted.reply = (text, chatId, options) => conn.reply(chatId ? chatId : m.chat, text, m.quoted, options)
                m.quoted.download = (saveToFile = false) => conn.downloadM(m.quoted, m.quoted.mtype.replace(/Message/i, ''), saveToFile)
            }
        }
    }
    m.reply = (text, chatId, options) => conn.reply(chatId ? chatId : m.chat, text, m, options)
    return m
}

function bind(conn) {
    if (!conn.chats) conn.chats = {}
    if (!conn.contacts) conn.contacts = {}
    
    function updateNameToDb(contacts) {
        if (!contacts) return
        try {
            contacts = contacts.contacts || contacts
            for (const contact of contacts) {
                const id = conn.decodeJid(contact.id)
                if (!id || id === 'status@broadcast') continue
                
                let chats = conn.chats[id]
                if (!chats) chats = conn.chats[id] = { ...contact, id }
                conn.chats[id] = {
                    ...chats,
                    ...contact,
                    ...(id.endsWith('@g.us') ?
                        { subject: contact.subject || contact.name || chats.subject || '' } :
                        { name: contact.notify || contact.name || chats.name || chats.notify || '' })
                }
                
                conn.contacts[id] = {
                    ...conn.contacts[id],
                    ...contact
                }
                
            }
        } catch (e) {}
    }
    
    conn.ev.on('contacts.upsert', updateNameToDb)
    conn.ev.on('contacts.update', updateNameToDb)
    conn.ev.on('contacts.set', updateNameToDb)
    conn.ev.on('groups.update', updateNameToDb)
    
    conn.ev.on('messages.reaction', (reactions) => {
        try {
            for (const reaction of reactions) {
                if (reaction.key?.participant) {
                    const jid = conn.decodeJid(reaction.key.participant)
                    if (jid && !conn.contacts[jid]) {
                        conn.contacts[jid] = { id: jid }
                    }
                }
            }
        } catch (e) {}
    })
    
    conn.ev.on('chats.set', ({ chats }) => {
        // Do not request metadata for every group here.
        // Large accounts can receive hundreds of chats at once and sequential
        // groupMetadata() calls can block/rate-limit the connection.
        if (!Array.isArray(chats)) return

        for (let { id, name, readOnly } of chats) {
            id = conn.decodeJid(id)
            if (!id || id === 'status@broadcast') continue

            const isGroup = id.endsWith('@g.us')
            let localChats = conn.chats[id]
            if (!localChats) localChats = conn.chats[id] = { id }

            localChats.isChats = !readOnly
            if (name) localChats[isGroup ? 'subject' : 'name'] = name

            // Metadata is intentionally lazy:
            // when a message arrives, use m.chat/chatJid only.
        }
    })
    
    conn.ev.on('group-participants.update', async function updateParticipantsToDb({ id, participants, action }) {
        if (!id) return
        id = conn.decodeJid(id)
        if (id === 'status@broadcast') return
        if (!(id in conn.chats)) conn.chats[id] = { id }
        let localChats = conn.chats[id]
        localChats.isChats = true
        const groupMetadata = await conn.groupMetadata(id).catch(_ => null)
        if (!groupMetadata) return
        localChats.subject = groupMetadata.subject
        localChats.metadata = groupMetadata
    })

    if (conn.user) {
        conn.contacts[conn.user.id] = {
            id: conn.user.id,
            name: conn.user.name,
            notify: conn.user.name
        }
    }
}

module.exports = { makeWASocket, smsg, bind }
