/**
 * WebUSB direct printing for ZPL thermal printers.
 * Works in Chrome, Opera GX and any Chromium-based browser.
 * No extra software required — connects directly to the USB printer.
 *
 * Usage:
 *   1. Call requestUSBPrinter() once (requires user click) to pair the device.
 *   2. On subsequent sessions, call getUSBPrinter() + openUSBPrinter() to auto-connect.
 *   3. Call printZPLviaUSB(zpl) to print.
 */

const USB_STORAGE_KEY = "webusb_printer_ids"; // { vendorId, productId }

// USB Printer class — all standard thermal printers expose this
const PRINTER_CLASS = 0x07;

// ── Types ─────────────────────────────────────────────────────────────────────
// WebUSB is not in default TS libs for Next.js 14 — use safe type wrappers
type USB = {
  requestDevice: (options: { filters: { classCode?: number; vendorId?: number; productId?: number }[] }) => Promise<USBDevice>;
  getDevices: () => Promise<USBDevice[]>;
  addEventListener: (event: string, handler: (e: { device: USBDevice }) => void) => void;
};

type USBDevice = {
  vendorId: number;
  productId: number;
  productName?: string;
  opened: boolean;
  configuration: USBConfiguration | null;
  open: () => Promise<void>;
  close: () => Promise<void>;
  selectConfiguration: (configurationValue: number) => Promise<void>;
  claimInterface: (interfaceNumber: number) => Promise<void>;
  releaseInterface: (interfaceNumber: number) => Promise<void>;
  transferOut: (endpointNumber: number, data: BufferSource) => Promise<{ status: string }>;
};

type USBConfiguration = {
  interfaces: USBInterface[];
};

type USBInterface = {
  interfaceNumber: number;
  alternates: USBAlternateInterface[];
};

type USBAlternateInterface = {
  interfaceClass: number;
  endpoints: USBEndpoint[];
};

type USBEndpoint = {
  endpointNumber: number;
  direction: "in" | "out";
  type: "bulk" | "interrupt" | "isochronous";
};

// ── Module state ──────────────────────────────────────────────────────────────
let _device: USBDevice | null = null;
let _claimedInterface: number | null = null;
let _bulkEndpoint: number | null = null;

function getUSBAPI(): USB | null {
  if (typeof navigator === "undefined") return null;
  return ("usb" in navigator) ? (navigator as unknown as { usb: USB }).usb : null;
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Returns true if WebUSB is available in this browser */
export function isWebUSBSupported(): boolean {
  return getUSBAPI() !== null;
}

/** Returns the USB printer device name (for display) */
export function getUSBPrinterName(): string | null {
  if (!_device) {
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem(USB_STORAGE_KEY) : null;
    if (saved) {
      try {
        const { name } = JSON.parse(saved) as { vendorId: number; productId: number; name?: string };
        return name ?? "Impresora USB";
      } catch { return null; }
    }
    return null;
  }
  return _device.productName ?? `USB ${_device.vendorId.toString(16)}:${_device.productId.toString(16)}`;
}

/** Returns true if device is currently open and ready */
export function isUSBPrinterOpen(): boolean {
  return !!_device && _device.opened && _claimedInterface !== null;
}

/**
 * Shows the browser's USB device picker (requires user gesture).
 * Saves device IDs to localStorage for future auto-reconnect.
 */
export async function requestUSBPrinter(): Promise<USBDevice> {
  const usb = getUSBAPI();
  if (!usb) throw new Error("WebUSB no está disponible en este navegador. Usá Chrome u Opera GX.");

  // Show all USB devices (broad filter — user selects the printer)
  const device = await usb.requestDevice({
    filters: [
      { classCode: PRINTER_CLASS }, // Standard printer class
      {},                            // Fallback: show ALL devices if printer class not found
    ],
  });

  // Save IDs for auto-reconnect
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(USB_STORAGE_KEY, JSON.stringify({
      vendorId:  device.vendorId,
      productId: device.productId,
      name:      device.productName ?? "Impresora USB",
    }));
  }

  return device;
}

/**
 * Auto-connects to a previously paired printer (no dialog).
 * Returns null if no paired printer is found.
 */
