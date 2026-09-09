# EvoBotz Base Case

> **Fast • Simple • Customizable WhatsApp Bot Base**

EvoBotz Base Case adalah base bot WhatsApp berbasis **Node.js** yang dikembangkan oleh **LevviCode** dengan engine **levvleys**.

Base ini dibuat dengan struktur yang mudah dipahami, ringan untuk dikembangkan, dan cocok digunakan sebagai fondasi untuk membuat bot WhatsApp sendiri.

---

## Features

- Fast WhatsApp connection
- JID & LID support
- LID → JID mapping
- Smart sender resolution
- Global mapping cache
- Group metadata cache
- Owner & Creator system
- Premium system
- Self / Public mode
- Dynamic configuration
- Message database
- CRM message storage
- Runtime information
- Ping monitoring
- Sticker maker
- Eval system
- Shell execution
- Interactive message support
- Custom menu
- Media helper
- Lightweight JSON database

---

## Requirements

Sebelum menjalankan bot, pastikan server sudah memiliki:

- Node.js 18 atau lebih baru
- npm
- Internet connection
- WhatsApp account

---

## Installation

### 1. Extract source

Extract file ZIP kemudian masuk ke folder project:

```bash
cd "EvoBotz Base Case"
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure bot

Edit file:

```text
config.json
```

Contoh:

```json
{
  "ownerNumber": "628xxxxxxxxxx",
  "botName": "EvoBotz",
  "devName": "LevviCode",
  "mode": "self",
  "prefix": "."
}
```

Sesuaikan konfigurasi dengan kebutuhan bot.

### 4. Start

```bash
npm start
```

Jika `npm start` tidak digunakan pada environment kamu, bot juga dapat dijalankan dengan:

```bash
node index.js
```

---

## Project Structure

```text
EvoBotz Base Case/
│
├── index.js
├── Levvi.js
├── config.json
├── package.json
│
├── database/
│   ├── messages.json
│   ├── owner.json
│   └── premium.json
│
├── lib/
│   ├── StickerMaker.js
│   ├── dbjson.js
│   ├── msg.js
│   ├── myfunc.js
│   └── sys.js
│
└── src/
    ├── audio/
    └── img/
        └── menu.jpg
```

### File penting

| File | Fungsi |
|---|---|
| `index.js` | Entry point dan proses utama bot |
| `Levvi.js` | Command / case bot |
| `config.json` | Konfigurasi bot |
| `lib/sys.js` | System/helper utama |
| `lib/msg.js` | Message processing |
| `lib/myfunc.js` | Utility function |
| `lib/dbjson.js` | JSON database helper |
| `lib/StickerMaker.js` | Sticker processing |
| `database/` | Penyimpanan data bot |
| `src/img/` | Asset gambar |
| `src/audio/` | Asset audio |

---

## JID & LID Mapping

EvoBotz memiliki sistem mapping **JID ↔ LID** untuk membantu mendapatkan identitas pengirim secara lebih akurat.

Sistem ini menggunakan cache sehingga bot tidak perlu meminta metadata group pada setiap pesan.

### Alur sederhana

```text
Incoming Message
       │
       ▼
Check JID / LID Cache
       │
       ├── Found ──► Use Mapping
       │
       └── Not Found
              │
              ▼
       Check Group Metadata
              │
              ▼
          Save Cache
              │
              ▼
        Resolve Sender
