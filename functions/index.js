/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const express = require('express');
const axios = require('axios');
const { db } = require('./config/firebase');
const { MercadoPagoConfig } = require('mercadopago');
require('dotenv').config();
const crypto = require('crypto');
const path = require('path');
/* const { DateTime } = require("luxon"); */
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));


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
    console.log(`✅ Notificación IPN procesada [${topic}] id: ${id}`);

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

app.get('/pagos', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pagos.html'));
});
  
  
  // Register the Express app as a Cloud Function
  exports.ctrlMP = onRequest({
    cors: true,
    region: 'us-central1',
    maxInstances: 10
  }, app);
  