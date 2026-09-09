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
const { useMultiFileAuthState, makeInMemoryStore, DisconnectReason, Browsers } = require('@whiskeysockets/baileys')
const pino = require('pino')
const { Boom } = require('@hapi/boom')
const readline = require('readline')
const { makeWASocket: makeWASocketSimple, bind } = require('./lib/msg.js')

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

const question = text => new Promise(resolve => rl.question(text, resolve))

let reconnectTimer = null
let reconnecting = false
let connectionGeneration = 0
let reconnectAttempts = 0

const getDisconnectInfo = error => {
    const statusCode = new Boom(error)?.output?.statusCode || 0
    const reason = Object.entries(DisconnectReason).find(([, value]) => value === statusCode)?.[0] || 'unknown'
    return { statusCode, reason }
}

const getReconnectDelay = () => {
    const base = 3000
    const max = 30000
    const attempt = Math.min(reconnectAttempts, 4)
    return Math.min(max, base * Math.pow(2, attempt))
}

async function connectToWhatsApp() {
    if (reconnecting) return
    reconnecting = true
    const generation = ++connectionGeneration

    try {
        const { state, saveCreds } = await useMultiFileAuthState('auth')
        const store = makeInMemoryStore({ logger: pino({ level: 'silent' }) })

        const conn = makeWASocketSimple({
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            browser: Browsers.ubuntu('Safari'),
            auth: state,
            getMessage: async key => {
                try {
                    return store.messages?.[key.remoteJid]?.get(key.id)?.message || undefined
                } catch {
                    return undefined
                }
            }
        })

        if (typeof conn.ev.setMaxListeners === 'function') conn.ev.setMaxListeners(0)
        store.bind(conn.ev)
        conn.store = store
        conn.getStoredMessage = async key => {
            try {
                return store.messages?.[key.remoteJid]?.get(key.id) || null
            } catch {
                return null
            }
        }
        bind(conn)

        conn.ev.on('connection.update', update => {
            const { connection, lastDisconnect } = update

            if (connection === 'open') {
                console.log('✅ Connected to WhatsApp')
                reconnecting = false
                reconnectAttempts = 0
                if (reconnectTimer) {
                    clearTimeout(reconnectTimer)
                    reconnectTimer = null
                }
                return
            }

            if (connection !== 'close') return
            if (generation !== connectionGeneration) return

            const { statusCode, reason } = getDisconnectInfo(lastDisconnect?.error)
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut

            console.log(`Connection closed (${statusCode || 'unknown'} / ${reason}), reconnecting: ${shouldReconnect}`)

            if (!shouldReconnect) {
                reconnecting = false
                return
            }

            if (reconnectTimer) clearTimeout(reconnectTimer)

            const delay = getReconnectDelay()
            reconnectAttempts++
            reconnectTimer = setTimeout(() => {
                reconnectTimer = null
                reconnecting = false
                connectToWhatsApp().catch(err => {
                    reconnecting = false
                    console.error('❌ Reconnect error:', err.message)
                })
            }, delay)
        })

        conn.ev.on('creds.update', saveCreds)

        if (!conn.authState.creds.registered) {
            console.log('Masukkan nomor telepon (cth: 628xxxxxx):')
            const phoneNumber = await question('NUMBER: ')
            const code = await conn.requestPairingCode(phoneNumber, 'LEVICODE')
            console.log(`KODE PAIRING: ${code}`)
        }

        require('./lib/sys.js')(conn)
    } catch (err) {
        reconnecting = false
        console.error('❌ Connection setup error:', err.message)
        const delay = getReconnectDelay()
        reconnectAttempts++
        if (reconnectTimer) clearTimeout(reconnectTimer)
        reconnectTimer = setTimeout(() => {
            reconnectTimer = null
            connectToWhatsApp().catch(error => console.error('❌ Reconnect error:', error.message))
        }, delay)
    }
}

connectToWhatsApp().catch(err => {
    reconnecting = false
    console.error('❌ Startup error:', err.message)
})