```

Cache digunakan untuk mengurangi request yang tidak diperlukan dan menjaga proses pesan tetap responsif.

---

## Self & Public Mode

### Self Mode

```json
"mode": "self"
```

Pada mode ini command dibatasi sesuai sistem permission owner / creator.

### Public Mode

```json
"mode": "public"
```

Pada mode ini bot dapat memproses command dari user sesuai permission masing-masing command.

---

## Command

Prefix default:

```text
.
```

Contoh:

```text
.menu
.ping
.info
.owner
.crm
```

Command yang tersedia dapat berbeda sesuai case yang terdapat pada `Levvi.js`.

---

## Owner & Creator

System permission membedakan akses biasa dengan akses owner / creator.

Fitur khusus developer seperti eval atau shell execution sebaiknya hanya diberikan kepada akun yang benar-benar dipercaya.

> **Security:** jangan memberikan akses Creator kepada orang lain karena beberapa fitur dapat menjalankan kode pada server.

---

## Database

EvoBotz menggunakan database JSON sederhana agar mudah dipindahkan dan diedit.

```text
database/
├── messages.json
├── owner.json
└── premium.json
```

### messages.json

Menyimpan data pesan yang digunakan oleh sistem message / CRM.

### owner.json

Menyimpan daftar owner tambahan.

### premium.json

Menyimpan data user premium.

---

## Performance

Base ini menggunakan beberapa mekanisme untuk menjaga performa:

- Cache mapping JID/LID
- Group metadata cache
- Cache expiration
- Menghindari pencarian metadata yang berulang
- JSON database sederhana
- Utility function yang reusable
- Struktur command terpusat

Untuk deployment berskala besar, tetap perhatikan penggunaan RAM, ukuran database, dan jumlah group yang aktif.

---

## Custom Command

Command dapat dikembangkan melalui:

```text
Levvi.js
```

Contoh sederhana:

```js
case 'hello': {
    m.reply('Hello World!')
    break
}
```

Kemudian gunakan:

```text
.hello
```

Untuk command yang lebih kompleks, manfaatkan helper yang tersedia di folder:

```text
lib/
```

---

## Pterodactyl

EvoBotz dapat dijalankan pada server Pterodactyl selama image yang digunakan menyediakan Node.js dan npm.

Contoh startup:

```bash
npm start
```

Pastikan:

1. File source sudah berada di server.
2. Dependency sudah di-install.
3. `config.json` sudah dikonfigurasi.
4. Server memiliki koneksi internet.
5. Storage dan RAM mencukupi.

---

## Troubleshooting

### `npm install` error

Coba bersihkan dependency kemudian install ulang:

```bash
rm -rf node_modules package-lock.json
npm install
```

### Bot tidak dapat connect

Periksa:

- koneksi internet server
- session/authentication
- konfigurasi bot
- versi Node.js
- log error pada console

### Command tidak merespons

Periksa:

- prefix
- mode `self/public`
- permission user
- case pada `Levvi.js`
- error pada console

### Mapping JID/LID tidak sesuai

Pastikan:

- cache tidak rusak
- group metadata dapat diakses
- JID/LID message tersedia
- bot sudah menerima metadata yang diperlukan

---

## Developer

**LevviCode**

WhatsApp Bot Base

Telegram:

`t.me/lepicode`

---

## License

Source ini dibuat oleh **LevviCode**.

### Allowed

- Personal use
- Modification
- Customization
- Bug fixing
- Recoding
- Menambahkan fitur
- Menjalankan bot sendiri
- Paid bot hosting / running service
- Paid setup / installation service

### Not Allowed

- Menjual source code ini
- Menjual versi modifikasi sebagai source code
- Redistribusi source untuk mendapatkan keuntungan
- Memasukkan source ke dalam paket source berbayar
- Renting, licensing, atau sublicensing source
- Rebranding source untuk dijual kembali
- Mengenkripsi / meng-obfuscate source untuk tujuan penjualan ulang

Menjual **jasa yang menggunakan atau menjalankan bot** diperbolehkan selama source code tidak dijual atau didistribusikan kembali sebagai produk.

Credit **LevviCode** wajib tetap dipertahankan.

---

## Disclaimer

Source ini disediakan **"AS IS"** tanpa jaminan dalam bentuk apa pun.

Developer tidak bertanggung jawab atas:

- Penyalahgunaan bot
- Account restriction / ban
- Kerusakan server
- Kehilangan data
- Kesalahan konfigurasi
- Kerugian akibat penggunaan source

Gunakan source ini dengan tanggung jawab.

---

<div align="center">

**EvoBotz Base Case**

Built with **LevviCode**

© 2026 LevviCode

</div>
