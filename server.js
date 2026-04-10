const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware para JSON
app.use(express.json());

// Servir archivos estáticos (HTML, CSS, JS)
app.use(express.static(path.join(__dirname)));

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// API opcional (pacientes)
app.get('/pacientes', (req, res) => {
  res.json({ message: 'API de pacientes funcionando' });
});

app.listen(PORT, () => {
  console.log(`Servidor activo en http://localhost:${PORT}`);
});