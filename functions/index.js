/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { onRequest, config } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const express = require('express');
const axios = require('axios');
const { db, firebaseConfig } = require('./config/firebase');
const admin = require('firebase-admin');
const { MercadoPagoConfig } = require('mercadopago');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || config().supabase?.service_key;
const supabase = createClient(supabaseUrl, supabaseKey);
const crypto = require('crypto');
const path = require('path');
/* const { DateTime } = require("luxon"); */

// --- FUNCIÓN AUXILIAR PARA ENVIAR NOTIFICACIONES AL DUEÑO DE LA APP ---
async function sendOwnerNotification(title, body) {
  const ownerEmail = process.env.APP_OWNER_EMAIL;

  if (!ownerEmail) {
    console.error('❌ La variable de entorno APP_OWNER_EMAIL no está configurada. No se puede enviar la notificación.');
    return;
  }

  try {
    // 1. Buscar el token del dueño en la tabla 'profiles'
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('expo_push_token')
      .eq('email', ownerEmail) // Usa el email de la variable de entorno
      .single();

    if (error || !profile) {
      console.warn(`No se encontró el perfil del dueño con email ${ownerEmail}.`);
      return;
    }

    if (!profile.expo_push_token) {
      console.log(`🔔 El dueño (${ownerEmail}) no tiene un token de notificación. Se omite el envío.`);
      return;
    }

    // 2. Construir y enviar el mensaje
    const message = {
      to: profile.expo_push_token,
      sound: 'default',
      title: title,
      body: body,
      data: { type: 'payment_received' },
    };

    await axios.post('https://exp.host/--/api/v2/push/send', message, {
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
    });

    console.log(`✅ Notificación push enviada exitosamente al dueño (${ownerEmail}).`);

  } catch (e) {
    console.error(`❌ Falló el envío de la notificación push al dueño:`, e.message);
  }
}

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));



  
  // Ruta para notificaciones IPN de Mercado Pago
