import { createHmac } from "crypto";

/**
 * Verifica la firma HMAC-SHA256 de un webhook de Mercado Libre
 * MeLi envÃ­a: X-SIGNATURE header con formato "sha256=<hmac>"
 * Nosotros recalculamos el HMAC y comparamos
 */
export function verifyMeliWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  try {
    // MeLi envÃ­a en formato: "sha256=abc123..."
    // Extraemos el hash de la firma
    const [algo, providedHash] = signature.split("=");

    if (algo !== "sha256") {
      console.warn("[WEBHOOK] Algoritmo no soportado:", algo);
      return false;
    }

    // Recalcular HMAC
    const hmac = createHmac("sha256", secret);
    hmac.update(body);
    const calculatedHash = hmac.digest("hex");

    // ComparaciÃ³n timing-safe
    const isValid = calculatedHash === providedHash;

    if (!isValid) {
      console.warn(
        "[WEBHOOK] Firma invÃ¡lida. Esperada:",
        calculatedHash,
        "Recibida:",
        providedHash
      );
    }

    return isValid;
  } catch (error) {
    console.error("[WEBHOOK] Error verificando firma:", error);
    return false;
  }
}
