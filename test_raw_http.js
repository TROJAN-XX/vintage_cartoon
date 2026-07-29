async function run() {
  try {
    const res = await fetch('http://localhost:5173/ia-proxy/test');
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Response text:', text);
  } catch (err) {
    console.error(err);
  }
}
run();
