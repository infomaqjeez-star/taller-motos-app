/**
 * Spooler Agent client â€” communicates with the local print agent
 * running on http://localhost:7070.
 *
 * Print chain priority: WebUSB â†’ Spooler Agent â†’ QZ Tray â†’ File Download
 */

const AGENT_URL = "http://localhost:7070";
const AGENT_TIMEOUT = 3000; // 3s

async function agentFetch(path: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AGENT_TIMEOUT);
  try {
    return await fetch(`${AGENT_URL}${path}`, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Check if the local print agent is running. Never throws. */
export async function isSpoolerAgentAvailable(): Promise<boolean> {
  try {
    const res = await agentFetch("/health");
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === "ok";
  } catch {
    return false;
  }
}

/** Get the list of printers installed on the local Windows PC. */
export async function getAgentPrinters(): Promise<string[]> {
  const res = await agentFetch("/printers");
  if (!res.ok) throw new Error("No se pudo obtener la lista de impresoras");
  const data = await res.json();
  return data.printers ?? [];
}

/** Send ZPL directly to the Windows Spooler via the local agent. Throws on failure. */
export async function printZPLviaAgent(zpl: string, printer?: string): Promise<void> {
  const body: Record<string, string> = { zpl };
  if (printer) body.printer = printer;

  const res = await agentFetch("/print", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(data.error ?? `Error del agente: HTTP ${res.status}`);
  }
}

/** Clear the print queue for the target printer. */
export async function purgeAgentQueue(printer?: string): Promise<void> {
  const body: Record<string, string> = {};
  if (printer) body.printer = printer;

  const res = await agentFetch("/purge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(data.error ?? `Error al purgar cola: HTTP ${res.status}`);
  }
}
