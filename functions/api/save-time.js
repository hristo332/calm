// functions/api/save-time.js
// Cloudflare Pages Function - saves tracked time to Notion

export async function onRequest(context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  if (context.request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers }
    );
  }

  const NOTION_API_KEY = context.env.NOTION_API_KEY;

  if (!NOTION_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'Missing configuration' }),
      { status: 500, headers }
    );
  }

  try {
    const body = await context.request.json();
    const { taskId, seconds } = body;

    if (!taskId || typeof seconds !== 'number') {
      return new Response(
        JSON.stringify({ error: 'Missing taskId or seconds' }),
        { status: 400, headers }
      );
    }

    // Convert seconds to hours (decimal)
    const hours = parseFloat((seconds / 3600).toFixed(2));

    // First, get current Actual Duration value
    const getResponse = await fetch(`https://api.notion.com/v1/pages/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28'
      }
    });

    if (!getResponse.ok) {
      const error = await getResponse.text();
      return new Response(
        JSON.stringify({ error: 'Failed to get page', details: error }),
        { status: getResponse.status, headers }
      );
    }

    const pageData = await getResponse.json();
    const currentDuration = pageData.properties?.['Actual Duration']?.number || 0;
    const newDuration = currentDuration + hours;

    // Update the page with new Actual Duration
    const updateResponse = await fetch(`https://api.notion.com/v1/pages/${taskId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          'Actual Duration': {
            number: newDuration
          }
        }
      })
    });

    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      return new Response(
        JSON.stringify({ error: 'Failed to update page', details: error }),
        { status: updateResponse.status, headers }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        taskId,
        addedHours: hours,
        totalHours: newDuration
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
