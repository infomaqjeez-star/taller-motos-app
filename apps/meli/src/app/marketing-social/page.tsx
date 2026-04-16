"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Image as ImageIcon, Share2, Hash, Copy, Check, Instagram, Facebook } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface MeliItem {
  id: string;
  title: string;
  price: number;
  thumbnail: string;
  permalink: string;
  account_nickname: string;
}

interface SocialPost {
  item: MeliItem;
  message: string;
  hashtags: string[];
  platforms: ("instagram" | "facebook")[];
}

export default function MarketingSocialPage() {
  const [items, setItems] = useState<MeliItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<MeliItem[]>([]);
  const [customMessage, setCustomMessage] = useState("");
  const [hashtags, setHashtags] = useState("#maqjeez #repuestos #motos #calidad");
  const [generatedPosts, setGeneratedPosts] = useState<SocialPost[]>([]);
  const [copied, setCopied] = useState(false);

  // Cargar publicaciones de MeLi
  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/meli-items-for-social", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (e) {
      console.error("Error cargando items:", e);
    } finally {
      setLoading(false);
    }
  };

  // Generar publicaciones
  const generatePosts = () => {
    const posts: SocialPost[] = selectedItems.map(item => {
      const defaultMessage = `🔥 ${item.title}\n\n💰 Precio: $${item.price.toLocaleString("es-AR")}\n\n✅ Calidad garantizada\n🚚 Envíos a todo el país\n\n👉 Link en bio o ${item.permalink}`;
      
      return {
        item,
        message: customMessage || defaultMessage,
        hashtags: hashtags.split(" ").filter(h => h.startsWith("#")),
        platforms: ["instagram", "facebook"],
      };
    });
    
    setGeneratedPosts(posts);
  };

  // Copiar texto al portapapeles
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="min-h-screen pb-24" style={{ background: "#121212" }}>
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/" className="p-2 rounded-xl" style={{ background: "#1F1F1F" }}>
            <ArrowLeft className="w-5 h-5" style={{ color: "#FFE600" }} />
          </Link>
          <h1 className="text-xl font-bold text-white">Marketing Social</h1>
        </div>
        
        <p className="text-sm" style={{ color: "#9CA3AF" }}>
          Crea publicaciones para Instagram y Facebook desde tus productos de MeLi
        </p>
      </div>

      {/* Paso 1: Seleccionar productos */}
      <div className="px-4 mb-6">
        <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: "#FFE600", color: "#000" }}>1</span>
          Seleccionar productos ({selectedItems.length})
        </h2>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map(item => {
              const isSelected = selectedItems.some(i => i.id === item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedItems(selectedItems.filter(i => i.id !== item.id));
                    } else {
                      setSelectedItems([...selectedItems, item]);
                    }
                  }}
                  className={`p-3 rounded-xl text-left transition-all ${
                    isSelected ? "ring-2" : ""
                  }`}
                  style={{ 
                    background: "#1F1F1F",
                    borderColor: isSelected ? "#FFE600" : "transparent",
                    borderWidth: isSelected ? "2px" : "1px",
                    borderStyle: "solid"
                  }}
                >
                  <img 
                    src={item.thumbnail} 
                    alt={item.title}
                    className="w-full h-24 object-cover rounded-lg mb-2"
                  />
                  <p className="text-xs text-white line-clamp-2">{item.title}</p>
                  <p className="text-xs font-bold mt-1" style={{ color: "#FFE600" }}>
                    ${item.price.toLocaleString("es-AR")}
                  </p>
                  <p className="text-[10px]" style={{ color: "#6B7280" }}>
                    @{item.account_nickname}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Paso 2: Personalizar mensaje */}
      {selectedItems.length > 0 && (
        <div className="px-4 mb-6">
          <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: "#FFE600", color: "#000" }}>2</span>
            Personalizar mensaje
          </h2>
          
          <div className="space-y-3">
            <textarea
              value={customMessage}
              onChange={e => setCustomMessage(e.target.value)}
              placeholder="Mensaje personalizado (opcional). Si lo dejas vacío, se genera automáticamente."
              className="w-full p-3 rounded-xl text-sm text-white placeholder-gray-500 outline-none resize-none"
              style={{ background: "#1F1F1F", minHeight: "100px" }}
            />
            
            <div>
              <label className="text-xs mb-1 block" style={{ color: "#9CA3AF" }}>
                Hashtags
              </label>
              <input
                type="text"
                value={hashtags}
                onChange={e => setHashtags(e.target.value)}
                className="w-full p-3 rounded-xl text-sm text-white placeholder-gray-500 outline-none"
                style={{ background: "#1F1F1F" }}
              />
            </div>
            
            <button
              onClick={generatePosts}
              className="w-full py-3 rounded-xl font-bold text-sm text-black flex items-center justify-center gap-2"
              style={{ background: "#FFE600" }}
            >
              <Share2 className="w-4 h-4" />
              Generar publicaciones
            </button>
          </div>
        </div>
      )}

      {/* Paso 3: Preview y publicar */}
      {generatedPosts.length > 0 && (
        <div className="px-4">
          <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: "#FFE600", color: "#000" }}>3</span>
            Publicaciones generadas
          </h2>
          
          <div className="space-y-4">
            {generatedPosts.map((post, idx) => {
              const fullText = `${post.message}\n\n${post.hashtags.join(" ")}`;
              
              return (
                <div key={idx} className="p-4 rounded-xl" style={{ background: "#1F1F1F" }}>
                  {/* Preview Instagram */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Instagram className="w-4 h-4 text-pink-500" />
                      <span className="text-xs font-bold text-white">Instagram</span>
                    </div>
                    <div className="p-3 rounded-lg" style={{ background: "#2A2A2A" }}>
                      <img 
                        src={post.item.thumbnail} 
                        alt={post.item.title}
                        className="w-full h-48 object-cover rounded-lg mb-3"
                      />
                      <p className="text-sm text-white whitespace-pre-line">{fullText}</p>
                    </div>
                  </div>
                  
                  {/* Acciones */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(fullText)}
                      className="flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2"
                      style={{ background: copied ? "#34D399" : "#2A2A2A", color: copied ? "#000" : "#fff" }}
                    >
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied ? "Copiado" : "Copiar texto"}
                    </button>
                    
                    <button
                      onClick={() => window.open(post.item.permalink, "_blank")}
                      className="flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2"
                      style={{ background: "#2A2A2A", color: "#FFE600" }}
                    >
                      <ImageIcon className="w-3 h-3" />
                      Ver en MeLi
                    </button>
                  </div>
                  
                  <p className="text-[10px] mt-2 text-center" style={{ color: "#6B7280" }}>
                    Próximamente: Publicación directa a Instagram y Facebook
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
