export const CONFIRM_SIGNUP_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirme seu e-mail</title>
  <style>
    body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #F3F4F6; }
    .container { width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; margin-top: 40px; margin-bottom: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { background-color: #ffffff; padding: 30px; text-align: center; border-bottom: 1px solid #f0f0f0; }
    .logo { font-size: 24px; font-weight: 900; color: #7C3AED; letter-spacing: -1px; text-decoration: none; }
    .content { padding: 40px 30px; text-align: center; color: #374151; }
    .title { font-size: 24px; font-weight: 800; margin-bottom: 16px; color: #111827; }
    .text { font-size: 16px; line-height: 1.6; margin-bottom: 32px; color: #4B5563; }
    .button { display: inline-block; background-color: #C4B5FD; color: #2E1065; padding: 16px 32px; border-radius: 12px; font-weight: 800; text-decoration: none; font-size: 16px; transition: all 0.2s; }
    .button:hover { background-color: #A78BFA; }
    .footer { background-color: #F9FAFB; padding: 20px; text-align: center; font-size: 12px; color: #9CA3AF; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <a href="#" class="logo">Educa Sense</a>
    </div>
    <div class="content">
      <h1 class="title">Bem-vindo(a) à família! 🎉</h1>
      <p class="text">
        Estamos muito felizes em ter você conosco. Para começar a transformar o aprendizado dos seus filhos, confirme seu e-mail clicando no botão abaixo.
      </p>
      <a href="{{ .ConfirmationURL }}" class="button">Confirmar meu e-mail</a>
      <p style="margin-top: 30px; font-size: 14px; color: #9CA3AF;">
        Se você não criou esta conta, pode ignorar este e-mail com segurança.
      </p>
    </div>
    <div class="footer">
      © 2025 Educa Sense • Transformando o futuro
    </div>
  </div>
</body>
</html>
`;

export const RESET_PASSWORD_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redefinir Senha</title>
  <style>
    body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #F3F4F6; }
    .container { width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; margin-top: 40px; margin-bottom: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { background-color: #ffffff; padding: 30px; text-align: center; border-bottom: 1px solid #f0f0f0; }
    .logo { font-size: 24px; font-weight: 900; color: #7C3AED; letter-spacing: -1px; text-decoration: none; }
    .content { padding: 40px 30px; text-align: center; color: #374151; }
    .title { font-size: 24px; font-weight: 800; margin-bottom: 16px; color: #111827; }
    .text { font-size: 16px; line-height: 1.6; margin-bottom: 32px; color: #4B5563; }
    .button { display: inline-block; background-color: #C4B5FD; color: #2E1065; padding: 16px 32px; border-radius: 12px; font-weight: 800; text-decoration: none; font-size: 16px; transition: all 0.2s; }
    .button:hover { background-color: #A78BFA; }
    .footer { background-color: #F9FAFB; padding: 20px; text-align: center; font-size: 12px; color: #9CA3AF; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <a href="#" class="logo">Educa Sense</a>
    </div>
    <div class="content">
      <h1 class="title">Esqueceu a senha? 🔐</h1>
      <p class="text">
        Não se preocupe, acontece com todo mundo! Clique no botão abaixo para criar uma nova senha segura.
      </p>
      <a href="{{ .ConfirmationURL }}" class="button">Redefinir minha senha</a>
      <p style="margin-top: 30px; font-size: 14px; color: #9CA3AF;">
        Se você não solicitou isso, ignore este e-mail. Sua senha permanecerá a mesma.
      </p>
    </div>
    <div class="footer">
      © 2025 Educa Sense • Transformando o futuro
    </div>
  </div>
</body>
</html>
`;
