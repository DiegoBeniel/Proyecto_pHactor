const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

async function enviarPasswordProvisional(to, nombre, tempPassword) {
  await transporter.sendMail({
    from: `"Phactor" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Tu cuenta ha sido creada correctamente',
    html: `
      <div style=" max-width:480px; margin:0 auto; padding:32px; border:1px solid #e0e0e0; border-radius:8px;">
        <h2 style="color:#952ecc;">Bienvenido, ${nombre}</h2>
        <p>Tu cuenta fue creada en el sistema de <strong>Phactor </strong>.</p>
        <p>Tu contraseña provisional es:</p>
        <div style="background:#f4f4f4; padding:16px; text-align:center; font-size:25px; letter-spacing:4px; font-weight:bold; color:#952ecc;">
          ${tempPassword}
        </div>
        <p style="margin-top:20px; color:#555;">Puedes cambiarla cuando quieras desde el menú de tu cuenta.</p>
        <hr style="border:none; border-top:1px solid #e0e0e0; margin:24px 0;">
        <p style="font-size:12px; color:#999;">Si no creaste esta cuenta, ignora este correo.</p>
      </div>
    `,
  });
}

module.exports = { enviarPasswordProvisional };