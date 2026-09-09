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

function qLive() {
    return {
        key: {
            remoteJid: 'status@broadcast',
            fromMe: false,
            id: 'EvoBotz',
            participant: '13135550002@s.whatsapp.net'
        },
        message: {
            liveLocationMessage: {
                degreesLatitude: 0,
                degreesLongitude: 0,
                sequenceNumber: {
                    low: 396078137,
                    high: 416459,
                    unsigned: false
                },
                jpegThumbnail: Buffer.alloc(0),
                caption: 'LevviCode - EvoBotz'
            },
            messageContextInfo: {
                threadId: [],
                messageSecret: Uint8Array.from(
                    Buffer.from(
                        'uvqRZbbN1o05jNB72cYN6mF/bNapTxuneaPMLSeq+aA=',
                        'base64'
                    )
                )
            }
        }
    }
}

module.exports = { qLive }
