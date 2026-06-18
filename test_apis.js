const http = require('http');

function makeRequest(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log("=== Testing Distributed Compute (Map-Reduce) ===");
  try {
    const computeRes = await makeRequest('/api/tasks/compute', {
      dataset: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      code: "output = dataset.map(x => x * 2);"
    });
    console.log("Compute Result:", computeRes);
  } catch (e) {
    console.error("Compute Error:", e);
  }

  console.log("\n=== Testing VeriLLM Inference ===");
  try {
    const inferRes = await makeRequest('/api/tasks/inference', {
      prompt: "Explain quantum computing"
    });
    console.log("Inference Result:", inferRes);
  } catch (e) {
    console.error("Inference Error:", e);
  }
}

runTests();
