import { NextRequest, NextResponse } from "next/server";
import { getActiveAccounts, getValidToken, meliGet } from "@/lib/meli";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId;
    console.log(`[MELI-ACCOUNT] Obteniendo datos para usuario: ${userId}`);

    // 1. Obtener cuenta de nuestra DB
    const accounts = await getActiveAccounts();
    const account = accounts.find(a => String(a.meli_user_id) === userId);
    
    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    // 2. Obtener token válido
    const token = await getValidToken(account);
    if (!token) {
      return NextResponse.json(
        { error: "Token expired" },
        { status: 401 }
      );
    }

    // 3. Obtener datos en paralelo
    const [userData, itemsSearch] = await Promise.all([
      meliGet(`/users/${userId}`, token),
      meliGet(`/users/${userId}/items/search?limit=100&status=active`, token),
    ]);

    // 4. Procesar reputación
    const rep = userData?.seller_reputation ?? null;
    const reputation = rep ? {
      level_id: rep.level_id ?? null,
      level_name: getLevelName(rep.level_id),
      power_seller_status: rep.power_seller_status ?? null,
      transactions_total: rep.transactions?.total ?? 0,
      transactions_completed: rep.transactions?.completed ?? 0,
      ratings_positive: rep.transactions?.ratings?.positive ?? 0,
      ratings_negative: rep.transactions?.ratings?.negative ?? 0,
      ratings_neutral: rep.transactions?.ratings?.neutral ?? 0,
    } : null;

    // 5. Procesar items y calcular stats
    const items = itemsSearch?.results ?? [];
    let lowStockCount = 0;
    let outOfStockCount = 0;

    items.forEach((item: any) => {
      const available = item.available_quantity ?? 0;
      if (available === 0) {
        outOfStockCount++;
      } else if (available <= 10) {
        lowStockCount++;
      }
    });

    const stats = {
      total_active_items: itemsSearch?.paging?.total ?? 0,
      items_low_stock: lowStockCount,
      items_out_of_stock: outOfStockCount,
    };

    // 6. Retornar datos
    return NextResponse.json({
      reputation,
      items: items.map((item: any) => ({
        id: item.id,
        title: item.title,
        status: item.status,
        available_quantity: item.available_quantity ?? 0,
        total_quantity: item.sold_quantity ? (item.available_quantity ?? 0) + item.sold_quantity : item.available_quantity ?? 0,
        price: item.price,
        currency_id: item.currency_id,
      })),
      stats,
    });
  } catch (error) {
    console.error("[MELI-ACCOUNT] Error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * Mapear level_id a nombre legible
 */
function getLevelName(levelId: string | null): string {
  const levelMap: Record<string, string> = {
    "5_green": "Verde",
    "4_light_green": "Verde Claro",
    "3_yellow": "Amarillo",
    "2_orange": "Naranja",
    "1_red": "Rojo",
  };
  return levelMap[levelId ?? ""] ?? "Desconocido";
}

