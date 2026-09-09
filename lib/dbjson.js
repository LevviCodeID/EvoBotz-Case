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
const fs = require('fs')
const path = require('path')

class DBJSON {
    constructor(file, defaults = {}) {
        this.file = file
        this.defaults = defaults
        this.ensure()
    }

    ensure() {
        const dir = path.dirname(this.file)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        if (!fs.existsSync(this.file)) this.write(this.defaults)
    }

    read() {
        this.ensure()
        try {
            const data = JSON.parse(fs.readFileSync(this.file, 'utf8'))
            return data && typeof data === 'object' ? data : structuredClone(this.defaults)
        } catch {
            return structuredClone(this.defaults)
        }
    }

    write(data) {
        const dir = path.dirname(this.file)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        const temp = `${this.file}.tmp`
        fs.writeFileSync(temp, JSON.stringify(data, null, 2))
        fs.renameSync(temp, this.file)
        return data
    }

    update(callback) {
        const data = this.read()
        const result = callback(data) || data
        this.write(result)
        return result
    }

    get(key, fallback = undefined) {
        const data = this.read()
        return key.split('.').reduce((obj, part) => obj?.[part], data) ?? fallback
    }

    set(key, value) {
        return this.update(data => {
            const parts = key.split('.')
            let target = data
            for (let i = 0; i < parts.length - 1; i++) {
                if (!target[parts[i]] || typeof target[parts[i]] !== 'object') target[parts[i]] = {}
                target = target[parts[i]]
            }
            target[parts[parts.length - 1]] = value
            return data
        })
    }
}

module.exports = DBJSON
