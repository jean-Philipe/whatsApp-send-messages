const express = require('express');
const multer = require('multer');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3001;

// Middleware para parsear JSON y URL-encoded data (solo para rutas que no usan multer)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));


const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding'
    ]
  }
});

client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
  console.log('Escanea este código QR con tu WhatsApp');
});

client.on('ready', () => {
  console.log('✅ Cliente de WhatsApp está listo');
});

client.initialize();

// Configurar multer para manejar uploads de archivos
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB límite
    fieldSize: 50 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    // Aceptar todos los tipos de archivo
    cb(null, true);
  }
});

app.post('/send', upload.single('archivo'), async (req, res) => {
  const numero = req.body.numero;
  const mensaje = req.body.mensaje;
  const archivo = req.file;

  if (!numero || !mensaje) {
    return res.status(400).json({ 
      error: 'Faltan campos requeridos: numero y mensaje son obligatorios'
    });
  }

  // Limpiar y validar el número
  const numeroLimpio = numero.replace(/\D/g, '');
  const chatId = numeroLimpio + '@c.us';

  if (numeroLimpio.length < 8) {
    return res.status(400).json({ 
      error: 'Número de teléfono inválido (muy corto)'
    });
  }

  try {
    if (archivo) {
      const media = new MessageMedia(archivo.mimetype, archivo.buffer.toString('base64'), archivo.originalname);
      await client.sendMessage(chatId, media, { caption: mensaje });
    } else {
      await client.sendMessage(chatId, mensaje);
    }

    res.json({ 
      status: 'Mensaje enviado correctamente',
      destinatario: numeroLimpio,
      archivo_adjunto: archivo ? archivo.originalname : null
    });
  } catch (error) {
    console.error('Error al enviar mensaje:', error);
    res.status(500).json({ 
      error: 'Error al enviar mensaje',
      detalle: error.message
    });
  }
});

// Endpoint de información
app.get('/', (req, res) => {
  res.json({ 
    status: 'Servidor WhatsApp funcionando correctamente',
    endpoint: 'POST /send - Enviar mensaje de WhatsApp con o sin archivo'
  });
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
