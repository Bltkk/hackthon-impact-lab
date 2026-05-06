const rateLimit = require("express-rate-limit");

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas solicitudes. Intenta de nuevo en un minuto." },
});

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100, // WhatsApp can fan out many messages
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { apiLimiter, webhookLimiter };
