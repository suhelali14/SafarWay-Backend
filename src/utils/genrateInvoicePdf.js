const { initializeApp } = require('firebase/app');
const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase/storage');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Validate Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

const missingFirebaseVars = Object.keys(firebaseConfig).filter(
  (key) => !firebaseConfig[key]
);
if (missingFirebaseVars.length > 0) {
  console.error('Missing Firebase environment variables:', missingFirebaseVars.join(', '));
  throw new Error('Firebase configuration incomplete');
}

// Initialize Firebase
let firebaseApp;
try {
  firebaseApp = initializeApp(firebaseConfig);
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Failed to initialize Firebase:', error.message);
  throw error;
}

const storage = getStorage(firebaseApp);

// Helper function to draw a table row
function drawTableRow(doc, y, cells, options = {}) {
  const { cellWidth, cellHeight = 20, fontSize = 10, padding = 5, fillColor } = options;
  cells.forEach((cell, i) => {
    const x = 50 + i * cellWidth;
    if (fillColor) {
      doc.rect(x, y, cellWidth, cellHeight).fill(fillColor).stroke();
      doc.fillColor('#000000'); // Reset text color
    }
    doc 
      .font(cell.bold ? 'Helvetica-Bold' : 'Helvetica')
      .text(cell.text, x + padding, y + padding, {
        width: cellWidth - 2 * padding,
        align: cell.align || 'left',
      });
  });
}

