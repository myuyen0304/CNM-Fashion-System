import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { io } from "socket.io-client";
import axiosClient from "../../api/axiosClient";

// Bot avatar icon
function BotAvatar() {
  return (
    <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0 mt-1">
      AI
    </div>
  );
}

// Format thời gian: HH:mm
function formatTime(date) {
  if (!date) return "";
  return new Date(date).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Parse [[Tên sản phẩm|productId]] → styled product chip
function renderMessageContent(content) {
  const parts = [];
  const regex = /\[\[([^\]|]+)\|([^\]]+)\]\]/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>{content.slice(lastIndex, match.index)}</span>,
      );
    }
    const [, name, id] = match;
    parts.push(
      <Link
        key={`${id}-${match.index}`}
        to={`/products/${id}`}
        className="inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 bg-primary/10 text-primary border border-primary/30 rounded-full text-xs font-medium hover:bg-primary/20 transition-colors"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
        {name}
      </Link>,
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < content.length) {
    parts.push(
      <span key={`text-end`}>{content.slice(lastIndex)}</span>,
    );
  }

  return parts.length > 0 ? parts : content;
}

// Bubble tin nhắn
function MessageBubble({ msg, isStreaming = false }) {
  const isCustomer = msg.senderRole === "customer";
  const isSystem = msg.type === "status" || msg.senderRole === "system";

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full max-w-sm text-center">
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-2 ${isCustomer ? "justify-end" : "justify-start"}`}>
      {!isCustomer && <BotAvatar />}
      <div className={`flex flex-col gap-0.5 max-w-[75%] ${isCustomer ? "items-end" : "items-start"}`}>
        <div className="text-xs text-gray-400 px-1">
          {isCustomer ? "Bạn" : msg.senderRole === "bot" ? "Trợ lý AI" : "Nhân viên"}
        </div>
        <div
          className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
            isCustomer
              ? "bg-primary text-white rounded-br-sm"
              : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm"
          }`}
        >
          <div className="whitespace-pre-wrap break-words">
            {renderMessageContent(msg.content)}
          </div>
          {isStreaming && (
            <span className="inline-block w-1 h-4 bg-gray-500 ml-0.5 animate-pulse align-middle" />
          )}
        </div>
        {msg.sentAt && (
          <div className="text-[10px] text-gray-400 px-1">{formatTime(msg.sentAt)}</div>
        )}
      </div>
      {isCustomer && <div className="w-7 shrink-0" />}
    </div>
  );
}

