// netlify/functions/submission-created.js
const nodemailer = require("nodemailer");

exports.handler = async (event) => {
  try {
    const { payload } = JSON.parse(event.body || "{}");
    const data = payload?.data || {};
    const to = (data.email || data.correo || "").trim();
    const name = (data.name || data.nombre || "amigo/a").trim();
    const message = (data.message || data.mensaje || "").trim();
    const reason = (data.reason || data.motivo || "").trim();
    if (!to) return { statusCode: 200, body: "skip" };

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
    });

    const from = process.env.MAIL_FROM || `Bar Jalui Jopi <${process.env.GMAIL_USER}>`;
    const replyTo = process.env.MAIL_REPLYTO || process.env.GMAIL_USER;
    const notifyTo = process.env.NOTIFY_TO || process.env.GMAIL_USER;

    // Auto-reply
    await transporter.sendMail({
      from,
      to,
      replyTo,
      subject: "Gracias por escribir a Bar Jalui Jopi",
      text: [
        `Hola ${name},`,
        `Hemos recibido tu mensaje y te responderemos lo antes posible.`,
        reason ? `Motivo: ${reason}` : "",
        message ? `Mensaje: ${message}` : "",
        "",
        "— Bar Jalui Jopi"
      ].filter(Boolean).join("\n")
    });

    // Notify us
    await transporter.sendMail({
      from,
      to: notifyTo,
      subject: "Nueva consulta desde la web — Jalui Jopi",
      text: [
        `Nombre: ${name}`,
        `Email: ${to}`,
        reason ? `Motivo: ${reason}` : "",
        message ? `Mensaje: ${message}` : ""
      ].filter(Boolean).join("\n")
    });

    return { statusCode: 200, body: "ok" };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: "error" };
  }
};
