# CALM Dashboard Widget

Визуализация на седмичната продуктивност за C.A.L.M. Protocol.

![Dashboard Preview](https://via.placeholder.com/800x200?text=CALM+Dashboard+Preview)

---

## 🚀 Инсталация (10 минути)

### Стъпка 1: Създай Notion Integration

1. Отиди на **[notion.so/my-integrations](https://www.notion.so/my-integrations)**
2. Кликни **"+ New integration"**
3. Попълни:
   - **Name:** `CALM Dashboard`
   - **Logo:** (по желание)
   - **Associated workspace:** избери твоя workspace
4. Кликни **"Submit"**
5. **Копирай "Internal Integration Secret"** (започва с `secret_...`)
   
   ⚠️ Запази го - ще ти трябва след малко!

---

### Стъпка 2: Свържи Integration с Database

1. Отвори **CALM Tasks** database в Notion
2. Кликни **"..."** (горе вдясно)
3. Избери **"Connect to"** → намери **"CALM Dashboard"**
4. Потвърди връзката

---

### Стъпка 3: Вземи Database ID

От URL-а на твоя CALM Tasks database:
```
https://www.notion.so/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX?v=...
                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                      Това е твоят DATABASE_ID
```

Копирай 32-символния ID (без тиретата е ОК).

---

### Стъпка 4: Deploy на Cloudflare Pages

#### Вариант A: През GitHub (препоръчително)

1. Създай нов GitHub repository
2. Качи всички файлове от тази папка
3. Отиди на **[dash.cloudflare.com](https://dash.cloudflare.com)**
4. **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
5. Избери твоя repo
6. Build settings:
   - **Framework preset:** None
   - **Build command:** (остави празно)
   - **Build output directory:** `/`
7. Кликни **"Save and Deploy"**

#### Вариант B: Direct Upload

1. Отиди на **[dash.cloudflare.com](https://dash.cloudflare.com)**
2. **Workers & Pages** → **Create** → **Pages** → **Upload assets**
3. Провлачи файловете от тази папка
4. Кликни **"Deploy site"**

---

### Стъпка 5: Добави Environment Variables

1. В Cloudflare Dashboard → твоя Pages project
2. **Settings** → **Environment variables**
3. Добави:

| Variable | Value |
|----------|-------|
| `NOTION_API_KEY` | `secret_xxx...` (от Стъпка 1) |
| `NOTION_DATABASE_ID` | `xxx...` (от Стъпка 3) |

4. Кликни **"Save"**
5. **Deployments** → **Redeploy** (за да вземе новите променливи)

---

### Стъпка 6: Embed в Notion

1. Копирай URL-а на твоя Cloudflare site:
   ```
   https://calm-dashboard-xxx.pages.dev
   ```

2. В Notion Dashboard страницата:
   - Напиши `/embed`
   - Постави URL-а
   - Натисни Enter

3. Resize embed блока до желания размер (препоръчвам full-width)

---

## ✅ Готово!

Dashboard-ът вече показва данни от твоя CALM Tasks database!

- Обновява се автоматично на всеки 5 минути
- Показва само **Completed** задачи от текущата седмица
- Групира по Category (MVT, Priority, Personal, Recharge)

---

## 🔧 Troubleshooting

### "Грешка при зареждане"
- Провери дали Environment Variables са правилно зададени
- Провери дали Integration е свързан с database-а
- Провери дали има Completed задачи за тази седмица

### Празни графики
- Увери се, че имаш задачи със Status = "Completed"
- Увери се, че Start и End time са попълнени
- Увери се, че Date е в текущата седмица

### CORS грешки
- Това не трябва да се случва с Cloudflare Functions
- Ако има проблем, провери дали `/functions/api/notion-data.js` е качен

---

## 📁 Файлова структура

```
calm-dashboard/
├── index.html                    # Dashboard UI
├── functions/
│   └── api/
│       └── notion-data.js        # Cloudflare Function (API proxy)
└── README.md                     # Този файл
```

---

## 🎁 За клиенти на Masterhack

Ако си получил този template като част от CALM Protocol системата:

1. Следвай стъпките по-горе
2. При проблеми пиши в общността
3. Dashboard-ът е напълно безплатен за хостване

---

## 📝 Changelog

- **v1.0** - Initial release
  - Horizontal layout с 3 секции
  - Bar chart (stacked по дни)
  - Donut chart (по категории)
  - 4 summary cards
  - Auto-refresh на 5 мин

---

Направено с ❤️ за CALM Protocol
