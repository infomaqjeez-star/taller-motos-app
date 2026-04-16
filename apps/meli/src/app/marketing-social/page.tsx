"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Share2, Copy, Check, Instagram } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface MeliItem {
  id: string;
  title: string;
  price: number;
  thumbnail: string;
  permalink: string;
  account_nickname: string;
}

export default function MarketingSocialPage() {
  const [items, setItems] = useState<MeliItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MeliItem | null>(null);
  const [result, setResult] = useState<{title: string, text: string} | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/meli-items-for-social", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        setItems(data.slice(0, 12));
      }
    } catch (e) {
      console.error("Error:", e);
    } finally {
      setLoading(false);
    }
  };

  const generatePost = useCallback((item: MeliItem) => {
    setSelected(item);
    
    const text = `🔥 ${item.title}\n\n💰 $${item.price.toLocaleString("es-AR")}\n\n✅ Calidad garantizada MAQJEEZ\n🚚 Envíos a todo el país\n📍 Showroom en Buenos Aires\n\n👉 ${item.permalink}\n\n#maqjeez #repuestos #motos #stihl #gamma`;

    setResult({ title: item.title, text });
  }, []);

  const copyText = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "#121212" }}>
        <div className="w-10 h-10 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (result && selected) {
    return (
      <main className="min-h-screen pb-8" style={{ background: "#121212" }}>
        <div className="px-4 pt-6 pb-4 flex items-center gap-3">
          <button onClick={() => { setResult(null); setSelected(null); }} className="p-2 rounded-xl" style={{ background: "#1F1F1F" }}>
            <ArrowLeft className="w-5 h-5" style={{ color: "#FFE600" }} />
          </button>
          <h1 className="text-xl font-bold text-white">Publicación lista</h1>
        </div>

        <div className="px-4">
          <div className="rounded-2xl overflow-hidden mb-4" style={{ background: "#1F1F1F" }}>
            <div className="p-3 border-b flex items-center gap-2" style={{ borderColor: "#333" }}>
              <Instagram className="w-5 h-5 text-pink-500" />
              <span className="text-sm font-bold text-white">Preview</span>
            </div>
            
            <div className="p-4">
              <img src={selected.thumbnail} alt={selected.title} className="w-full h-64 object-cover rounded-xl mb-4" />
              <pre className="text-sm text-white whitespace-pre-wrap font-sans">{result.text}</pre>
            </div>
          </div>

          <button
            onClick={copyText}
            className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 mb-3"
            style={{ background: copied ? "#34D399" : "#FFE600", color: "#000" }}
          >
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            {copied ? "¡Copiado!" : "Copiar para publicar"}
          </button>
          
          <a
            href={selected.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3 rounded-xl font-bold text-sm text-center"
            style={{ background: "#2A2A2A", color: "#fff" }}
          >
            Ver en Mercado Libre
          </a>

          <p className="text-xs text-center mt-4" style={{ color: "#6B7280" }}>
            📋 Copiá el texto y pegalo en Instagram o Facebook
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-8" style={{ background: "#121212" }}>
      <div className="px-4 pt-6 pb-4 flex items-center gap-3">
        <Link href="/" className="p-2 rounded-xl" style={{ background: "#1F1F1F" }}>
          <ArrowLeft className="w-5 h-5" style={{ color: "#FFE600" }} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Marketing Social</h1>
          <p className="text-xs" style={{ color: "#9CA3AF" }}>Tocá un producto para publicar</p>
        </div>
      </div>

      <div className="px-4 grid grid-cols-2 gap-3">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => generatePost(item)}
            className="rounded-xl overflow-hidden text-left active:scale-95 transition-transform"
            style={{ background: "#1F1F1F" }}
          >
            <img src={item.thumbnail} alt={item.title} className="w-full h-32 object-cover" />
            <div className="p-3">
              <p className="text-xs text-white line-clamp-2 mb-1">{item.title}</p>
              <p className="text-sm font-bold" style={{ color: "#FFE600" }}>
                ${item.price.toLocaleString("es-AR")}
              </p>
            </div>
          </button>
        ))}
      </div>
    </main>
  );
}