// Typing indicator
function TypingIndicator() {
  return (
    <div className="flex gap-2 justify-start">
      <BotAvatar />
      <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-3 py-2.5 shadow-sm flex items-center gap-1">
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { id: routeRoomId } = useParams();
  const [roomId, setRoomId] = useState(routeRoomId || null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [roomStatus, setRoomStatus] = useState("active");
  const [awaitingResolutionConfirm, setAwaitingResolutionConfirm] = useState(false);
  // Streaming state
  const [streamingContent, setStreamingContent] = useState(null); // null = not streaming
  const [isTyping, setIsTyping] = useState(false); // bot is "thinking" before streaming starts

  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const appendUniqueMessages = (incoming) => {
    const list = Array.isArray(incoming) ? incoming : [incoming];
    setMessages((prev) => {
      const map = new Map(prev.map((msg) => [String(msg._id), msg]));
      for (const msg of list) {
        if (!msg?._id) continue;
        map.set(String(msg._id), msg);
      }
      return Array.from(map.values()).sort(
        (a, b) => new Date(a.sentAt) - new Date(b.sentAt),
      );
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, isTyping]);

  useEffect(() => {
    if (routeRoomId) {
      setRoomId(routeRoomId);
      return;
    }

    axiosClient.get("/chat/rooms").then((res) => {
      const nextRoomId = res.data?.data?._id;
      if (nextRoomId) setRoomId(nextRoomId);
    }).catch(console.error);
  }, [routeRoomId]);

  useEffect(() => {
    if (!roomId) return;

    let socket;

    const initChat = async () => {
      setLoading(true);
      try {
        const res = await axiosClient.get(`/chat/rooms/${roomId}/messages`);
        setMessages(res.data?.data?.messages || []);
        setRoomStatus(res.data?.data?.room?.status || "active");
        setAwaitingResolutionConfirm(
          Boolean(res.data?.data?.room?.awaitingResolutionConfirm),
        );

        const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
        const socketBase = apiBase.replace(/\/api\/?$/, "");

        socket = io(socketBase);
        socketRef.current = socket;

        socket.emit("joinRoom", roomId);

        socket.on("newMessage", (message) => {
          appendUniqueMessages(message);

          if (message.senderRole === "bot" || message.senderRole === "system") {
            const normalized = String(message.content || "").toLowerCase();
            if (normalized.includes("đã giải quyết vấn đề") || normalized.includes("da giai quyet")) {
              setAwaitingResolutionConfirm(true);
              setRoomStatus("resolved");
            }
            if (normalized.includes("kết thúc phiên chat")) {
              setAwaitingResolutionConfirm(false);
              setRoomStatus("closed");
            }
          }
        });

        // Streaming events
        socket.on("botStreamStart", () => {
          setIsTyping(true);
          setStreamingContent("");
        });

        socket.on("botStreamChunk", ({ chunk }) => {
          setIsTyping(false);
          setStreamingContent((prev) => (prev === null ? chunk : prev + chunk));
        });

        socket.on("botStreamEnd", ({ message }) => {
          setIsTyping(false);
          setStreamingContent(null);
          if (message) {
            appendUniqueMessages(message);
          }
        });

        socket.on("adminAssigned", () => {
          setIsTyping(false);
          setStreamingContent(null);
        });

      } catch (err) {
        console.error("Chat init error:", err);
      } finally {
        setLoading(false);
      }
    };

    initChat();

    return () => {
      if (socket) {
        socket.emit("leaveRoom", roomId);
        socket.disconnect();
      }
    };
  }, [roomId]);

  const sendText = async (text) => {
    if (!text.trim() || !roomId || roomStatus === "closed") return;
    setInput("");
    try {
      setSending(true);
      const res = await axiosClient.post(`/chat/rooms/${roomId}/messages`, { content: text.trim() });
      const data = res.data?.data;
      if (data) appendUniqueMessages(Array.isArray(data) ? data : [data]);
    } catch (err) {
      appendUniqueMessages({
        _id: `err-${Date.now()}`,
        senderRole: "system",
        content: err.response?.data?.message || "Lỗi gửi tin nhắn",
        type: "status",
        sentAt: new Date().toISOString(),
      });
    } finally {
      setSending(false);
    }
  };

  const handleSend = () => sendText(input);

  const handleResolutionConfirm = async (resolved) => {
    if (!roomId) return;
    try {
      setSending(true);
      const res = await axiosClient.post(`/chat/rooms/${roomId}/resolve`, { resolved });
      appendUniqueMessages(res.data?.data);
      if (resolved) {
        setRoomStatus("closed");
        setAwaitingResolutionConfirm(false);
      } else {
        setRoomStatus("active");
        setAwaitingResolutionConfirm(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col h-[600px] card items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Đang kết nối...</p>
      </div>
    );
  }

  const isClosed = roomStatus === "closed";

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[600px] card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-white flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
          AI
        </div>
        <div>
          <h2 className="font-semibold text-sm">Trợ lý EShop</h2>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            {isClosed ? (
              <span className="text-gray-400">Phiên đã kết thúc</span>
            ) : (
              <>
                <span className="w-2 h-2 bg-green-400 rounded-full inline-block" />
                Đang hoạt động
              </>
            )}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
        {messages.map((msg) => (
          <MessageBubble key={msg._id} msg={msg} />
        ))}

        {/* Typing indicator (chờ AI bắt đầu stream) */}
        {isTyping && <TypingIndicator />}

        {/* Streaming message (đang gõ từng chữ) */}
        {!isTyping && streamingContent !== null && (
          <MessageBubble
            msg={{
              _id: "streaming",
              senderRole: "bot",
              content: streamingContent,
              sentAt: null,
            }}
            isStreaming
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick reply gợi ý — hiện khi mới bắt đầu chat */}
      {!isClosed && !awaitingResolutionConfirm && !isTyping && streamingContent === null && messages.length <= 2 && (
        <div className="px-4 py-2.5 border-t bg-white flex flex-wrap gap-2">
          {[
            { icon: "🚚", label: "Kiểm tra đơn hàng" },
            { icon: "💰", label: "Phí giao hàng" },
            { icon: "🔄", label: "Chính sách đổi trả" },
            { icon: "👗", label: "Gợi ý sản phẩm" },
          ].map(({ icon, label }) => (
            <button
              key={label}
              onClick={() => sendText(label)}
              disabled={sending || isTyping || streamingContent !== null}
              className="text-xs px-3 py-1.5 rounded-full border border-primary/40 text-primary hover:bg-primary/10 transition-colors disabled:opacity-40"
            >
              {icon} {label}
            </button>
          ))}
        </div>
      )}

      {/* Resolution confirm */}
      {awaitingResolutionConfirm && !isClosed && (
        <div className="px-4 py-3 bg-blue-50 border-t border-blue-100 flex flex-wrap items-center gap-2">
          <p className="text-sm text-gray-600 flex-1 min-w-[160px]">
            Câu trả lời có giải quyết được vấn đề của bạn không?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleResolutionConfirm(true)}
              disabled={sending}
              className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50"
            >
              Đã giải quyết
            </button>
            <button
              onClick={() => handleResolutionConfirm(false)}
              disabled={sending}
              className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-50"
            >
              Hỏi thêm
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t bg-white flex gap-2 items-end">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder={isClosed ? "Phiên chat đã kết thúc" : "Nhập tin nhắn..."}
          className="input-field flex-1 text-sm"
          disabled={isClosed || sending || streamingContent !== null || isTyping}
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim() || isClosed || streamingContent !== null || isTyping}
          className="btn-primary px-4 py-2 text-sm disabled:opacity-40 flex items-center gap-1.5"
        >
          {sending ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
          Gửi
        </button>
      </div>
    </div>
  );
}
