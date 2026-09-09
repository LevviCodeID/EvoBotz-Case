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
 **/
const fs = require('fs')
const path = require('path')
const os = require('os')
const crypto = require('crypto')
const ffmpeg = require('fluent-ffmpeg')
const webp = require('node-webpmux')
const { fromBuffer: fileTypeFromBuffer } = require('file-type')
const ffmpegPath = require('ffmpeg-static')

ffmpeg.setFfmpegPath(ffmpegPath)

const tmpdir = os.tmpdir()

const randomName = (ext) =>
  path.join(tmpdir, `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.${ext}`)

async function imageToWebp(media, cropToSquare = false) {
  const tmpIn = randomName('jpg')
  const tmpOut = randomName('webp')

  fs.writeFileSync(tmpIn, media)

  let vf
  if (cropToSquare) {
    vf = "crop=min(iw,ih):min(iw,ih),scale=320:320"
  } else {
    vf = "scale='min(320,iw)':'min(320,ih)':force_original_aspect_ratio=decrease"
  }

  await new Promise((resolve, reject) => {
    ffmpeg(tmpIn)
      .on('error', reject)
      .on('end', resolve)
      .addOutputOptions([
        '-vcodec', 'libwebp',
        '-quality', '90',
        '-preset', 'default',
        '-vf', vf,
        '-loop', '0'
      ])
      .toFormat('webp')
      .save(tmpOut)
  })

  const buff = fs.readFileSync(tmpOut)
  fs.unlinkSync(tmpIn)
  fs.unlinkSync(tmpOut)

  return buff
}

async function videoToWebp(media, cropToSquare = false) {
  const tmpIn = randomName('mp4')
  const tmpOut = randomName('webp')

  fs.writeFileSync(tmpIn, media)

  let vf
  if (cropToSquare) {
    vf = "crop=min(iw,ih):min(iw,ih),scale=320:320"
  } else {
    vf = "scale='min(320,iw)':'min(320,ih)':force_original_aspect_ratio=decrease"
  }

  await new Promise((resolve, reject) => {
    ffmpeg(tmpIn)
      .on('error', reject)
      .on('end', resolve)
      .addOutputOptions([
        '-vcodec', 'libwebp',
        '-quality', '90',
        '-preset', 'default',
        '-vf', vf,
        '-loop', '0',
        '-ss', '00:00:00',
        '-t', '00:00:05',
        '-an',
        '-vsync', '0'
      ])
      .toFormat('webp')
      .save(tmpOut)
  })

  const buff = fs.readFileSync(tmpOut)
  fs.unlinkSync(tmpIn)
  fs.unlinkSync(tmpOut)

  return buff
}

async function writeExif(media, data = {}) {
  const type = await fileTypeFromBuffer(media)
  const cropToSquare = data.cropToSquare === true

  let webpMedia
  if (/webp/.test(type.mime)) {
    webpMedia = media
  } else if (/image/.test(type.mime)) {
    webpMedia = await imageToWebp(media, cropToSquare)
  } else if (/video/.test(type.mime)) {
    webpMedia = await videoToWebp(media, cropToSquare)
  } else {
    throw new Error('Format tidak didukung')
  }

  if (!webpMedia) throw new Error('Gagal konversi ke WebP')

  const tmpIn = randomName('webp')
  const tmpOut = randomName('webp')
  fs.writeFileSync(tmpIn, webpMedia)

  const img = new webp.Image()
  await img.load(tmpIn)

  const json = {
    'sticker-pack-id': data.packid || 'levvi-pack',
    'sticker-pack-name': data.packname || 'Levvi Sticker',
    'sticker-pack-publisher': data.author || 'Levvi',
    'emojis': data.categories || ['']
  }

  const exifAttr = Buffer.from([
    0x49, 0x49, 0x2A, 0x00,
    0x08, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x41, 0x57,
    0x07, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x16, 0x00,
    0x00, 0x00
  ])

  const jsonBuff = Buffer.from(JSON.stringify(json), 'utf-8')
  const exif = Buffer.concat([exifAttr, jsonBuff])
  exif.writeUIntLE(jsonBuff.length, 14, 4)

  img.exif = exif
  await img.save(tmpOut)

  fs.unlinkSync(tmpIn)
  return fs.readFileSync(tmpOut)
}

module.exports = {
  imageToWebp,
  videoToWebp,
  writeExif
}