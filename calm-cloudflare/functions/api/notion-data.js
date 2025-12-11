// functions/api/notion-data.js
// Cloudflare Pages Function - proxies Notion API

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
    // Calculate current week range (Monday to Sunday)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

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
              date: { on_or_after: monday.toISOString().split('T')[0] }
            },
            {
              property: 'Date', 
              date: { on_or_before: sunday.toISOString().split('T')[0] }
            },
            {
              property: 'Status',
              select: { equals: 'Completed' }
            }
          ]
        }
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

    // Transform to chart format
    const weekDays = ['Пон', 'Вт', 'Ср', 'Чет', 'Пет', 'Съб', 'Нед'];
    const weekData = weekDays.map((day, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return {
        day,
        date: date.toISOString().split('T')[0],
        MVT: 0,
        Priority: 0,
        Personal: 0,
        Recharge: 0
      };
    });

    // Aggregate by day and category
    data.results.forEach(task => {
      const props = task.properties;
      const taskDate = props?.Date?.date?.start;
      const category = props?.Category?.select?.name;
      
      // Get Start and End time - handle both "Start Time" and "Start" property names
      const startTime = props?.['Start Time']?.select?.name || props?.['Start']?.select?.name;
      const endTime = props?.['End Time']?.select?.name || props?.['End']?.select?.name;
      
      if (!taskDate || !category || !startTime || !endTime) return;

      // Calculate duration in hours
      const startParts = startTime.split(':').map(Number);
      const endParts = endTime.split(':').map(Number);
      const startMinutes = startParts[0] * 60 + startParts[1];
      const endMinutes = endParts[0] * 60 + endParts[1];
      const duration = (endMinutes - startMinutes) / 60;

      if (duration <= 0) return;

      const dayIndex = weekData.findIndex(d => d.date === taskDate);
      if (dayIndex !== -1 && weekData[dayIndex][category] !== undefined) {
        weekData[dayIndex][category] += duration;
      }
    });

    return new Response(
      JSON.stringify({
        weekData,
        generatedAt: new Date().toISOString(),
        weekRange: {
          start: monday.toISOString().split('T')[0],
          end: sunday.toISOString().split('T')[0]
        },
        tasksProcessed: data.results.length
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
