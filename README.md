# 🧠 PsiControl — Sistema de Gestión Psicológica Escolar

Sistema web para el registro y seguimiento de atenciones psicológicas en instituciones educativas. Permite registrar estudiantes, gestionar sesiones, generar reportes y administrar el horario del consultorio.

---

## 🚀 ¿Qué hace este sistema?

- **Registrar estudiantes** con sus datos personales
- **Gestionar atenciones** (primera sesión y sesiones de seguimiento)
- **Ver historial** de todos los estudiantes registrados
- **Generar reportes en PDF** con estadísticas mensuales
- **Buscar estudiantes** en tiempo real
- **Configurar el consultorio** y horarios de atención

---

## 🛠️ Tecnologías usadas

| Parte | Tecnología |
|---|---|
| Frontend | HTML, CSS, JavaScript vanilla |
| Backend | Node.js + Express |
| ORM | Sequelize |
| Base de datos | MySQL |
| PDF | jsPDF |
| Gráficos | Chart.js |

---

## 📋 Requisitos previos

Antes de instalar, asegúrate de tener:

- [Node.js](https://nodejs.org/) v18 o superior
- [MySQL](https://www.mysql.com/) corriendo en tu máquina
- npm (viene incluido con Node.js)

---

## ⚙️ Instalación paso a paso

### 1. Clona el repositorio

```bash
git clone https://github.com/tu-usuario/psicontrol.git
cd psicontrol
```

### 2. Instala las dependencias

```bash
npm install
```

### 3. Configura la base de datos

Crea un archivo `.env` en la raíz del proyecto con tus datos de MySQL:

```env
DB_HOST=localhost
DB_PORT=
DB_NAME=psicontrol
DB_USER=
DB_PASS=
```

> ⚠️ **Importante:** Nunca subas el archivo `.env` a Git. Ya está incluido en el `.gitignore`.

### 4. Crea la base de datos en MySQL

Entra a MySQL y ejecuta:

```sql
CREATE DATABASE psicontrol;
```

### 5. Sincroniza los modelos (crea las tablas automáticamente)

```bash
node sync.js
```

> Si no tienes un `sync.js`, Sequelize puede crear las tablas al iniciar el servidor si tienes `sync()` configurado.

### 6. Inicia el servidor

```bash
node server.js
```

El servidor estará corriendo en: **http://localhost:3000**

---

## 📁 Estructura del proyecto

```
psicontrol/
│
├── Public/                  # Frontend (lo que ve el usuario)
│   ├── index.html           # Interfaz principal
│   ├── style.css            # Estilos
│   └── script.js            # Lógica del frontend
│
├── routes/                  # Rutas de la API
│   ├── estudiantes.js       # GET y POST de estudiantes
│   ├── atenciones.js        # CRUD de atenciones
│   ├── motivosconsulta.js   # Motivos de consulta
│   ├── personas.js          # Datos personales
│   ├── colaboradores.js     # Colaboradores
│   ├── monitoreos.js        # Monitoreos
│   ├── intervenciones.js    # Intervenciones
│   └── roles.js             # Roles de usuario
│
├── models/                  # Modelos Sequelize (tablas)
│   └── index.js             # Conexión a la base de datos
│
├── server.js                # Servidor principal Express
├── package.json             # Dependencias del proyecto
├── .env                     # Variables de entorno (NO subir a Git)
└── .gitignore               # Archivos ignorados por Git
```

---

## 🔌 API — Endpoints disponibles

### Estudiantes
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/estudiantes` | Lista todos los estudiantes |
| POST | `/api/estudiantes` | Registra un nuevo estudiante |

### Atenciones
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/atenciones` | Lista todas las atenciones |
| POST | `/api/atenciones` | Crea una nueva atención |
| PUT | `/api/atenciones/:id` | Actualiza una atención |
| DELETE | `/api/atenciones/:id` | Elimina una atención |

### Motivos de consulta
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/motivosconsulta` | Lista los motivos de consulta |

---

## 💡 Flujo principal del sistema

```
1. Entras a Nueva Atención
        ↓
2. Llenas los datos del estudiante (nombres, apellidos, etc.)
        ↓
3. Llenas los datos de la primera sesión (motivo, fecha, hora)
        ↓
4. Se guarda el estudiante en la BD y la sesión queda como "Pendiente"
        ↓
5. En "Atenciones" puedes confirmar o cerrar cada sesión
        ↓
6. En "Historial" ves todos los estudiantes registrados
        ↓
7. En "Reportes" generas un PDF con las estadísticas del mes
```

---

## 🐛 Problemas comunes

**Error 404 en POST /api/estudiantes**
→ Reinicia el servidor con `Ctrl+C` y vuelve a ejecutar `node server.js`

**Error de conexión a la base de datos**
→ Verifica que MySQL esté corriendo y que los datos del `.env` sean correctos

**Las tablas no existen**
→ Ejecuta `node sync.js` para que Sequelize las cree automáticamente

---

## 📄 Licencia

Este proyecto fue desarrollado con fines educativos.

---

