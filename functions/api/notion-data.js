// functions/api/notion-data.js
// Cloudflare Pages Function - proxies Notion API with date/period filtering
// v7 - 6 categories (MVT, Priority, Personal, Recharge, Media, Meeting)
// Uses Date + Start/End Select properties

export async function onRequest(context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=60'
  };

  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  const NOTION_API_KEY = context.env.NOTION_API_KEY;
  const DATABASE_ID = context.env.NOTION_DATABASE_ID;

  if (!NOTION_API_KEY || !DATABASE_ID) {
    return new Response(
      JSON.stringify({ error: 'Missing configuration' }),
      { status: 500, headers }
    );
  }

  try {
    const url = new URL(context.request.url);
    const dateParam = url.searchParams.get('date');
    const periodParam = url.searchParams.get('period') || 'week';
    const includeAll = url.searchParams.get('all') === 'true';

    const { startDate, endDate, periodLabels } = calculateDateRange(dateParam, periodParam);

    // Filter by Date property
    const filter = includeAll ? {
      and: [
        { property: 'Date', date: { on_or_after: startDate } },
        { property: 'Date', date: { on_or_before: endDate } }
      ]
    } : {
      and: [
        { property: 'Date', date: { on_or_after: startDate } },
        { property: 'Date', date: { on_or_before: endDate } },
        { property: 'Status', select: { equals: 'Completed' } }
      ]
    };

    const response = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ filter, page_size: 100 })
    });

    if (!response.ok) {
      const error = await response.text();
      return new Response(
        JSON.stringify({ error: 'Notion API error', details: error }),
        { status: response.status, headers }
      );
    }

    const data = await response.json();

    // Transform for chart
    const chartData = transformToChartData(data.results, startDate, endDate, periodParam, periodLabels);

    return new Response(
      JSON.stringify({
        ...chartData,
        period: periodParam,
        dateRange: { start: startDate, end: endDate },
        selectedDate: dateParam || new Date().toISOString().split('T')[0],
        generatedAt: new Date().toISOString()
      }),
      { headers }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal error', message: error.message }),
      { status: 500, headers }
    );
  }
}

function calculateDateRange(dateParam, period) {
  const baseDate = dateParam ? new Date(dateParam + 'T12:00:00Z') : new Date();
  let startDate, endDate, periodLabels = [];

  switch (period) {
    case 'day':
      startDate = new Date(baseDate);
      endDate = new Date(baseDate);
      periodLabels = [formatDayLabel(baseDate)];
      break;

    case 'week':
      const dayOfWeek = baseDate.getDay();
      startDate = new Date(baseDate);
      startDate.setDate(baseDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      periodLabels = ['Пон', 'Вт', 'Ср', 'Чет', 'Пет', 'Съб', 'Нед'];
      break;

    case 'month':
      startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
      endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
      periodLabels = generateWeekLabels(startDate, endDate);
      break;

    case 'year':
      startDate = new Date(baseDate.getFullYear(), 0, 1);
      endDate = new Date(baseDate.getFullYear(), 11, 31);
      periodLabels = ['Яну', 'Фев', 'Мар', 'Апр', 'Май', 'Юни', 'Юли', 'Авг', 'Сеп', 'Окт', 'Ное', 'Дек'];
      break;

    default:
      return calculateDateRange(dateParam, 'week');
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    periodLabels
  };
}

function formatDayLabel(date) {
  const days = ['Нед', 'Пон', 'Вт', 'Ср', 'Чет', 'Пет', 'Съб'];
  return days[date.getDay()];
}

function generateWeekLabels(startDate, endDate) {
  const labels = [];
  let current = new Date(startDate);
  let weekNum = 1;
  while (current <= endDate) {
    labels.push(`С${weekNum}`);
    current.setDate(current.getDate() + 7);
    weekNum++;
  }
  return labels;
}

function transformToChartData(tasks, startDate, endDate, period, periodLabels) {
  const categories = ['MVT', 'Priority', 'Personal', 'Recharge', 'Media', 'Meeting'];
  let chartData;

  switch (period) {
    case 'day':
      // Hourly breakdown for day view (6:00 - 22:00)
      chartData = [];
      for (let h = 6; h < 22; h++) {
        chartData.push({ 
          label: `${h}:00`, 
          hour: h,
          date: startDate, 
          MVT: 0, Priority: 0, Personal: 0, Recharge: 0, Media: 0, Meeting: 0 
        });
      }
      break;
    case 'week':
      chartData = periodLabels.map((label, index) => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + index);
        return { label, date: date.toISOString().split('T')[0], MVT: 0, Priority: 0, Personal: 0, Recharge: 0, Media: 0, Meeting: 0 };
      });
      break;
    case 'month':
      const start = new Date(startDate);
      chartData = periodLabels.map((label, index) => {
        const weekStart = new Date(start);
        weekStart.setDate(start.getDate() + (index * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return { label, startDate: weekStart.toISOString().split('T')[0], endDate: weekEnd.toISOString().split('T')[0], MVT: 0, Priority: 0, Personal: 0, Recharge: 0, Media: 0, Meeting: 0 };
      });
      break;
    case 'year':
      const year = new Date(startDate).getFullYear();
      chartData = periodLabels.map((label, index) => ({ label, month: index, year, MVT: 0, Priority: 0, Personal: 0, Recharge: 0, Media: 0, Meeting: 0 }));
      break;
  }

  // Only count completed tasks for chart
  tasks.forEach(task => {
    const props = task.properties;
    const category = props?.Category?.select?.name;
    const status = props?.Status?.select?.name;
    const taskDate = props?.Date?.date?.start;
    const startTime = props?.Start?.select?.name;
    const endTime = props?.End?.select?.name;
    
    if (!taskDate || !category || !startTime || !endTime) return;
    if (status !== 'Completed') return;
    if (!categories.includes(category)) return;
    
    const startParts = startTime.split(':').map(Number);
    const endParts = endTime.split(':').map(Number);
    const startHour = startParts[0] + startParts[1] / 60;
    const endHour = endParts[0] + endParts[1] / 60;
    const duration = endHour - startHour;
    
    if (duration <= 0) return;

    if (period === 'day') {
      // Distribute time across hourly buckets
      for (let h = Math.floor(startHour); h < Math.ceil(endHour); h++) {
        const bucketIndex = h - 6; // 6:00 is index 0
        if (bucketIndex >= 0 && bucketIndex < chartData.length) {
          const bucketStart = Math.max(h, startHour);
          const bucketEnd = Math.min(h + 1, endHour);
          const hoursInBucket = bucketEnd - bucketStart;
          if (hoursInBucket > 0) {
            chartData[bucketIndex][category] += hoursInBucket;
          }
        }
      }
    } else {
      let bucketIndex = -1;
      switch (period) {
        case 'week': bucketIndex = chartData.findIndex(d => d.date === taskDate); break;
        case 'month': bucketIndex = chartData.findIndex(d => taskDate >= d.startDate && taskDate <= d.endDate); break;
        case 'year': bucketIndex = new Date(taskDate).getMonth(); break;
      }

      if (bucketIndex !== -1 && chartData[bucketIndex]) {
        chartData[bucketIndex][category] += duration;
      }
    }
  });

  const totals = { MVT: 0, Priority: 0, Personal: 0, Recharge: 0, Media: 0, Meeting: 0 };
  chartData.forEach(bucket => categories.forEach(cat => totals[cat] += bucket[cat] || 0));

  return { chartData, totals, periodLabels };
}
