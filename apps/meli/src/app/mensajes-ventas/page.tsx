"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { 
  ArrowLeft, MessageCircle, Send, RefreshCw, Loader2, 
  User, Package, Clock, Check, CheckCheck, AlertCircle,
  Search, Filter, Phone, Mail, ExternalLink, Store
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getNowBA } from "@/lib/date-utils";

interface Conversation {
  id: string;
  pack_id: string;
  order_id: string;
  buyer_id: string;
  buyer_nickname: string;
  buyer_phone?: string;
  buyer_email?: string;
  item_title: string;
  item_thumbnail: string;
  item_id: string;
  total_amount: number;
  order_status: string;
  account_nickname: string;
  meli_account_id: string;
  unread_count: number;
  last_message: string;
  last_message_date: string;
  messages: Message[];
}

interface Message {
  id: string;
  text: string;
  from_user_id: string;
  from_nickname: string;
  date_created: string;
  read: boolean;
  attachments: any[];
}

export default function MensajesVentasPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Cargar conversaciones
  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/meli-messages-detailed", {
        headers: { "Authorization": `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setConversations(data);
        setLastSync(new Date());
      }
    } catch (err) {
      console.error("Error cargando conversaciones:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    // Polling cada 2 minutos
    const interval = setInterval(loadConversations, 120000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  // Scroll al final de mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConv?.messages]);

  // Enviar respuesta
  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedConv) return;

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/meli-messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          order_id: selectedConv.order_id,
          pack_id: selectedConv.pack_id,
          message_text: replyText.trim(),
          meli_account_id: selectedConv.meli_account_id,
        }),
      });

      if (res.ok) {
        setReplyText("");
        // Recargar conversaciones
        await loadConversations();
        // Actualizar conversación seleccionada
        const updated = conversations.find(c => c.id === selectedConv.id);
        if (updated) setSelectedConv(updated);
      }
    } catch (err) {
      console.error("Error enviando mensaje:", err);
    } finally {
      setSending(false);
    }
  };

  // Filtrar conversaciones
  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = 
      conv.buyer_nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.item_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.order_id.includes(searchTerm);
    
    const matchesStatus = filterStatus === "all" || conv.order_status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Formatear fecha
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = getNowBA();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    
    if (hours < 1) return "Hace minutos";
    if (hours < 24) return `Hace ${hours}h`;
    return date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-amber-400" />
                Mensajes de Ventas
              </h1>
              <p className="text-xs text-slate-400">
                {lastSync ? `Sincronizado ${lastSync.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}` : "Cargando..."}
              </p>
            </div>
          </div>
          
          <button
            onClick={loadConversations}
            disabled={loading}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 text-slate-400 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex h-[calc(100vh-80px)]">
        {/* Sidebar - Lista de conversaciones */}
        <div className="w-96 border-r border-slate-800 flex flex-col">
          {/* Filtros */}
          <div className="p-4 border-b border-slate-800 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar comprador o producto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
            >
              <option value="all">Todos los estados</option>
              <option value="paid">Pagado</option>
              <option value="confirmed">Confirmado</option>
              <option value="processing">En proceso</option>
              <option value="ready_to_ship">Listo para enviar</option>
              <option value="shipped">Enviado</option>
            </select>
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No hay conversaciones</p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConv(conv)}
                  className={`w-full p-4 text-left border-b border-slate-800 hover:bg-slate-800/50 transition-colors ${
                    selectedConv?.id === conv.id ? "bg-slate-800/80 border-l-2 border-l-amber-500" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      {conv.item_thumbnail ? (
                        <img
                          src={conv.item_thumbnail}
                          alt=""
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center">
                          <Package className="w-6 h-6 text-slate-500" />
                        </div>
                      )}
                      {conv.unread_count > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-bold">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-white truncate">
                          {conv.buyer_nickname}
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatDate(conv.last_message_date)}
                        </span>
                      </div>
                      
                      <p className="text-sm text-slate-400 truncate">
                        {conv.item_title}
                      </p>
                      
                      <p className={`text-sm truncate ${conv.unread_count > 0 ? "text-white font-medium" : "text-slate-500"}`}>
                        {conv.last_message}
                      </p>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 bg-slate-700 rounded text-slate-300">
                          {conv.account_nickname}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          conv.order_status === "paid" ? "bg-green-500/20 text-green-400" :
                          conv.order_status === "shipped" ? "bg-blue-500/20 text-blue-400" :
                          "bg-amber-500/20 text-amber-400"
                        }`}>
                          {conv.order_status}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat */}
        <div className="flex-1 flex flex-col">
          {selectedConv ? (
            <>
              {/* Header del chat */}
              <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {selectedConv.item_thumbnail ? (
                      <img
                        src={selectedConv.item_thumbnail}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                        <Package className="w-5 h-5 text-slate-500" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-medium text-white">{selectedConv.buyer_nickname}</h3>
                      <p className="text-xs text-slate-400 truncate max-w-md">
                        {selectedConv.item_title}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 bg-slate-800 rounded text-slate-300">
                      Orden: {selectedConv.order_id}
                    </span>
                    <span className="text-xs px-2 py-1 bg-amber-500/20 rounded text-amber-400">
                      ${selectedConv.total_amount.toLocaleString("es-AR")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Info del comprador */}
              <div className="px-4 py-2 bg-slate-800/30 border-b border-slate-800 flex items-center gap-4 text-sm">
                <span className="text-slate-400 flex items-center gap-1">
                  <Store className="w-4 h-4" />
                  {selectedConv.account_nickname}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  selectedConv.order_status === "paid" ? "bg-green-500/20 text-green-400" :
                  selectedConv.order_status === "shipped" ? "bg-blue-500/20 text-blue-400" :
                  "bg-amber-500/20 text-amber-400"
                }`}>
                  {selectedConv.order_status}
                </span>
              </div>

              {/* Mensajes */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedConv.messages.map((msg, idx) => {
                  const isBuyer = msg.from_user_id === selectedConv.buyer_id;
                  return (
                    <div
                      key={msg.id || idx}
                      className={`flex ${isBuyer ? "justify-start" : "justify-end"}`}
                    >
                      <div
                        className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                          isBuyer
                            ? "bg-slate-800 text-white rounded-tl-sm"
                            : "bg-amber-500 text-slate-900 rounded-tr-sm"
                        }`}
                      >
                        <p className="text-sm">{msg.text}</p>
                        <div className={`flex items-center gap-1 mt-1 text-xs ${
                          isBuyer ? "text-slate-500" : "text-amber-700"
                        }`}>
                          <span>{formatDate(msg.date_created)}</span>
                          {!isBuyer && (
                            msg.read ? (
                              <CheckCheck className="w-3 h-3" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input de respuesta */}
              <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Escribe tu respuesta..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendReply()}
                    className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={handleSendReply}
                    disabled={!replyText.trim() || sending}
                    className="p-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
                  >
                    {sending ? (
                      <Loader2 className="w-5 h-5 text-slate-900 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5 text-slate-900" />
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Selecciona una conversación</p>
                <p className="text-sm">Haz clic en un comprador para ver los mensajes</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
