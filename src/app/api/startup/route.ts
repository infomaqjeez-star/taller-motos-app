export async function GET() {
  const timestamp = new Date().toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
  });

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║           🚀 MaqJeez App - Sistema Iniciado                   ║
║                  Environment: ${process.env.NODE_ENV || "production"}
║                  Timestamp: ${timestamp}
║                  Port: ${process.env.PORT || 3000}
╚════════════════════════════════════════════════════════════════╝
  `);

  return Response.json({
    status: "ok",
    app: "MaqJeez Taller",
    timestamp,
    environment: process.env.NODE_ENV || "production",
    port: process.env.PORT || 3000,
  });
}
