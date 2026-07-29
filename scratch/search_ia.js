async function testCors() {
  const url = 'https://archive.org/download/jackie-chan-adventures-s-01-e-10-the-jade-monkey-remastered-1080p-x-265-10bit-web-dl-multi-audio-hq/Jackie%20Chan%20Adventures%20S01E01%28The%20Dark%20Hand%29-Remastered%201080p%20x265%2010bit%20WEB-DL%20Multi%20Audio%20%5BHQ%5D.mp4';
  try {
    const res = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-100' } });
    console.log('Status Code:', res.status);
    console.log('CORS Origin Header:', res.headers.get('access-control-allow-origin'));
    console.log('CORS Methods Header:', res.headers.get('access-control-allow-methods'));
  } catch (err) {
    console.error('Error fetching:', err);
  }
}

testCors();
