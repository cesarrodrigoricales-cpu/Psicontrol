// ── Esta función es llamada desde reportes.js ──────────────────────────────
window.llenarReporte = function({
  nivel,
  fecha,
  psicologo,
  estudiantes,
  atenciones
}) {
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];


  // Meta
  document.getElementById('badge-nivel').textContent  = nivel || 'General';
  document.getElementById('meta-fecha').textContent    = fecha || '—';
  document.getElementById('meta-psicologo').textContent = psicologo ? '👩‍⚕️ ' + psicologo : '';
  document.getElementById('pie-fecha').textContent     = fecha || '—';

  // Stats
  const idsFilt = estudiantes.map(e => e.id);
  const atFilt  = atenciones.filter(a => idsFilt.includes(a.idestudiante));
  document.getElementById('s-estudiantes').textContent = estudiantes.length;
  document.getElementById('s-atenciones').textContent  = atFilt.length;
  document.getElementById('s-pendientes').textContent  = atFilt.filter(a => a.estado === 'pendiente').length;
  document.getElementById('s-cerradas').textContent    = atFilt.filter(a => a.estado === 'cerrado').length;

  // ── Gráfico meses ──────────────────────────────────────────────────
  const conteoMeses = new Array(12).fill(0);
  atFilt.forEach(a => {
    if (a.fechahora) conteoMeses[new Date(a.fechahora).getMonth()]++;
  });
 new Chart(document.getElementById('g-meses'), {
    type: 'bar',
    data: {
      labels: meses,
      datasets: [{
        label: 'Atenciones',
        data: conteoMeses,
        backgroundColor: conteoMeses.map((_, i) =>
          i % 2 === 0 ? '#C0392B' : '#E74C3C'
        ),
        borderRadius: 5,
        barThickness: 35,  
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } },
        x: { grid: { display: false } }  
      }
    }
  });

 // ── Gráfico género ─────────────────────────────────────────────────
const nivelActual = (nivel || '').toLowerCase();

if (nivelActual === 'secundaria') {
const totalMujeres = estudiantes.filter(e => e.genero?.toLowerCase().includes('femen')).length;  document.getElementById('g-genero').closest('.grafico-card').innerHTML = `
    <div class="grafico-titulo">👩 Estudiantes por género</div>
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:140px;gap:8px;">
      <div style="font-size:48px;font-family:'Playfair Display',serif;color:#C0392B;font-weight:700;">${totalMujeres}</div>
      <div style="font-size:12px;color:#666;text-transform:uppercase;letter-spacing:.5px;">Total mujeres atendidas</div>
      <span style="background:#FADBD8;color:#922B21;padding:3px 14px;border-radius:20px;font-size:11px;font-weight:700;">Femenino — Secundaria</span>
    </div>`;
} else {
  const masc = estudiantes.filter(e => e.genero === 'Masculino').length;
  const fem  = estudiantes.filter(e => e.genero === 'Femenino').length;
  const otro = estudiantes.filter(e => e.genero !== 'Masculino' && e.genero !== 'Femenino').length;

  const labG = [], datG = [], colG = [];
  if (fem  > 0) { labG.push('Femenino');  datG.push(fem);  colG.push('#C0392B'); }
  if (masc > 0) { labG.push('Masculino'); datG.push(masc); colG.push('#1A5276'); }
  if (otro > 0) { labG.push('Otro');      datG.push(otro); colG.push('#7D6608'); }

  new Chart(document.getElementById('g-genero'), {
    type: 'doughnut',
    data: { labels: labG, datasets: [{ data: datG, backgroundColor: colG, borderWidth: 2 }] },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 11 } } },
        datalabels: {
          color: '#fff',
          font: { size: 14, weight: 'bold' },
          formatter: (value) => value
        }
      }
    },
    plugins: [ChartDataLabels]
  });
}

  // ── Gráfico por grado ──────────────────────────────────────────────
  const gradosMap = {};
  atFilt.forEach(a => {
    const est  = estudiantes.find(e => e.id == a.idestudiante);
    const grad = est?.grado || a.grado || '?';
    gradosMap[grad] = (gradosMap[grad] || 0) + 1;
  });
  const gradosOrden = Object.keys(gradosMap).sort((a, b) => Number(a) - Number(b));
 
   new Chart(document.getElementById('g-grado'), {
    type: 'bar',
    data: {
      labels: gradosOrden.map(g => g + '°'),
      datasets: [{
        label: 'Atenciones',
        data: gradosOrden.map(g => gradosMap[g]),
        backgroundColor: '#F1C40F',
        borderColor: '#B7950B',
        borderWidth: 1,
        borderRadius: 6,
        barThickness: 40,  // ← agrega esto
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } },
        x: { grid: { display: false } }  // ← agrega esto
      }
    }
  });
  // ── Gráfico por sección ────────────────────────────────────────────
  const seccionMap = {};
  atFilt.forEach(a => {
    const est = estudiantes.find(e => e.id == a.idestudiante);
    const sec = est?.seccion || a.seccion || '?';
    seccionMap[sec] = (seccionMap[sec] || 0) + 1;
  });
  const secsOrden = Object.keys(seccionMap).sort();
  new Chart(document.getElementById('g-seccion'), {
    type: 'bar',
    data: {
      labels: secsOrden,
      datasets: [{
        label: 'Atenciones',
        data: secsOrden.map(s => seccionMap[s]),
        backgroundColor: ['#C0392B','#E74C3C','#F1C40F','#B7950B','#1A5276'],
        borderRadius: 6,
        barThickness: 40,  // ← controla el grosor
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } },
        x: { grid: { display: false } }
      }
    }
  });

  
};
