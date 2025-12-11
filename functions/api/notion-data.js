// functions/api/notion-data.js
// Cloudflare Pages Function - proxies Notion API with date/period filtering

export async function onRequest(context) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=60'
  };

  // Handle preflight
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  // Get secrets from environment
  const NOTION_API_KEY = context.env.NOTION_API_KEY;
  const DATABASE_ID = context.env.NOTION_DATABASE_ID;

  if (!NOTION_API_KEY || !DATABASE_ID) {
    return new Response(
      JSON.stringify({ error: 'Missing configuration. Set NOTION_API_KEY and NOTION_DATABASE_ID in Cloudflare.' }),
      { status: 500, headers }
    );
  }

  try {
    // Parse URL parameters
    const url = new URL(context.request.url);
    const dateParam = url.searchParams.get('date'); // YYYY-MM-DD
    const periodParam = url.searchParams.get('period') || 'week'; // day, week, month, year

    // Calculate date range based on period
    const { startDate, endDate, periodLabels } = calculateDateRange(dateParam, periodParam);

    // Query Notion
    const response = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filter: {
          and: [
            {
              property: 'Date',
              date: { on_or_after: startDate }
            },
            {
              property: 'Date', 
              date: { on_or_before: endDate }
            },
            {
              property: 'Status',
              select: { equals: 'Completed' }
            }
          ]
        },
        page_size: 100
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Notion API error:', error);
      return new Response(
        JSON.stringify({ error: 'Notion API error', details: error }),
        { status: response.status, headers }
      );
    }

    const data = await response.json();

    // Transform to chart format based on period
    const chartData = transformToChartData(data.results, startDate, endDate, periodParam, periodLabels);

    return new Response(
      JSON.stringify({
        ...chartData,
        period: periodParam,
        dateRange: {
          start: startDate,
          end: endDate
        },
        selectedDate: dateParam || new Date().toISOString().split('T')[0],
        tasksProcessed: data.results.length,
        generatedAt: new Date().toISOString()
      }),
      { headers }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal error', message: error.message }),
      { status: 500, headers }
    );
  }
}

function calculateDateRange(dateParam, period) {
  // Use provided date or today
  const baseDate = dateParam ? new Date(dateParam + 'T12:00:00Z') : new Date();
  
  let startDate, endDate;
  let periodLabels = [];

  switch (period) {
    case 'day':
      // Single day
      startDate = new Date(baseDate);
      endDate = new Date(baseDate);
      periodLabels = [formatDayLabel(baseDate)];
      break;

    case 'week':
      // Monday to Sunday of the week containing baseDate
      const dayOfWeek = baseDate.getDay();
      startDate = new Date(baseDate);
      startDate.setDate(baseDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      periodLabels = ['Пон', 'Вт', 'Ср', 'Чет', 'Пет', 'Съб', 'Нед'];
      break;

    case 'month':
      // Full month containing baseDate
      startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
      endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
      // Generate week labels for the month
      periodLabels = generateWeekLabels(startDate, endDate);
      break;

    case 'year':
      // Full year containing baseDate
      startDate = new Date(baseDate.getFullYear(), 0, 1);
      endDate = new Date(baseDate.getFullYear(), 11, 31);
      periodLabels = ['Яну', 'Фев', 'Мар', 'Апр', 'Май', 'Юни', 'Юли', 'Авг', 'Сеп', 'Окт', 'Ное', 'Дек'];
      break;

    default:
      // Default to week
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
  const categories = ['MVT', 'Priority', 'Personal', 'Recharge'];
  
  // Initialize data structure based on period
  let chartData;
  
  switch (period) {
    case 'day':
      chartData = [{
        label: periodLabels[0],
        date: startDate,
        MVT: 0, Priority: 0, Personal: 0, Recharge: 0
      }];
      break;

    case 'week':
      chartData = periodLabels.map((label, index) => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + index);
        return {
          label,
          date: date.toISOString().split('T')[0],
          MVT: 0, Priority: 0, Personal: 0, Recharge: 0
        };
      });
      break;

    case 'month':
      // Group by weeks
      const start = new Date(startDate);
      chartData = periodLabels.map((label, index) => {
        const weekStart = new Date(start);
        weekStart.setDate(start.getDate() + (index * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return {
          label,
          startDate: weekStart.toISOString().split('T')[0],
          endDate: weekEnd.toISOString().split('T')[0],
          MVT: 0, Priority: 0, Personal: 0, Recharge: 0
        };
      });
      break;

    case 'year':
      // Group by months
      const year = new Date(startDate).getFullYear();
      chartData = periodLabels.map((label, index) => ({
        label,
        month: index,
        year: year,
        MVT: 0, Priority: 0, Personal: 0, Recharge: 0
      }));
      break;
  }

  // Aggregate tasks into chart data
  tasks.forEach(task => {
    const props = task.properties;
    const taskDate = props?.Date?.date?.start;
    const category = props?.Category?.select?.name;
    
    // Get Start and End time
    const startTime = props?.['Start Time']?.select?.name || props?.['Start']?.select?.name;
    const endTime = props?.['End Time']?.select?.name || props?.['End']?.select?.name;
    
    if (!taskDate || !category || !startTime || !endTime) return;
    if (!categories.includes(category)) return;

    // Calculate duration in hours
    const startParts = startTime.split(':').map(Number);
    const endParts = endTime.split(':').map(Number);
    const startMinutes = startParts[0] * 60 + (startParts[1] || 0);
    const endMinutes = endParts[0] * 60 + (endParts[1] || 0);
    const duration = (endMinutes - startMinutes) / 60;

    if (duration <= 0) return;

    // Find the right bucket based on period
    let bucketIndex = -1;
    
    switch (period) {
      case 'day':
        bucketIndex = 0;
        break;

      case 'week':
        bucketIndex = chartData.findIndex(d => d.date === taskDate);
        break;

      case 'month':
        // Find which week this date falls into
        const taskDateObj = new Date(taskDate);
        bucketIndex = chartData.findIndex(d => 
          taskDate >= d.startDate && taskDate <= d.endDate
        );
        break;

      case 'year':
        // Find which month
        const taskMonth = new Date(taskDate).getMonth();
        bucketIndex = taskMonth;
        break;
    }

    if (bucketIndex !== -1 && chartData[bucketIndex]) {
      chartData[bucketIndex][category] += duration;
    }
  });

  // Calculate totals
  const totals = { MVT: 0, Priority: 0, Personal: 0, Recharge: 0 };
  chartData.forEach(bucket => {
    categories.forEach(cat => {
      totals[cat] += bucket[cat] || 0;
    });
  });

  return {
    chartData,
    totals,
    periodLabels
  };
}