app.all('/ipn', async (req, res) => {
  try {
    // Tomar siempre los parámetros de la URL (query string)
    const { topic, id } = req.query;

    if (!topic || !id) {
      console.warn('⚠️ Faltan parámetros topic o id en la notificación IPN');
      return res.status(400).send('Faltan parámetros');
    }

    let resourceUrl = '';
    let resourceType = '';
    switch (topic) {
      case 'payment':
        console.log("payment:",id)
        resourceUrl = `https://api.mercadopago.com/v1/payments/${id}`;
        resourceType = 'payment';
        break;
      case 'merchant_order':
        resourceUrl = `https://api.mercadopago.com/merchant_orders/${id}`;
        resourceType = 'merchant_order';
        break;
      case 'chargebacks':
        resourceUrl = `https://api.mercadopago.com/v1/chargebacks/${id}`;
        resourceType = 'chargebacks';
        break;
      default:
        console.log(`🔔 Topic no manejado: ${topic}`);
        return res.status(200).send('Topic ignorado');
    }

    // Consultar el recurso en Mercado Pago
    const resourceResponse = await axios.get(resourceUrl, {
      headers: {
        Authorization: `Bearer ${process.env.ACCESS_TOKEN}`
      }
    });

    const resourceData = resourceResponse.data;
    console.log(`🔔 Notificación IPN recibida [${topic}] id: ${id}`, resourceData);

    // Preparar datos para guardar en Firestore
    let orderData = {
      topic,
      resourceType,
      resourceId: id,
      fecha_notificacion: new Date().toISOString(),
      raw: resourceData
    };

    // Extraer información relevante según el tipo de recurso
    if (resourceType === 'payment') {
      orderData = {
        ...orderData,
        metodo_pago: 'MP',
        estado_pago: resourceData.status,
        estado_pago_detalle: resourceData.status_detail,
        fecha_pedido: resourceData.date_created ? new Date(resourceData.date_created).getTime() : null,
        fecha_aprobado: resourceData.date_approved ? new Date(resourceData.date_approved).getTime() : null,
        email: resourceData.payer?.email || 'No proporcionado',
        monto_total: resourceData.transaction_amount,
        telefono: resourceData.metadata?.telefono || null
      };
    } else if (resourceType === 'merchant_order') {
      orderData = {
        ...orderData,
        estado_orden: resourceData.status,
        total_orden: resourceData.total_amount,
        email: resourceData.payer?.email || 'No proporcionado',
        pagos: resourceData.payments || [],
        shipments: resourceData.shipments || []
      };
    } else if (resourceType === 'chargebacks') {
      orderData = {
        ...orderData,
        estado_contracargo: resourceData.status,
        monto_contracargo: resourceData.amount,
        motivo: resourceData.reason,
        fecha_creacion: resourceData.date_created
      };
    }

    // Guardar en la colección 'pagos' usando el id del recurso
    await db.collection('pagos').doc(id).set(orderData, { merge: true });
    console.log(`✅ Notificación IPN [${topic}] id: ${id} guardada en Firestore.`);

    // Si es un pago, guardar también en Supabase
    if (resourceType === 'payment' && orderData.estado_pago === 'approved') {
      try {
        const supabaseOrderData = {
          email: orderData.email,
          estado_pago: orderData.estado_pago,
          estado_pago_detalle: orderData.estado_pago_detalle,
          fecha_aprobado: orderData.fecha_aprobado ? new Date(orderData.fecha_aprobado).toISOString() : null,
          fecha_pedido: orderData.fecha_pedido ? new Date(orderData.fecha_pedido).toISOString() : null,
          metodo_pago: orderData.metodo_pago,
          monto_total: orderData.monto_total,
          transferencia_id: id, // Usar el id de la notificación
        };

        const { data: supabaseData, error } = await supabase
          .from('pagos')
          .insert([supabaseOrderData]);

        if (error) {
          throw error;
        }

        console.log(`✅ Notificación IPN [${topic}] id: ${id} guardada en Supabase.`);

        // --- LLAMADA ACTUALIZADA A LA FUNCIÓN DE NOTIFICACIÓN ---
        const payerEmail = orderData.email;
        const amount = orderData.monto_total;
        const notificationTitle = `¡Recibiste $${amount}!`;
        const notificationBody = `Has recibido una nueva transferencia de ${payerEmail}.`;
        
        await sendOwnerNotification(notificationTitle, notificationBody);
        // --- FIN DE LA LÓGICA DE NOTIFICACIÓN ---

      } catch (supabaseError) {
        console.error(`❌ Error al guardar IPN en Supabase [${id}]:`, supabaseError.message);
      }
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error('❌ Error en IPN:', {
      error: error.message,
      body: req.body,
      query: req.query,
      headers: req.headers
    });
    return res.status(500).send(error.message);
  }
});

// Middleware de autenticación
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).send('Acceso no autorizado: Token no proporcionado');
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error('Error al verificar el token:', error);
        return res.status(403).send('Acceso no autorizado: Token inválido');
    }
};