export async function getUSBPrinter(): Promise<USBDevice | null> {
  const usb = getUSBAPI();
  if (!usb) return null;

  const saved = typeof localStorage !== "undefined" ? localStorage.getItem(USB_STORAGE_KEY) : null;
  const devices = await usb.getDevices();

  if (saved) {
    const { vendorId, productId } = JSON.parse(saved) as { vendorId: number; productId: number };
    const match = devices.find(d => d.vendorId === vendorId && d.productId === productId);
    if (match) return match;
  }

  // No stored match — return first device if only one exists
  if (devices.length === 1) return devices[0];
  return null;
}

/**
 * Opens the device and claims the printer interface.
 * Idempotent — safe to call multiple times.
 */
export async function openUSBPrinter(device: USBDevice): Promise<void> {
  if (device.opened && _claimedInterface !== null && _device === device) return; // already open

  if (!device.opened) {
    await device.open();
  }

  if (device.configuration === null) {
    await device.selectConfiguration(1);
  }

  // Find the printer interface (class 0x07)
  const config = device.configuration!;
  let interfaceNum: number | null = null;
  let bulkOut: number | null = null;

  for (const iface of config.interfaces) {
    for (const alt of iface.alternates) {
      if (alt.interfaceClass === PRINTER_CLASS || alt.endpoints.some(e => e.direction === "out" && e.type === "bulk")) {
        interfaceNum = iface.interfaceNumber;
        bulkOut = alt.endpoints.find(e => e.direction === "out" && e.type === "bulk")?.endpointNumber ?? null;
        break;
      }
    }
    if (interfaceNum !== null) break;
  }

  // If no printer-class interface found, try the first interface with a bulk OUT endpoint
  if (interfaceNum === null) {
    for (const iface of config.interfaces) {
      for (const alt of iface.alternates) {
        const ep = alt.endpoints.find(e => e.direction === "out" && e.type === "bulk");
        if (ep) { interfaceNum = iface.interfaceNumber; bulkOut = ep.endpointNumber; break; }
      }
      if (interfaceNum !== null) break;
    }
  }

  if (interfaceNum === null || bulkOut === null) {
    throw new Error(
      "No se encontró un endpoint de impresión en la impresora USB. " +
      "Asegurate de que el cable esté conectado y que la impresora esté encendida."
    );
  }

  await device.claimInterface(interfaceNum);

  _device = device;
  _claimedInterface = interfaceNum;
  _bulkEndpoint = bulkOut;
}

/** Disconnects the current USB printer */
export async function disconnectUSBPrinter(): Promise<void> {
  if (!_device) return;
  try {
    if (_claimedInterface !== null) await _device.releaseInterface(_claimedInterface);
    if (_device.opened) await _device.close();
  } catch { /* ignore cleanup errors */ }
  _device = null;
  _claimedInterface = null;
  _bulkEndpoint = null;
}

/**
 * Prints ZPL content directly via USB (no QZ Tray needed).
 * Auto-connects if not already open.
 */
export async function printZPLviaUSB(zplContent: string): Promise<void> {
  const usb = getUSBAPI();
  if (!usb) throw new Error("WebUSB no disponible");

  // Auto-connect if needed
  if (!isUSBPrinterOpen()) {
    const device = await getUSBPrinter();
    if (!device) throw new Error("No hay impresora USB vinculada. Usá el botón 'Vincular Impresora USB'.");
    await openUSBPrinter(device);
  }

  if (!_device || _bulkEndpoint === null) {
    throw new Error("No conectado a impresora USB");
  }

  const data = new TextEncoder().encode(zplContent);
  const result = await _device.transferOut(_bulkEndpoint, data);

  if (result.status !== "ok") {
    throw new Error(`Error de transferencia USB: ${result.status}`);
  }
}

/** Sets up auto-reconnect event listeners. Call once on page load. */
export function initUSBEvents(): void {
  const usb = getUSBAPI();
  if (!usb) return;

  usb.addEventListener("disconnect", (e) => {
    if (_device && e.device.vendorId === _device.vendorId && e.device.productId === _device.productId) {
      _device = null;
      _claimedInterface = null;
      _bulkEndpoint = null;
    }
  });

  usb.addEventListener("connect", (e) => {
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem(USB_STORAGE_KEY) : null;
    if (!saved) return;
    try {
      const { vendorId, productId } = JSON.parse(saved) as { vendorId: number; productId: number };
      if (e.device.vendorId === vendorId && e.device.productId === productId) {
        openUSBPrinter(e.device).catch(() => {});
      }
    } catch { /* ignore */ }
  });
}
