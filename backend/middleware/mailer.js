const nodemailer = require("nodemailer");

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

const transporter = nodemailer.createTransport({
  service: "Gmail", 
  auth: {
    user: EMAIL_USER || "shahnawazsaddamb@gmail.com",
    pass: EMAIL_PASS || "fnbo uzjw vigy wtzj",
  },
});

/**
 * Send verification email
 * @param {string} to
 * @param {string} name
 * @param {string} verifyUrl 
 */
const sendVerificationEmail = async (to, name, verifyUrl) => {
  const mailOptions = {
    from: EMAIL_USER,
    to,
    subject: "Verify Your Account",
    html: `
      <h2>Hello ${name}</h2>
      <p>Thank you for signing up! Please verify your account by clicking the button below:</p>
      <a href="${verifyUrl}" style="
        display:inline-block;
        padding:10px 20px;
        background-color:#2ecc71;
        color:#000;
        text-decoration:none;
        border-radius:5px;
        font-weight:bold;
      ">Verify Account</a>
      <p>This link expires in 24 hours.</p>
    `,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = { sendVerificationEmail };
