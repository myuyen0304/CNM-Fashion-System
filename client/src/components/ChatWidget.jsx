import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { io } from "socket.io-client";
import axiosClient from "../api/axiosClient";

function BotAvatar() {
  return (
    <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
      AI
    </div>
  );
}

function formatTime(date) {
  if (!date) return "";
  return new Date(date).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function renderContent(content) {
  const parts = [];
  const regex = /\[\[([^\]|]+)\|([^\]]+)\]\]/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) parts.push(content.slice(lastIndex, match.index));
    const [, name, id] = match;
    parts.push(
      <Link
        key={`${id}-${match.index}`}
        to={`/products/${id}`}
        className="inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 bg-primary/10 text-primary border border-primary/30 rounded-full text-xs font-medium hover:bg-primary/20"
      >
        🛍 {name}
      </Link>
    );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < content.length) parts.push(content.slice(lastIndex));
  return parts.length > 0 ? parts : content;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [roomId, setRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [roomStatus, setRoomStatus] = useState("active");
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);
  const [streamingContent, setStreamingContent] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [unread, setUnread] = useState(0);

  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const roomIdRef = useRef(null);

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => { scrollToBottom(); }, [messages, streamingContent, isTyping]);

  // Khởi tạo room + socket 1 lần khi component mount (không phụ thuộc vào open)
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const roomRes = await axiosClient.get("/chat/rooms");
        const rid = roomRes.data?.data?._id;
        if (!rid || !mounted) return;
        setRoomId(rid);
        roomIdRef.current = rid;

        const msgRes = await axiosClient.get(`/chat/rooms/${rid}/messages`);
        if (!mounted) return;
        setMessages(msgRes.data?.data?.messages || []);
        setRoomStatus(msgRes.data?.data?.room?.status || "active");
        setAwaitingConfirm(Boolean(msgRes.data?.data?.room?.awaitingResolutionConfirm));

        const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
        const socketBase = apiBase.replace(/\/api\/?$/, "");
        // Không giới hạn transport → cho phép fallback polling nếu WebSocket fail
        const socket = io(socketBase);
        socketRef.current = socket;
        socket.emit("joinRoom", rid);

        socket.on("newMessage", (msg) => {
          if (!mounted) return;
          setMessages((prev) => {
            const map = new Map(prev.map((m) => [String(m._id), m]));
            if (msg?._id) map.set(String(msg._id), msg);
            return Array.from(map.values()).sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));
          });
          setUnread((n) => n + 1);

          const norm = String(msg.content || "").toLowerCase();
          if (msg.senderRole === "bot") {
            if (norm.includes("đã giải quyết vấn đề")) { setAwaitingConfirm(true); setRoomStatus("resolved"); }
            if (norm.includes("kết thúc phiên chat")) { setAwaitingConfirm(false); setRoomStatus("closed"); }
          }
        });

        socket.on("botStreamStart", () => { if (mounted) { setIsTyping(true); setStreamingContent(""); } });
        socket.on("botStreamChunk", ({ chunk }) => { if (mounted) { setIsTyping(false); setStreamingContent((p) => (p === null ? chunk : p + chunk)); } });
        socket.on("botStreamEnd", ({ message }) => {
          if (!mounted) return;
          setIsTyping(false);
          setStreamingContent(null);
          if (message) {
            setMessages((prev) => {
              const map = new Map(prev.map((m) => [String(m._id), m]));
              map.set(String(message._id), message);
              return Array.from(map.values()).sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));
            });
          }
        });
      } catch (err) {
        console.error("ChatWidget init error:", err);
      }
    };

    init();

    return () => {
      mounted = false;
      if (socketRef.current) {
        if (roomIdRef.current) socketRef.current.emit("leaveRoom", roomIdRef.current);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []); // chỉ chạy 1 lần khi mount

  const handleOpen = () => { setOpen((prev) => !prev); setUnread(0); };

  const sendText = async (text) => {
    if (!text.trim() || !roomId || roomStatus === "closed") return;
    setInput("");
    try {
      setSending(true);
      const res = await axiosClient.post(`/chat/rooms/${roomId}/messages`, { content: text.trim() });
      const data = res.data?.data;
      if (data) {
        const list = Array.isArray(data) ? data : [data];
        setMessages((prev) => {
          const map = new Map(prev.map((m) => [String(m._id), m]));
          list.forEach((m) => m?._id && map.set(String(m._id), m));
          return Array.from(map.values()).sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    await sendText(input);
  };

  const handleConfirm = async (resolved) => {
    if (!roomId) return;
    try {
      setSending(true);
      const res = await axiosClient.post(`/chat/rooms/${roomId}/resolve`, { resolved });
      const data = res.data?.data;
      if (data) {
        const list = Array.isArray(data) ? data : [data];
        setMessages((prev) => {
          const map = new Map(prev.map((m) => [String(m._id), m]));
          list.forEach((m) => m?._id && map.set(String(m._id), m));
          return Array.from(map.values()).sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));
        });
      }
      setAwaitingConfirm(false);
      setRoomStatus(resolved ? "closed" : "active");
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const isClosed = roomStatus === "closed";
  const isStreaming = streamingContent !== null;
  const inputDisabled = isClosed || sending || isStreaming || isTyping;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary text-white rounded-full shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center"
        aria-label="Mở chat hỗ trợ"
      >
        {open ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unread}
              </span>
            )}
          </>
        )}
      </button>

      {/* Chat popup */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200" style={{ height: "480px" }}>
          {/* Header */}
          <div className="px-4 py-3 bg-primary text-white flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">AI</div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Trợ lý EShop</p>
              <p className="text-[11px] text-white/70 flex items-center gap-1">
                {isClosed
                  ? "Phiên đã kết thúc"
                  : <><span className="w-1.5 h-1.5 bg-green-300 rounded-full" /> Đang hoạt động</>}
              </p>
            </div>
            <Link to="/chat" className="text-white/70 hover:text-white text-[11px] underline">
              Mở rộng
            </Link>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 bg-gray-50">
            {messages.map((msg) => {
              const isCustomer = msg.senderRole === "customer";
              const isSystem = msg.type === "status" || msg.senderRole === "system";

              if (isSystem) {
                return (
                  <div key={msg._id} className="flex justify-center">
                    <span className="text-[11px] text-gray-400 bg-gray-100 px-3 py-1 rounded-full text-center max-w-[90%]">
                      {msg.content}
                    </span>
                  </div>
                );
              }

              return (
                <div key={msg._id} className={`flex gap-1.5 ${isCustomer ? "justify-end" : "justify-start"}`}>
                  {!isCustomer && <BotAvatar />}
                  <div className={`flex flex-col gap-0.5 max-w-[80%] ${isCustomer ? "items-end" : "items-start"}`}>
                    <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed ${isCustomer ? "bg-primary text-white rounded-br-sm" : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm"}`}>
                      <div className="whitespace-pre-wrap break-words">{renderContent(msg.content)}</div>
                    </div>
                    {msg.sentAt && <span className="text-[10px] text-gray-400 px-1">{formatTime(msg.sentAt)}</span>}
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex gap-1.5 justify-start">
                <BotAvatar />
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-3 py-2.5 shadow-sm flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            {/* Streaming text */}
            {!isTyping && isStreaming && (
              <div className="flex gap-1.5 justify-start">
                <BotAvatar />
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm text-xs text-gray-800 max-w-[80%] whitespace-pre-wrap break-words">
                  {renderContent(streamingContent)}
                  <span className="inline-block w-0.5 h-3.5 bg-gray-500 ml-0.5 animate-pulse align-middle" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Resolution confirm */}
          {awaitingConfirm && !isClosed && (
            <div className="px-3 py-2 bg-blue-50 border-t border-blue-100 flex gap-2">
              <button onClick={() => handleConfirm(true)} disabled={sending} className="flex-1 btn-primary text-xs py-1.5 disabled:opacity-50">Đã giải quyết</button>
              <button onClick={() => handleConfirm(false)} disabled={sending} className="flex-1 btn-secondary text-xs py-1.5 disabled:opacity-50">Hỏi thêm</button>
            </div>
          )}

          {/* Quick reply gợi ý */}
          {!isClosed && !awaitingConfirm && !isTyping && !isStreaming && messages.length <= 2 && (
            <div className="px-3 py-2 border-t bg-white flex flex-wrap gap-1.5">
              {[
                { icon: "🚚", label: "Kiểm tra đơn hàng" },
                { icon: "💰", label: "Phí giao hàng" },
                { icon: "🔄", label: "Chính sách đổi trả" },
                { icon: "👗", label: "Gợi ý sản phẩm" },
              ].map(({ icon, label }) => (
                <button
                  key={label}
                  onClick={() => sendText(label)}
                  disabled={inputDisabled}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-primary/40 text-primary hover:bg-primary/10 transition-colors disabled:opacity-40"
                >
                  {icon} {label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-2.5 border-t bg-white flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder={isClosed ? "Phiên đã kết thúc" : "Nhập tin nhắn..."}
              className="input-field flex-1 text-xs py-2"
              disabled={inputDisabled}
            />
            <button
              onClick={handleSend}
              disabled={inputDisabled || !input.trim()}
              className="btn-primary px-3 py-2 text-xs disabled:opacity-40"
            >
              {sending
                ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              }
            </button>
          </div>
        </div>
      )}
    </>
  );
}
