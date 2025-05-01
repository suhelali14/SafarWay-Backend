const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function sendWhatsAppConfirmation({ to, booking, paymentDetails }) {
  if (!to) {
    console.warn('No phone number provided for WhatsApp notification');
    return;
  }

  // Normalize and validate phone number
  let normalizedNumber = to.trim().replace(/\s+/g, ''); // Remove spaces

  // Check if the number starts with a country code (e.g., +91, +1)
  const hasCountryCode = normalizedNumber.startsWith('+');
  const isIndianNumber = normalizedNumber.startsWith('+91') || (!hasCountryCode && normalizedNumber.length === 10);

  if (isIndianNumber) {
    // Handle Indian numbers
    // Remove leading 0 or +91
    normalizedNumber = normalizedNumber.replace(/^(0|\+91)/, '');
    // Validate: 10 digits, starts with 6-9
    if (!/^[6-9]\d{9}$/.test(normalizedNumber)) {
      console.warn(`Invalid Indian phone number: ${to} (normalized: ${normalizedNumber})`);
      return;
    }
    // Add +91
    normalizedNumber = `+91${normalizedNumber}`;
  } else if (hasCountryCode) {
    // Assume other country codes are valid (e.g., +1 for US)
    // Basic validation: at least 7 digits after country code
    const digits = normalizedNumber.replace(/^\+\d+/, '');
    if (digits.length < 7) {
      console.warn(`Invalid phone number with country code: ${to} (too short)`);
      return;
    }
  } else {
    // No country code and not 10 digits
    console.warn(`Invalid phone number: ${to} (missing country code or incorrect length)`);
    return;
  }

  const message = `
SafarWay Booking Confirmation

Booking ID: ${booking.id}
Tour Package: ${booking.tourPackage.title}
Number of People: ${booking.numberOfPeople}
Total Amount: ₹${booking.totalPrice.toFixed(2)}
Payment Mode: ${booking.paymentMode}
Amount Paid: ₹${(booking.paymentMode === 'FULL' ? booking.totalPrice : booking.platformFee).toFixed(2)}
Payment Status: ${booking.paymentStatus}

Your booking is confirmed! Check your email for the invoice.
Contact: support@safarway.com
  `.trim();

  try {
    await client.messages.create({
      from: 'whatsapp:+14155238886', // Replace with your Twilio WhatsApp number
      to: `whatsapp:${normalizedNumber}`,
      body: message,
    });
    console.log(`WhatsApp message sent to ${normalizedNumber}`);
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.message);
  }
}

module.exports = { sendWhatsAppConfirmation };