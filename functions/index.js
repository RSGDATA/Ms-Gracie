const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const twilio = require("twilio");

admin.initializeApp();

// ---- Secrets (set via: firebase functions:secrets:set SECRET_NAME) ----
const gmailEmail = defineSecret("GMAIL_EMAIL");
const gmailAppPassword = defineSecret("GMAIL_APP_PASSWORD");
const twilioSid = defineSecret("TWILIO_ACCOUNT_SID");
const twilioToken = defineSecret("TWILIO_AUTH_TOKEN");
const twilioPhone = defineSecret("TWILIO_PHONE_NUMBER");
const graciePhone = defineSecret("GRACIE_PHONE_NUMBER");
const gracieEmail = defineSecret("GRACIE_NOTIFICATION_EMAIL");

// ---- Booking Notification Trigger ----
exports.onNewBookingRequest = onDocumentCreated(
  {
    document: "bookingRequests/{docId}",
    secrets: [
      gmailEmail,
      gmailAppPassword,
      twilioSid,
      twilioToken,
      twilioPhone,
      graciePhone,
      gracieEmail,
    ],
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const booking = snapshot.data();
    const docId = event.params.docId;

    console.log(`New booking request received: ${docId}`, booking);

    // Format the notification message
    const subject = `New Booking Request from ${booking.fullName}`;
    const message = formatBookingMessage(booking);
    const smsMessage = formatSmsMessage(booking);

    const results = { emailSent: false, smsSent: false };

    // Send email notification
    try {
      await sendEmail(subject, message);
      results.emailSent = true;
      console.log("Email notification sent successfully");
    } catch (error) {
      console.error("Failed to send email:", error);
    }

    // Send SMS notification
    try {
      await sendSms(smsMessage);
      results.smsSent = true;
      console.log("SMS notification sent successfully");
    } catch (error) {
      console.error("Failed to send SMS:", error);
    }

    // Update the document with notification status
    await snapshot.ref.update({
      notificationSent: results.emailSent || results.smsSent,
      notificationDetails: {
        emailSent: results.emailSent,
        smsSent: results.smsSent,
        notifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    });

    return results;
  }
);

// ---- Email Helper ----
async function sendEmail(subject, htmlBody) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailEmail.value(),
      pass: gmailAppPassword.value(),
    },
  });

  await transporter.sendMail({
    from: `"Gracie's Brand Website" <${gmailEmail.value()}>`,
    to: gracieEmail.value(),
    subject: subject,
    html: htmlBody,
  });
}

// ---- SMS Helper ----
async function sendSms(message) {
  const client = twilio(twilioSid.value(), twilioToken.value());

  await client.messages.create({
    body: message,
    from: twilioPhone.value(),
    to: graciePhone.value(),
  });
}

// ---- Message Formatters ----
function formatBookingMessage(booking) {
  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #6B4C9A, #9B72CF); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; font-size: 22px;">&#9835; New Booking Request</h1>
        <p style="margin: 8px 0 0; opacity: 0.9;">Someone wants to book a performance!</p>
      </div>
      <div style="background: #FFF8F0; padding: 24px; border: 1px solid #E8E0F0; border-top: none; border-radius: 0 0 12px 12px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; font-weight: bold; color: #6B4C9A; width: 160px;">Name</td>
            <td style="padding: 10px 0;">${booking.fullName}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; font-weight: bold; color: #6B4C9A;">Email</td>
            <td style="padding: 10px 0;"><a href="mailto:${booking.email}">${booking.email}</a></td>
          </tr>
          <tr>
            <td style="padding: 10px 0; font-weight: bold; color: #6B4C9A;">Phone</td>
            <td style="padding: 10px 0;"><a href="tel:${booking.phone}">${booking.phone}</a></td>
          </tr>
          <tr>
            <td style="padding: 10px 0; font-weight: bold; color: #6B4C9A;">Organization</td>
            <td style="padding: 10px 0;">${booking.organization || "—"}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; font-weight: bold; color: #6B4C9A;">Event Type</td>
            <td style="padding: 10px 0;">${booking.eventType}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; font-weight: bold; color: #6B4C9A;">Date</td>
            <td style="padding: 10px 0;">${booking.preferredDate || "—"}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; font-weight: bold; color: #6B4C9A;">Time</td>
            <td style="padding: 10px 0;">${booking.preferredTime || "—"}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; font-weight: bold; color: #6B4C9A;">Audience Size</td>
            <td style="padding: 10px 0;">${booking.audienceSize || "—"}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; font-weight: bold; color: #6B4C9A;">Age Group</td>
            <td style="padding: 10px 0;">${booking.ageGroup || "—"}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; font-weight: bold; color: #6B4C9A;">Location</td>
            <td style="padding: 10px 0;">${booking.location || "—"}</td>
          </tr>
          ${booking.details ? `
          <tr>
            <td colspan="2" style="padding: 16px 0 4px; font-weight: bold; color: #6B4C9A;">Additional Details</td>
          </tr>
          <tr>
            <td colspan="2" style="padding: 4px 0 10px; background: white; border-radius: 8px; padding: 12px;">${booking.details}</td>
          </tr>
          ` : ""}
        </table>
        <div style="margin-top: 20px; padding-top: 16px; border-top: 2px solid #FFD700; text-align: center; color: #6B5B7B; font-size: 13px;">
          Sent from Gracie's Brand Website
        </div>
      </div>
    </div>
  `;
}

function formatSmsMessage(booking) {
  return `🎵 New Booking Request!\n\n` +
    `From: ${booking.fullName}\n` +
    `Type: ${booking.eventType}\n` +
    `Date: ${booking.preferredDate || "TBD"}\n` +
    `Phone: ${booking.phone}\n` +
    `Email: ${booking.email}\n\n` +
    `Check your email for full details.`;
}
