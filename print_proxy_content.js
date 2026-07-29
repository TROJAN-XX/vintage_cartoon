async function printContent() {
  const url = 'http://localhost:5173/ia-proxy/download/jackie-chan-adventures-s-01-e-10-the-jade-monkey-remastered-1080p-x-265-10bit-web-dl-multi-audio-hq/Jackie%20Chan%20Adventures%20S01E01%28The%20Dark%20Hand%29-Remastered%201080p%20x265%2010bit%20WEB-DL%20Multi%20Audio%20%5BHQ%5D.mkv';
  const res = await fetch(url);
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('HTML content:');
  console.log(text);
}
printContent();
