
const { Recipient, EmailParams, MailerSend, Attachment, Sender } = require('mailersend');

const mailerSend = new MailerSend({
  apiKey: "mlsn.47639c085a4bba54af37b036779e08f81de2cc45e832079d4cb6980b46fcb047",
});

const sentFrom = new Sender("suhelalipakjade@gmail.com", "Your name");

const recipients = [
  new Recipient("suhelalipakjade2@.com", "Your Client")
];

const emailParams = new EmailParams()
  .setFrom(sentFrom)
  .setTo(recipients)
  .setReplyTo(sentFrom)
  .setSubject("This is a Subject")
  .setHtml("<strong>This is the HTML content</strong>")
  .setText("This is the text content");

const response=await 
     mailerSend.email.send(emailParams);

console.log(response); // Log the response from MailerSend
console.log(response.statusCode); // Log the status code     