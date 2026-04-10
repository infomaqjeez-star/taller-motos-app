/**
 * Generador de comandos ESC/POS para impresora tÃ©rmica 4BARCODE4B-2054K
 * Formato: Etiquetas de envÃ­o con toda la informaciÃ³n de MeLi
 */

interface Label {
  shipment_id: number;
  order_id: number | null;
  title: string;
  buyer: string;
  buyer_nickname: string | null;
  quantity: number;
  seller_sku: string | null;
  attributes?: string | null;
  thumbnail?: string | null;
  delivery_date?: string | null;
  status?: string;
  type?: string; // flex, correo, turbo, full
}

/**
 * Genera buffer de comandos ESC/POS para la impresora tÃ©rmica
 */
export function generateThermalLabel(labels: Label[]): Uint8Array {
  const commands: Uint8Array[] = [];

  // Inicializar impresora
  commands.push(new Uint8Array([0x1B, 0x40])); // ESC @ - Reset

  for (const label of labels) {
    // Configurar ancho de lÃ­nea a 48 caracteres (estÃ¡ndar 58mm)
    commands.push(new Uint8Array([0x1B, 0x57, 0x00, 0x30])); // ESC W

    // Salto de lÃ­nea
    commands.push(new Uint8Array([0x0A]));

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // Encabezado: MeLi + Order ID
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    commands.push(textToPrint("â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—"));
    commands.push(textToPrint(`â•‘ MeLi Order: ${String(label.order_id || "N/A").padEnd(30)} â•‘`));
    commands.push(textToPrint("â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•"));
    commands.push(new Uint8Array([0x0A]));

    // TÃ­tulo del producto (truncado a 44 caracteres)
    const titleTrunc = (label.title || "Producto").substring(0, 44);
    commands.push(textToPrint(`PRODUCTO:`));
    commands.push(textToPrint(titleTrunc));

    // Atributos si existen
    if (label.attributes) {
      const attrTrunc = label.attributes.substring(0, 44);
      commands.push(textToPrint(`ATRIBUTOS: ${attrTrunc}`));
    }

    commands.push(new Uint8Array([0x0A]));

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // Detalles: Cantidad + SKU
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    const quantityStr = `Cantidad: ${label.quantity} unid.`;
    const skuStr = label.seller_sku ? `SKU: ${label.seller_sku}` : "";

    commands.push(textToPrint(`${quantityStr.padEnd(22)} ${skuStr}`));
    commands.push(new Uint8Array([0x0A]));

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // Comprador + LogÃ­stica
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    const buyerName = label.buyer || "Cliente";
    commands.push(textToPrint(`COMPRADOR: ${buyerName}`));

    if (label.buyer_nickname) {
      commands.push(textToPrint(`@${label.buyer_nickname}`));
    }

    const logisticLabel = {
      flex: "ðŸšš FLEX",
      correo: "ðŸ“¬ CORREO",
      turbo: "âš¡ TURBO",
      full: "ðŸ“¦ FULL",
    }[label.type as string] || "ENVÃO";

    commands.push(textToPrint(`${logisticLabel}`));
    commands.push(new Uint8Array([0x0A]));

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // Fecha de entrega
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    if (label.delivery_date) {
      const deliveryDate = new Date(label.delivery_date);
      const dateStr = deliveryDate.toLocaleDateString("es-AR", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
      });
      commands.push(textToPrint(`Entrega: ${dateStr}`));
      commands.push(new Uint8Array([0x0A]));
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // CÃ³digo de barras: Order ID
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    const barcode = String(label.order_id || label.shipment_id);
    commands.push(generateBarcode(barcode));
    commands.push(new Uint8Array([0x0A]));

    // Mostrar nÃºmero de cÃ³digo de barras
    commands.push(textToPrint(barcode));
    commands.push(new Uint8Array([0x0A, 0x0A]));

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // Salto de pÃ¡gina (separator entre etiquetas)
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    commands.push(new Uint8Array([0x1B, 0x4A, 0x64])); // ESC J - Advance Paper (100 dots)
  }

  // Finalizar impresiÃ³n
  commands.push(new Uint8Array([0x1B, 0x4D])); // ESC M - Cut paper

  // Concatenar todos los comandos en un Ãºnico buffer
  const totalLength = commands.reduce((sum, cmd) => sum + cmd.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const cmd of commands) {
    result.set(cmd, offset);
    offset += cmd.length;
  }

  return result;
}

/**
 * Convierte texto a Uint8Array con codificaciÃ³n CP437 (estÃ¡ndar para impresoras)
 */
function textToPrint(text: string): Uint8Array {
  // Agregar salto de lÃ­nea
  const textWithNewline = text + "\n";
  // Codificar a bytes (ASCII simplificado)
  return new Uint8Array(
    textWithNewline.split("").map((char) => {
      const code = char.charCodeAt(0);
      // Mapeo bÃ¡sico de caracteres especiales a CP437
      const charMap: Record<string, number> = {
        "â•‘": 0xB3,
        "â•”": 0xC9,
        "â•š": 0xC8,
        "â•": 0xCD,
        "â•—": 0xBB,
        "â•": 0xBC,
        "ðŸšš": 0xF9,
        "ðŸ“¬": 0xFB,
        "âš¡": 0xFE,
        "ðŸ“¦": 0xFE,
      };
      return charMap[char] || (code < 128 ? code : 0x3F); // 0x3F = '?'
    })
  );
}

/**
 * Genera comando de cÃ³digo de barras CODE128
 */
function generateBarcode(data: string): Uint8Array {
  // ESC * m nL nH [d1...dn] - Print image (para barcode nativo de impresora)
  // Alternativa: usar comando GS h / GS H (Set barcode height)
  // Formato simplificado: usar comando de barcode standard
  
  const barcodeHeight = 50; // altura en puntos
  const commands: Uint8Array[] = [];

  // ESC * m - Select bit-image mode
  commands.push(new Uint8Array([0x1B, 0x2A, 0x21])); // ESC * ! - 24-dot simple

  // Comando de cÃ³digo de barras (formato CODE128 estÃ¡ndar ESC/POS)
  // GS k m n [data] - Print barcode
  commands.push(new Uint8Array([0x1D, 0x6B, 0x49])); // GS k I (CODE128)
  commands.push(new Uint8Array([data.length])); // Longitud
  commands.push(new Uint8Array(data.split("").map((c) => c.charCodeAt(0)))); // Data

  const result = new Uint8Array(
    commands.reduce((sum, cmd) => sum + cmd.length, 0)
  );
  let offset = 0;
  for (const cmd of commands) {
    result.set(cmd, offset);
    offset += cmd.length;
  }

  return result;
}