async function generateInvoicePDF(booking) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('Checking invoice for booking:', booking.id);
      const fileName = `invoice_${booking.id}.pdf`;
      const storageRef = ref(storage, `invoices/${fileName}`);

      // Check if PDF already exists in Firebase
      try {
        const downloadURL = await getDownloadURL(storageRef);
        console.log('Existing PDF found in Firebase:', downloadURL);
        return resolve(downloadURL);
      } catch (error) {
        if (error.code === 'storage/object-not-found') {
          console.log('No existing PDF found, generating new one');
        } else {
          console.warn('Error checking existing PDF:', error.message);
        }
      }

      // Generate new PDF
      const doc = new PDFDocument({ margin: 50 });
      const uploadsDir = path.join(__dirname, '../../Uploads');
      const filePath = path.join(uploadsDir, fileName);

      // Ensure Uploads directory exists
      try {
        fs.mkdirSync(uploadsDir, { recursive: true });
      } catch (error) {
        console.error('Failed to create Uploads directory:', error.message);
        return reject(new Error(`Failed to create Uploads directory: ${error.message}`));
      }

      // Create write stream
      let stream;
      try {
        stream = fs.createWriteStream(filePath);
      } catch (error) {
        console.error('Failed to create write stream:', error.message);
        return reject(new Error(`Failed to create write stream: ${error.message}`));
      }

      doc.pipe(stream);

      // Header
      const logoPath = path.join(__dirname, '../../assets/safarway-logo.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 50, 30, { width: 100 });
      } else {
        doc
          .fontSize(20)
          .font('Helvetica-Bold')
          .fillColor('#1E3A8A')
          .text('SafarWay', 50, 40);
      }

      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .fillColor('#1E3A8A')
        .text('Booking Confirmation & Invoice', 200, 40, { align: 'right' })
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#000000')
        .text(`Invoice ID: ${fileName}`, 200, 60, { align: 'right' })
        .text(`Date: ${new Date().toLocaleDateString()}`, 200, 70, { align: 'right' });

      doc
        .fontSize(10)
        .text('SafarWay Travels Pvt. Ltd.', 50, 80)
        .text('123 Travel Street, Mumbai, MH, India', 50, 90)
        .text('Email: support@safarway.com | Phone: +91 98765 43210', 50, 100);

      // Divider
      doc
        .moveTo(50, 120)
        .lineTo(550, 120)
        .strokeColor('#1E3A8A')
        .lineWidth(1)
        .stroke();

      // Booking Details
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor('#1E3A8A')
        .text('Booking Details', 50, 140);

      const bookingTable = [
        [
          { text: 'Booking Reference', bold: true },
          { text: booking.id },
        ],
        [
          { text: 'Tour Package', bold: true },
          { text: booking.tourPackage.title },
        ],
        [
          { text: 'Duration', bold: true },
          { text: `${booking.tourPackage.duration} Days` },
        ],
        [
          { text: 'Number of People', bold: true },
          { text: booking.numberOfPeople.toString() },
        ],
        [
          { text: 'Total Price', bold: true },
          { text: `₹${booking.totalPrice.toFixed(2)}` },
        ],
       
        [
          { text: 'Payment Mode', bold: true },
          { text: booking.paymentMode },
        ],
        [
          { text: 'Payment Status', bold: true },
          { text: booking.paymentStatus },
        ],
        [
          { text: 'Booking Status', bold: true },
          { text: booking.status },
        ],
      ];

      bookingTable.forEach((row, i) => {
        drawTableRow(doc, 160 + i * 20, row, {
          cellWidth: 250,
          cellHeight: 20,
          fontSize: 10,
          padding: 5,
          fillColor: i % 2 === 0 ? '#F3F4F6' : null,
        });
      });

      // Customer Information
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor('#1E3A8A')
        .text('Customer Information', 50, 340);

      const customerTable = [
        [
          { text: 'Name', bold: true },
          { text: booking.customer.user.name },
        ],
        [
          { text: 'Email', bold: true },
          { text: booking.customer.user.email },
        ],
        [
          { text: 'Phone', bold: true },
          { text: booking.customer.user.phone || 'N/A' },
        ],
      ];

      customerTable.forEach((row, i) => {
        drawTableRow(doc, 360 + i * 20, row, {
          cellWidth: 250,
          cellHeight: 20,
          fontSize: 10,
          padding: 5,
          fillColor: i % 2 === 0 ? '#F3F4F6' : null,
        });
      });

      // Travelers
      if (booking.travelers && booking.travelers.length > 0) {
        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .fillColor('#1E3A8A')
          .text('Travelers', 50, 440);

        let y = 460;
        booking.travelers.forEach((traveler, index) => {
          doc
            .fontSize(12)
            .font('Helvetica-Bold')
            .fillColor('#000000')
            .text(`Traveler ${index + 1}: ${traveler.fullName}`, 50, y);

          const travelerTable = [
            [
              { text: 'Email', bold: true },
              { text: traveler.email || 'N/A' },
            ],
            [
              { text: 'Phone', bold: true },
              { text: traveler.phoneNumber || 'N/A' },
            ],
          ];

          travelerTable.forEach((row, i) => {
            drawTableRow(doc, y + 20 + i * 20, row, {
              cellWidth: 250,
              cellHeight: 20,
              fontSize: 10,
              padding: 5,
              fillColor: i % 2 === 0 ? '#F3F4F6' : null,
            });
          });

          y += 60;

          if (traveler.documents && traveler.documents.length > 0) {
            doc
              .fontSize(10)
              .font('Helvetica-Bold')
              .text('Documents:', 50, y);

            traveler.documents.forEach((doc, docIndex) => {
              doc
                .fontSize(10)
                .font('Helvetica')
                .text(`- ${doc.documentType}: ${doc.documentNumber}`, 60, y + 10 + docIndex * 15);
            });

            y += 10 + traveler.documents.length * 15 + 10;
          }

          y += 20;
        });
      }

      // Special Requests
      let currentY = doc.y + 20;
      if (booking.specialRequests) {
        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .fillColor('#1E3A8A')
          .text('Special Requests', 50, currentY);

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#000000')
          .text(booking.specialRequests, 50, currentY + 20, { width: 500 });

        currentY = doc.y + 20;
      }

      // Payment Details
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor('#1E3A8A')
        .text('Payment Summary', 50, currentY);

      const paymentTable = [
        [
          { text: 'Price per Person', bold: true },
          { text: `₹${booking.tourPackage.pricePerPerson.toFixed(2)}` },
        ],
        [
          { text: 'Number of People', bold: true },
          { text: booking.numberOfPeople.toString() },
        ],
        [
          { text: 'Cashfree Order ID', bold: true },
          { text: booking.cashfreeOrderId },
        ],
        [
          { text: 'Transaction ID', bold: true },
          { text: booking.transactionId || 'Pending' },
        ],
        [
          { text: booking.paymentMode === 'PARTIAL' ? 'Deposit Paid' : 'Amount Paid', bold: true },
          {
            text: `₹${(booking.paymentMode === 'FULL' ? booking.totalPrice : booking.platformFee).toFixed(2)}`,
          },
        ],
      ];

      if (booking.paymentMode === 'PARTIAL') {
        paymentTable.push([
          { text: 'Remaining', bold: true },
          { text: `₹${(booking.totalPrice - booking.platformFee).toFixed(2)}` },
        ]);
      }

      paymentTable.push([
        { text: 'Total Amount', bold: true },
        { text: `₹${booking.totalPrice.toFixed(2)}`, bold: true },
      ]);

      paymentTable.forEach((row, i) => {
        drawTableRow(doc, currentY + 20 + i * 20, row, {
          cellWidth: 250,
          cellHeight: 20,
          fontSize: 10,
          padding: 5,
          fillColor: i % 2 === 0 ? '#F3F4F6' : null,
        });
      });

      // Terms and Conditions
      currentY = doc.y + 40;
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor('#1E3A8A')
        .text('Terms and Conditions', 50, currentY);

      const terms = `
- Payments are non-refundable unless specified otherwise.
- SafarWay is not responsible for delays or cancellations due to unforeseen circumstances.
- Please verify traveler details and documents before travel.
- Contact support@safarway.com for any changes or cancellations.
      `.trim();

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#000000')
        .text(terms, 50, currentY + 20, { width: 500 });

      // Footer
      const pageHeight = doc.page.height;
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#6B7280')
        .text(
          'SafarWay Travels Pvt. Ltd. | 123 Travel Street, Mumbai, MH, India | support@safarway.com | +91 98765 43210',
          50,
          pageHeight - 50,
          { align: 'center' }
        )
        .text('www.safarway.com | Follow us on Twitter: @SafarWay', 50, pageHeight - 40, {
          align: 'center',
        });

      // Finalize PDF
      doc.end();

      stream.on('finish', async () => {
        console.log('PDF created at:', filePath);
        let downloadURL;

        try {
          // Upload to Firebase Storage
          console.log('Uploading PDF to Firebase:', fileName);
          const fileBuffer = fs.readFileSync(filePath);
          await uploadBytes(storageRef, fileBuffer);
          downloadURL = await getDownloadURL(storageRef);
          console.log('PDF uploaded to Firebase:', downloadURL);

          // Delete local file
          try {
            fs.unlinkSync(filePath);
            console.log('Local PDF deleted:', filePath);
          } catch (unlinkError) {
            console.warn('Failed to delete local PDF:', unlinkError.message);
          }
        } catch (uploadError) {
          console.error('Failed to upload PDF to Firebase:', uploadError.message);
          // Fallback to local file path
          console.warn('Returning local file path:', filePath);
          downloadURL = filePath;
        }

        resolve(downloadURL);
      });

      stream.on('error', (error) => {
        console.error('PDF stream error:', error.message);
        reject(new Error(`Failed to generate PDF: ${error.message}`));
      });
    } catch (error) {
      console.error('Error in generateInvoicePDF:', error.message);
      reject(new Error(`Invoice generation failed: ${error.message}`));
    }
  });
}

module.exports = { generateInvoicePDF };