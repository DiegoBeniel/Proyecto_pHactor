
require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

async function limpiar() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Conectado a MongoDB...');

  const db = mongoose.connection.db;
  const colecciones = await db.listCollections().toArray();

  for (const col of colecciones) {
    await db.collection(col.name).drop();
    console.log(`  Eliminada: ${col.name}`);
  }

  console.log('Base de datos limpia. Ya puedes arrancar el servidor.');
  process.exit(0);
}

limpiar().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});