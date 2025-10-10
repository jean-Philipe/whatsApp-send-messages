const express = require('express');
const multer = require('multer');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3001;

// Middleware personalizado para detectar el tipo de contenido
app.use((req, res, next) => {
  const contentType = req.get('Content-Type');
  
  // Si es multipart/form-data, no procesar aquí (multer lo hará)
  if (contentType && contentType.includes('multipart/form-data')) {
    return next();
  }
  
  // Si es application/octet-stream (binary data), procesar como buffer
  if (contentType && contentType.includes('application/octet-stream')) {
    let data = [];
    req.on('data', chunk => {
      data.push(chunk);
    });
    req.on('end', () => {
      req.body = Buffer.concat(data);
      req.binaryData = true;
      next();
    });
    return;
  }
  
  // Para otros tipos de contenido, usar middleware estándar
  if (!contentType || contentType.includes('application/json')) {
    express.json({ limit: '50mb' })(req, res, next);
  } else if (contentType.includes('application/x-www-form-urlencoded')) {
    express.urlencoded({ extended: true, limit: '50mb' })(req, res, next);
  } else {
    next();
  }
});


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

// Endpoint para enviar con archivo usando multipart/form-data
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

// Endpoint para enviar archivo como binary data
app.post('/send-binary', async (req, res) => {
  try {
    // Verificar si hay datos binarios
    if (!req.binaryData || !Buffer.isBuffer(req.body)) {
      return res.status(400).json({ 
        error: 'No se recibieron datos binarios válidos'
      });
    }

    // Obtener parámetros de query string o headers
    const numero = req.query.numero || req.get('X-Numero');
    const mensaje = req.query.mensaje || req.get('X-Mensaje');
    const fileName = req.query.filename || req.get('X-Filename') || 'archivo.bin';
    const mimeType = req.query.mimetype || req.get('X-Mimetype') || 'application/octet-stream';

    if (!numero || !mensaje) {
      return res.status(400).json({ 
        error: 'Faltan campos requeridos: numero y mensaje (usar query params o headers X-Numero, X-Mensaje)'
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

    // Crear MessageMedia con los datos binarios
    const media = new MessageMedia(mimeType, req.body.toString('base64'), fileName);
    await client.sendMessage(chatId, media, { caption: mensaje });

    res.json({ 
      status: 'Mensaje con archivo binario enviado correctamente',
      destinatario: numeroLimpio,
      archivo_adjunto: fileName,
      tamano_archivo: req.body.length
    });
  } catch (error) {
    console.error('Error al enviar mensaje binario:', error);
    res.status(500).json({ 
      error: 'Error al enviar mensaje binario',
      detalle: error.message
    });
  }
});

// Endpoint de información
app.get('/', (req, res) => {
  res.json({ 
    status: 'Servidor WhatsApp funcionando correctamente',
    endpoints: {
      'POST /send': {
        description: 'Enviar mensaje de WhatsApp con archivo usando multipart/form-data',
        method: 'multipart/form-data',
        fields: ['numero', 'mensaje', 'archivo (opcional)']
      },
      'POST /send-binary': {
        description: 'Enviar archivo como binary data',
        method: 'application/octet-stream',
        parameters: 'numero, mensaje, filename, mimetype (via query params or headers)',
        headers: ['X-Numero', 'X-Mensaje', 'X-Filename', 'X-Mimetype']
      }
    },
    examples: {
      multipart: 'curl -X POST -F "numero=1234567890" -F "mensaje=Hola" -F "archivo=@archivo.pdf" http://localhost:3001/send',
      binary: 'curl -X POST -H "Content-Type: application/octet-stream" -H "X-Numero: 1234567890" -H "X-Mensaje: Hola" -H "X-Filename: archivo.pdf" -H "X-Mimetype: application/pdf" --data-binary @archivo.pdf http://localhost:3001/send-binary'
    }
  });
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
