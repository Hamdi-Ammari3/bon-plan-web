// app/api/proxy-image/route.js

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  try {
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('Content-Type') || 'image/png';
    
    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Proxy image error:', error);
    return new Response('Failed to fetch image', { status: 500 });
  }
}

//http://localhost:3000/api/proxy-image?url=https://firebasestorage.googleapis.com/v0/b/waffer-741af.firebasestorage.app/o/posts%2F8phopaoKegbPIa0MQJcs%2Fthumb_1761040391566_Capture2.PNG?alt=media&token=60e33f04-140a-4ffe-af91-4671eed63632