app.post('/webhook', async (req, res) => {
  console.log("req:",req.body)
  console.log(process.env.ACCESS_TOKEN_SECRET)
  try {
    // 1. Validar firma HMAC
    const signatureHeader = req.headers['x-signature'];
    
    // Verificar si existe la cabecera de firma
    if (!signatureHeader) {
      console.warn('⚠️ Falta cabecera x-signature');
      return res.status(401).send('Firma ausente');
    }
    
    // Extraer timestamp y firma del header x-signature
    // Formato esperado: ts=1704908010,v1=618c85345248dd820d5fd456117c2ab2ef8eda45a0282ff693eac24131a5e839
    const parts = signatureHeader.split(',');
    let ts = null;
    let receivedHash = null;
    console.log(parts)
    // Extraer valores de timestamp y hash
    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key && value) {
        const trimmedKey = key.trim();
        const trimmedValue = value.trim();
        if (trimmedKey === 'ts') {
          ts = trimmedValue;
        } else if (trimmedKey === 'v1') {
          receivedHash = trimmedValue;
        }
      }
    }
    
    if (!ts || !receivedHash) {
      console.warn('⚠️ Formato de firma inválido');
      return res.status(401).send('Formato de firma inválido');
    }
    
    const xRequestId = req.headers['x-request-id'] || '';
    const dataId = req.body.data?.id || '';
    
    // Generar el manifest según la documentación de MercadoPago
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    
    // Generar la firma HMAC
    const generatedSignature = crypto
      .createHmac('sha256', process.env.ACCESS_TOKEN_SECRET)
      .update(manifest)
      .digest('hex');
    
    console.log('Manifest:', manifest);
    console.log('Generated Signature:', generatedSignature);
    console.log('Received Hash:', receivedHash);
    
    if (receivedHash !== generatedSignature) {
      console.warn('⚠️ Intento de acceso no autorizado - Firma no coincide');
      return res.status(401).send('Firma inválida');
    }

    // 2. Procesar tipo de evento
    const { type, data } = req.body;
    
    if (type !== 'payment') {
      console.log(`🔔 Evento no manejado: ${type}`);
      return res.status(200).send('Evento ignorado');
    }

    // 3. Obtener datos del pago
    const paymentId = data.id;
    const paymentResponse = await axios.get(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.ACCESS_TOKEN}`
        }
      }
    );

    const paymentData = paymentResponse.data;
    console.log(paymentData)
    const { status, status_detail, metadata } = paymentData;



    // 5. Manejar diferentes estados de pago
    if (status === 'approved') {
      // Crear objeto de orden
      const orderData = {
        metodo_pago: 'MP',
        estado_pago: status,
        estado_pago_detalle: status_detail,
        fecha_pedido: paymentData.date_created ? new Date(paymentData.date_created).getTime() : null,
        fecha_aprobado: paymentData.date_approved ? new Date(paymentData.date_approved).getTime() : null,
        email: paymentData.payer?.email || 'No proporcionado',
        monto_total: paymentData.transaction_amount,
      };

      // Guardar en Firestore
      await db.collection('pagos').doc(paymentId).set(orderData);
      console.log(`✅ Pago aprobado [${paymentId}] para `);


      
      // Enviar notificación de pago aprobado
      /* try {
        await axios.post('https://n8nctrlsys.zapto.org/webhook/66b8c6a0-63da-4187-9d01-873d03b9dddb', {
          external_reference: metadata.telefono,
          paymentId: paymentId,
          monto_total: paymentData.transaction_amount,
        });
        console.log(`🚀 Notificación enviada para ${metadata.telefono} [${paymentId}]`);
      } catch (notificationError) {
        console.error(`❌ Error al enviar notificación para ${metadata.telefono} [${paymentId}]:`, notificationError.message);
      } */
    } else if (status === 'rejected') {
      // Crear objeto de orden rechazada
      const orderData = {
        metodo_pago: 'MP',
        estado_pago: status,
        estado_pago_detalle: status_detail,
        telefono: metadata.telefono,
        fecha_pedido: paymentData.date_created ? new Date(paymentData.date_created).getTime() : null,
        fecha_rechazo: new Date().getTime(),
        email: paymentData.payer?.email || 'No proporcionado',
        monto_total: paymentData.transaction_amount,
      };

      // Guardar en Firestore
      await db.collection('pagos').doc(paymentId).set(orderData);
      console.log(`❌ Pago rechazado [${paymentId}] para : ${status_detail}`);
    } else {
      // Registrar otros estados en consola
      const logData = {
        estado: status,
        detalle: status_detail,
        monto: paymentData.transaction_amount,
        telefono: metadata.telefono,
        fecha: new Date().toISOString()
      };
      
      console.log(`ℹ️ Estado de pago [${status.toUpperCase()}]:`, JSON.stringify(logData, null, 2));
    }


    res.sendStatus(200);

  } catch (error) {
    console.log(error)
    console.error('❌ Error en webhook:', {
      error: error.message,
      body: req.body,
      headers: req.headers
    });
    res.status(500).send(error.message);
  }
});


app.get('/firebase-config', authenticateToken, (req, res) => {
  res.json(firebaseConfig);
});

app.get('/pagos', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pagos.html'));
});
  
  
  // Register the Express app as a Cloud Function
  exports.ctrlMP = onRequest({
    cors: true,
    region: 'us-central1',
    maxInstances: 10
  }, app);
