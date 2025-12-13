# C.A.L.M. Dashboard v5

Dashboard за визуализация на CALM Protocol задачи от Notion.

## Структура

```
/
├── index.html              # Главен файл (Dashboard + Календар)
├── functions/
│   └── api/
│       └── notion-data.js  # Cloudflare Function за Notion API
└── README.md
```

## Deployment в Cloudflare Pages

1. Отвори https://dash.cloudflare.com
2. Pages → calm-706 → Create deployment
3. Upload assets → качи всички файлове от тази папка
4. Deploy

## Функционалност

- **Dashboard**: 4 карти с часове по категория + stacked bar chart
- **Седмичен календар**: Визуализация на задачите с часове 6:00-22:00
- **Навигация**: ← Назад / Днес / Напред → (по седмици)
- **Responsive**: Оптимизиран за мобилни устройства

## Notion Database

URL: https://www.notion.so/cf60325956e94955b37d465cf7ecc777

Необходими properties:
- Title (title)
- Date (date)
- Start (text) - формат "HH:MM"
- End (text) - формат "HH:MM"
- Category (select): MVT, Priority, Personal, Recharge
- Status (status): Planned, Completed
