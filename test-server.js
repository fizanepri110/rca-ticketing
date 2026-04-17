const fetch = require('node-fetch');
async function test() {
  const r = await fetch('http://localhost:3000');
  console.log('STATUS:', r.status);
}
test();