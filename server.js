const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

console.log('Ruta Public:', path.join(__dirname, 'Public'));
console.log('Ruta primaria:', path.join(__dirname, 'Public', 'primaria'));

app.use(cors());
app.use(express.json());

// 🔵 Archivos estáticos
app.use(express.static(path.join(__dirname, 'Public')));

// 🔵 APIs
app.use('/api/roles', require('./routes/roles'));
app.use('/api/personas', require('./routes/personas'));
app.use('/api/estudiantes', require('./routes/estudiantes'));
app.use('/api/colaboradores', require('./routes/colaboradores'));
app.use('/api/atenciones', require('./routes/atenciones'));
app.use('/api/monitoreos', require('./routes/monitoreos'));
app.use('/api/intervenciones', require('./routes/intervenciones'));
app.use('/api/motivosconsulta', require('./routes/motivosconsulta'));
app.use('/api/contacto-emergencia', require('./routes/contacto_emergencia'));
app.use('/api/calendario-eventos', require('./routes/calendario_eventos'));

// 🔵 FALLBACK — solo para rutas sin extensión
app.use((req, res, next) => {
  if (!req.path.includes('.')) {
    res.sendFile(path.join(__dirname, 'Public', 'index.html'));
  } else {
    res.status(404).send('Archivo no encontrado: ' + req.path);
  }
});

// 🔴 ERROR HANDLER
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`Servidor activo en http://localhost:${PORT}`);
});