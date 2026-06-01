import crypto from "crypto";

const CHECKSUM = process.env.PAYOS_CHECKSUM_KEY ?? "";

export function payosConfigured(): boolean {
  return !!(process.env.PAYOS_CLIENT_ID && process.env.PAYOS_API_KEY && CHECKSUM);
}

function hmac(raw: string): string {
  return crypto.createHmac("sha256", CHECKSUM).update(raw).digest("hex");
}

export function signPaymentRequest(p: {
  amount: number;
  cancelUrl: string;
  description: string;
  orderCode: number;
  returnUrl: string;
}): string {
  // PayOS signs these 5 fields in alphabetical order.
  const raw =
    `amount=${p.amount}&cancelUrl=${p.cancelUrl}&description=${p.description}` +
    `&orderCode=${p.orderCode}&returnUrl=${p.returnUrl}`;
  return hmac(raw);
}

/** Verify a PayOS webhook by re-signing its `data` object (keys sorted alphabetically). */
export function verifyWebhookData(data: Record<string, unknown>, signature: string): boolean {
  const raw = Object.keys(data)
    .sort()
    .map((k) => {
      const v = data[k];
      return `${k}=${v === null || v === undefined ? "" : v}`;
    })
    .join("&");
  return hmac(raw) === signature;
}

export async function createPaymentLink(body: {
  orderCode: number;
  amount: number;
  description: string;
  cancelUrl: string;
  returnUrl: string;
}): Promise<{ checkoutUrl: string; paymentLinkId: string }> {
  const signature = signPaymentRequest(body);
  const res = await fetch("https://api-merchant.payos.vn/v2/payment-requests", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": process.env.PAYOS_CLIENT_ID!,
      "x-api-key": process.env.PAYOS_API_KEY!,
    },
    body: JSON.stringify({ ...body, signature }),
  });
  const json = await res.json();
  if (json.code !== "00" || !json.data?.checkoutUrl) {
    throw new Error(json.desc || "payos_error");
  }
  return json.data;
}
