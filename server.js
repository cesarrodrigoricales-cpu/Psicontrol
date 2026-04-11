const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'Public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Public', 'index.html'));
});

app.use('/api/roles',           require('./routes/roles'));
app.use('/api/personas',        require('./routes/personas'));
app.use('/api/estudiantes',     require('./routes/estudiantes'));
app.use('/api/colaboradores',   require('./routes/colaboradores'));
app.use('/api/atenciones',      require('./routes/atenciones'));
app.use('/api/monitoreos',      require('./routes/monitoreos'));
app.use('/api/intervenciones',  require('./routes/intervenciones'));
app.use('/api/motivosconsulta', require('./routes/motivosconsulta'));

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`Servidor activo en http://localhost:${PORT}`);
});