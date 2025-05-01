const { Recipient, EmailParams, MailerSend, Attachment, Sender } = require('mailersend');
const fs = require('fs');
const fetch = require('node-fetch');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize MailerSend
const mailersend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY || 'mlsn.47639c085a4bba54af37b036779e08f81de2cc45e832079d4cb6980b46fcb047',
});

// Helper function to get PDF content (local or URL)
async function getPdfContent(pdfPath) {
  try {
    if (pdfPath.startsWith('https://')) {
      // Fetch PDF from Firebase URL
      const response = await fetch(pdfPath);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.statusText}`);
      }
      const buffer = await response.buffer();
      return buffer;
    } else {
      // Read local PDF file
      if (!fs.existsSync(pdfPath)) {
        throw new Error(`Local PDF file not found at: ${pdfPath}`);
      }
      return fs.readFileSync(pdfPath);
    }
  } catch (error) {
    console.error('Error getting PDF content:', error.message);
    throw error;
  }
}

async function sendConfirmationEmail({ to, booking, paymentDetails, pdfPath }) {
  try {
    // Validate inputs
    if (!to || !booking) {
      throw new Error('Missing required parameters: to or booking');
    }

    // Prepare recipients
    const recipients = [new Recipient(to, booking.customer.user.name || 'Customer')];
    const sentFrom = new Sender( process.env.MAILERSEND_FROM_EMAIL || 'suhelalipakjade@gmail.com' , process.env.MAILERSEND_FROM_NAME || 'SafarWay' );
    // Prepare email parameters
    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject(`Booking Confirmation - ${booking.id}`)
      .setHtml(`
        <h2>Booking Confirmed!</h2>
        <p>Dear ${booking.customer.user.name || 'Customer'},</p>
        <p>Your booking with SafarWay has been successfully confirmed.</p>
        <h3>Booking Details</h3>
        <ul>
          <li><strong>Booking ID:</strong> ${booking.id}</li>
          <li><strong>Tour Package:</strong> ${booking.tourPackage.title}</li>
          <li><strong>Number of People:</strong> ${booking.numberOfPeople}</li>
          <li><strong>Total Amount:</strong> ₹${booking.totalPrice.toFixed(2)}</li>
          <li><strong>Payment Mode:</strong> ${booking.paymentMode}</li>
          <li><strong>Status:</strong> ${booking.status}</li>
        </ul>
        <h3>Payment Details</h3>
        <ul>
          <li><strong>Amount Paid:</strong> ₹${(booking.paymentMode === 'FULL' ? booking.totalPrice : booking.platformFee).toFixed(2)}</li>
          <li><strong>Transaction ID:</strong> ${paymentDetails?.cf_payment_id || booking.transactionId || 'Pending'}</li>
          <li><strong>Payment Status:</strong> ${booking.paymentStatus}</li>
        </ul>
        <p>${pdfPath ? 'Please find the invoice attached.' : 'Invoice generation failed, please download it from the booking confirmation page.'}</p>
        <p>Contact us at support@safarway.com for any queries.</p>
        <p>Happy Travels!</p>
        <p>SafarWay Team</p>
      `)
      .setText(`
        Booking Confirmed!
        Dear ${booking.customer.user.name || 'Customer'},
        Your booking with SafarWay has been successfully confirmed.

        Booking Details:
        - Booking ID: ${booking.id}
        - Tour Package: ${booking.tourPackage.title}
        - Number of People: ${booking.numberOfPeople}
        - Total Amount: ₹${booking.totalPrice.toFixed(2)}
        - Payment Mode: ${booking.paymentMode}
        - Status: ${booking.status}

        Payment Details:
        - Amount Paid: ₹${(booking.paymentMode === 'FULL' ? booking.totalPrice : booking.platformFee).toFixed(2)}
        - Transaction ID: ${paymentDetails?.cf_payment_id || booking.transactionId || 'Pending'}
        - Payment Status: ${booking.paymentStatus}

        ${pdfPath ? 'Please find the invoice attached.' : 'Invoice generation failed, please download it from the booking confirmation page.'}
        Contact us at support@safarway.com for any queries.
        Happy Travels!
        SafarWay Team
      `);

    // Add PDF attachment if available
    if (pdfPath) {
      try {
        const pdfContent = await getPdfContent(pdfPath);
        const base64Content = pdfContent.toString('base64');
        const attachment = new Attachment(
          base64Content,
          `invoice_${booking.id}.pdf`,
          'application/pdf'
        );
        console.log(`PDF attachment created: invoice_${booking.id}.pdf`);
        emailParams.setAttachments([attachment]);
      } catch (error) {
        console.warn(`Failed to attach PDF: ${error.message}`);
        emailParams.setHtml(emailParams.getHtml().replace(
          'Please find the invoice attached.',
          'Invoice generation failed, please download it from the booking confirmation page.'
        ));
        emailParams.setText(emailParams.getText().replace(
          'Please find the invoice attached.',
          'Invoice generation failed, please download it from the booking confirmation page.'
        ));
      }
    }

    // Send email
    console.log(`Sending confirmation email to ${to}...`);
    const response = await mailersend.email.send(emailParams);
    console.log(`Email sent to ${to}`, response);

    console.log(`Confirmation email sent to ${to}`);
    
  } catch (error) {
    console.error(`Failed to send confirmation email to ${to}:`, error);
    throw new Error(`Failed to send email: ${error}`);
  }
}

module.exports = { sendConfirmationEmail };