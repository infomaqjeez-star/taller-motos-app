/**
 * QZ Tray 2.x WebSocket client for RAW ZPL printing.
 * Requires QZ Tray installed: https://qz.io/download/
 *
 * Setup (once):
 *   1. Install QZ Tray from https://qz.io/download/
 *   2. Start QZ Tray (it runs in the system tray)
 *   3. Right-click QZ Tray icon → Allow Unsigned (enables local web apps)
 */

const QZ_WS_SECURE   = "wss://localhost:8181/json";
const QZ_WS_INSECURE = "ws://localhost:8182/json";
const CONNECT_TIMEOUT = 6000;
const CALL_TIMEOUT    = 12000;

type QZMsg = {
  uid?:    string;
  call?:   string;
  result?: unknown;
  error?:  string;
};

let _ws: WebSocket | null = null;
let _connected = false;
const _pending = new Map<string, { resolve: (r: unknown) => void; reject: (e: Error) => void }>();

function uid() { return Math.random().toString(36).slice(2, 10); }

export function isQZConnected(): boolean {
  return _connected && _ws?.readyState === WebSocket.OPEN;
}

export function disconnectQZ(): void {
  _ws?.close();
  _ws = null;
  _connected = false;
}

export function connectQZ(preferSecure = true): Promise<void> {
  if (isQZConnected()) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const url = preferSecure ? QZ_WS_SECURE : QZ_WS_INSECURE;
    let ws: WebSocket;

    try { ws = new WebSocket(url); }
    catch { reject(new Error("No se puede abrir WebSocket")); return; }

    const timer = setTimeout(() => {
      ws.close();
      // Retry on insecure port if secure failed
      if (preferSecure) {
        connectQZ(false).then(resolve).catch(() =>
          reject(new Error(
            "QZ Tray no responde. Verificá que esté instalado y ejecutándose en la bandeja del sistema."
          ))
        );
      } else {
        reject(new Error("Timeout: QZ Tray no encontrado. Instalalo en https://qz.io y activá 'Allow Unsigned'."));
      }
    }, CONNECT_TIMEOUT);

    ws.onmessage = (ev: MessageEvent) => {
      let msg: QZMsg;
      try { msg = JSON.parse(ev.data as string); } catch { return; }

      // QZ Tray 2.x handshake: server sends {"call":"websocket.connected","uid":"..."}
      // Client MUST acknowledge before sending any commands, otherwise QZ Tray closes the connection.
      if (!_connected && msg.call === "websocket.connected") {
        ws.send(JSON.stringify({ uid: msg.uid, call: "websocket.connected", result: null }));
        clearTimeout(timer);
        _connected = true;
        _ws = ws;
        resolve();
        return;
      }

      // Fallback for older QZ Tray versions: any message = connected
      if (!_connected) {
        clearTimeout(timer);
        _connected = true;
        _ws = ws;
        resolve();
        return;
      }

      // Resolve pending call
      if (msg.uid && _pending.has(msg.uid)) {
        const { resolve: res, reject: rej } = _pending.get(msg.uid)!;
        _pending.delete(msg.uid);
        if (msg.error) rej(new Error(msg.error));
        else res(msg.result);
      }
    };

    ws.onerror = () => {
      clearTimeout(timer);
      if (!_connected && preferSecure) {
        // Try insecure port as fallback before giving up
        connectQZ(false).then(resolve).catch(() =>
          reject(new Error("QZ Tray no encontrado en localhost:8181 ni 8182."))
        );
      } else if (!_connected) {
        reject(new Error("QZ Tray no encontrado. Asegurate que esté corriendo y que 'Allow Unsigned' esté activado."));
      }
    };

    ws.onclose = () => {
      if (_ws === ws) { _connected = false; _ws = null; }
    };
  });
}

function call(callName: string, params: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (!_ws || _ws.readyState !== WebSocket.OPEN) {
      reject(new Error("No conectado a QZ Tray")); return;
    }
    const id = uid();
    _pending.set(id, { resolve, reject });
    _ws.send(JSON.stringify({ call: callName, uid: id, params }));

    setTimeout(() => {
      if (_pending.has(id)) {
        _pending.delete(id);
        reject(new Error("Timeout esperando respuesta de QZ Tray"));
      }
    }, CALL_TIMEOUT);
  });
}

/** Returns list of printer names available on this PC */
export async function qzGetPrinters(): Promise<string[]> {
  await connectQZ();
  try {
    const result = await call("printers.find", {});
    if (Array.isArray(result)) return result as string[];
    if (typeof result === "string") return [result];
    return [];
  } catch {
    return [];
  }
}

/**
 * Sends ZPL content directly to the printer via RAW mode.
 * The printer must have a Generic / Text Only or ZPL driver.
 */
export async function qzPrintZPL(zplContent: string, printerName: string): Promise<void> {
  await connectQZ();
  await call("print", {
    printer: { name: printerName },
    data: [{
      type:    "raw",
      format:  "command",
      data:    zplContent,
      options: { language: "ZPL" },
    }],
  });
}
