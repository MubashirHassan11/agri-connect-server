import {Resend} from 'resend';

const resend = new Resend('re_Zo6MJjQ1_HF3VCgxNsriDdo5H9RRMmka1');

async function sendVerificationEmail() {
  const {data, error} = await resend.emails.send({
    // from: 'AgriConnect <noreply@agri-connect.store>', // must use your verified domain
    to: 'stelin990@gmail.com',

    template: {
      id: 'password-reset-1',
      variables: {
        link: 'https://www.agri-connect.store/reset-password',
        name: 'M waqar'
      }
    }
  });

  if (error) {
    console.error(error);
  } else {
    console.log(data);
  }
}

sendVerificationEmail();
