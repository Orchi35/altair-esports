const RESEND_ENDPOINT = "https://api.resend.com/emails";
const SEND_TIMEOUT_MS = 8_000;

function readEnv(env, key) {
  const value = env?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function containsEmail(value) {
  return /(?:^|<)[^\s<>@]+@[^\s<>@]+\.[^\s<>@]{2,}>?$/u.test(value);
}

export function getMailConfiguration(env = globalThis.process?.env || {}) {
  const provider = readEnv(env, "MAIL_PROVIDER").toLowerCase();
  const apiKey = readEnv(env, "RESEND_API_KEY");
  const from = readEnv(env, "MAIL_FROM_ADDRESS");
  const recipient = readEnv(env, "PARTNERSHIP_RECIPIENT_EMAIL");
  const configured = provider === "resend"
    && apiKey.length >= 10
    && containsEmail(from)
    && containsEmail(recipient);
  return { configured, provider, apiKey, from, recipient };
}

function formatInquiryText(inquiry) {
  return [
    "ALTAIR eSports partnerlik talebi",
    "",
    `Marka / şirket: ${inquiry.brand}`,
    `İletişim kişisi: ${inquiry.contact}`,
    `E-posta: ${inquiry.email}`,
    `Telefon: ${inquiry.phone || "Belirtilmedi"}`,
    `İş birliği alanı: ${inquiry.area}`,
    `Kampanya tarihi: ${inquiry.campaignDate || "Belirtilmedi"}`,
    `Bütçe aralığı: ${inquiry.budget || "Belirtilmedi"}`,
    "",
    "Mesaj:",
    inquiry.message,
    "",
    "Gizlilik onayı: Verildi",
  ].join("\n");
}

export function createMailAdapter({ env = globalThis.process?.env || {}, fetchImpl = globalThis.fetch } = {}) {
  const configuration = getMailConfiguration(env);
  return {
    configured:configuration.configured,
    provider:configuration.configured ? configuration.provider : null,
    async send(inquiry) {
      if (!configuration.configured) throw new Error("MAIL_NOT_CONFIGURED");
      if (typeof fetchImpl !== "function") throw new Error("MAIL_TRANSPORT_UNAVAILABLE");
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
      try {
        const response = await fetchImpl(RESEND_ENDPOINT, {
          method:"POST",
          redirect:"error",
          headers:{
            authorization:`Bearer ${configuration.apiKey}`,
            "content-type":"application/json",
            accept:"application/json",
          },
          body:JSON.stringify({
            from:configuration.from,
            to:[configuration.recipient],
            reply_to:inquiry.email,
            subject:`[ALTAIR Partnerlik] ${inquiry.brand}`,
            text:formatInquiryText(inquiry),
          }),
          signal:controller.signal,
        });
        if (!response.ok) throw new Error("MAIL_PROVIDER_REJECTED");
        return { accepted:true };
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

export { RESEND_ENDPOINT, SEND_TIMEOUT_MS };
