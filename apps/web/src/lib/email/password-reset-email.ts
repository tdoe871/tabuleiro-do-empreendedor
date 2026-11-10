import type { Locale } from "@/i18n/routing";

import { escapeHtml, type EmailMessage } from "./send";

// The "reset your password" email, in the app's 4 languages. The text lives
// here and not in the i18n dictionaries because the server builds it.

type Copy = {
  subject: string;
  greeting: (name: string) => string;
  body: (minutes: number) => string;
  button: string;
  ignore: string;
};

const COPY: Record<Locale, Copy> = {
  "pt-BR": {
    subject: "Redefina sua senha do Tabuleiro do Empreendedor",
    greeting: (name) => `Olá, ${name}!`,
    body: (minutes) =>
      `Recebemos um pedido para redefinir a sua senha. O link abaixo vale por ${minutes} minutos e só pode ser usado uma vez.`,
    button: "Criar nova senha",
    ignore:
      "Se você não pediu isso, ignore este e-mail: sua senha continua a mesma.",
  },
  es: {
    subject: "Restablece tu contraseña de Tabuleiro do Empreendedor",
    greeting: (name) => `¡Hola, ${name}!`,
    body: (minutes) =>
      `Recibimos una solicitud para restablecer tu contraseña. El enlace de abajo vale por ${minutes} minutos y solo se puede usar una vez.`,
    button: "Crear una contraseña nueva",
    ignore:
      "Si no lo pediste, ignora este correo: tu contraseña sigue siendo la misma.",
  },
  en: {
    subject: "Reset your Tabuleiro do Empreendedor password",
    greeting: (name) => `Hi ${name},`,
    body: (minutes) =>
      `We received a request to reset your password. The link below works for ${minutes} minutes and can only be used once.`,
    button: "Create a new password",
    ignore:
      "If you did not ask for this, ignore this email: your password stays the same.",
  },
  fr: {
    subject: "Réinitialisez votre mot de passe Tabuleiro do Empreendedor",
    greeting: (name) => `Bonjour ${name},`,
    body: (minutes) =>
      `Nous avons reçu une demande de réinitialisation de votre mot de passe. Le lien ci-dessous est valable ${minutes} minutes et ne peut être utilisé qu'une seule fois.`,
    button: "Créer un nouveau mot de passe",
    ignore:
      "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail : votre mot de passe reste le même.",
  },
};

// The email's language: the one the page asked for, or the app's default
// (routing.defaultLocale; only the type is imported so this stays free of
// next-intl). COPY being a Record<Locale, ...> makes the build fail if a new
// app language has no email text.
export function emailLocale(value: unknown): Locale {
  return value && Object.hasOwn(COPY, value as string)
    ? (value as Locale)
    : "pt-BR";
}

export function passwordResetEmail(input: {
  to: string;
  name: string;
  link: string;
  minutes: number;
  locale: Locale;
}): EmailMessage {
  const copy = COPY[input.locale];
  const name = input.name.trim().split(/\s+/)[0] || input.name;
  const text = [
    copy.greeting(name),
    "",
    copy.body(input.minutes),
    "",
    input.link,
    "",
    copy.ignore,
  ].join("\n");
  const html = `<p>${escapeHtml(copy.greeting(name))}</p>
<p>${escapeHtml(copy.body(input.minutes))}</p>
<p><a href="${escapeHtml(input.link)}" style="display:inline-block;padding:10px 18px;background:#1f6feb;color:#ffffff;border-radius:6px;text-decoration:none">${escapeHtml(copy.button)}</a></p>
<p style="font-size:12px;color:#555">${escapeHtml(input.link)}</p>
<p style="font-size:12px;color:#555">${escapeHtml(copy.ignore)}</p>`;
  return { to: input.to, subject: copy.subject, text, html };
}
