export const getApprovedTemplate = (name = 'AgriConnect User') => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Approved - AgriConnect</title>
  <style>
    body, html {
      margin: 0;
      padding: 0;
      width: 100% !important;
      height: 100% !important;
      font-family: 'Inter', sans-serif;
      background-color: #f4f4f4;
    }
    a { text-decoration: none; }
    @media screen and (max-width: 600px) {
      .container { width: 100% !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f4f4f4;">

  <!-- Full Width Table -->
  <table border="0" cellpadding="0" cellspacing="0" width="100%" height="100%">
    <tr>
      <td align="center" valign="top" style="padding: 20px 10px;">

        <!-- Main Container Table -->
        <table class="container" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td align="center" style="background-color:#2f855a; padding: 30px; color: #ffffff;">
              <h1 style="margin:0; font-size:24px;">AgriConnect</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td align="center" style="padding: 30px; color: #333333;">
              <p style="margin: 0 0 20px 0; font-size:16px;">Hello ${name},</p>

              <p style="margin: 0 0 20px 0; font-size:16px; line-height:1.6;">
                Great news! Your AgriConnect account has been successfully approved.
              </p>

              <p style="margin: 0 0 20px 0; font-size:16px; line-height:1.6;">
                You can now access your account and start using all available features on our platform.
              </p>

              <p style="margin: 20px 0;">
                <a href="https://www.agri-connect.store" 
                   style="background-color:#2f855a; color:#ffffff; padding:12px 24px; border-radius:8px; font-weight:600; display:inline-block;">
                  Access Your Account
                </a>
              </p>

              <p style="margin: 20px 0 0 0; font-size:14px; color:#777;">
                If the button above does not work, copy and paste this link into your browser:
              </p>

              <p style="word-break: break-word; margin: 10px 0 0 0; font-size:14px; color:#2f855a;">
                <a href="https://www.agri-connect.store">
                  https://www.agri-connect.store
                </a>
              </p>

              <p style="margin: 20px 0 0 0; font-size:16px;">
                Welcome to AgriConnect!<br>
                AgriConnect Team
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color:#f4f4f4; padding:20px; font-size:14px; color:#777;">
              &copy; 2026 AgriConnect. All rights reserved.<br>
              <a href="https://www.agri-connect.store" style="color:#2f855a;">
                Visit our website
              </a>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;
