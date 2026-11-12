const { spawn } = require('child_process');
const path = require('path');
const { runTests } = require('./api.test');

async function main() {
  console.log('🚀 Iniciando servidor backend de prueba...');
  const serverPath = path.join(__dirname, '../src/server.js');
  const server = spawn('node', [serverPath], {
    env: { ...process.env, PORT: 5000 },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  server.stdout.on('data', (d) => process.stdout.write('[Backend] ' + d.toString()));
  server.stderr.on('data', (d) => process.stderr.write('[Backend Err] ' + d.toString()));

  // Wait 1.5s for server to start listening
  await new Promise((r) => setTimeout(r, 1500));

  try {
    await runTests();
    console.log('🎉 ¡Todas las pruebas finalizaron con éxito!');
  } finally {
    console.log('🛑 Deteniendo servidor backend de prueba...');
    server.kill();
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Error in runner:', err);
  process.exit(1);
});
