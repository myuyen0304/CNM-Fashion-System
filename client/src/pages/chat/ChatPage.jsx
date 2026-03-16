import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { io } from "socket.io-client";
import axiosClient from "../../api/axiosClient";

/**
 * Parse cú pháp [[Tên sản phẩm|productId]] do AI trả về
 * → render thành <Link> clickable
 */
function renderMessageContent(content) {
  const parts = [];
  const regex = /\[\[([^\]|]+)\|([^\]]+)\]\]/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    const [, name, id] = match;
    parts.push(
      <Link
        key={`${id}-${match.index}`}
        to={`/products/${id}`}
        className="text-blue-600 underline font-medium hover:text-blue-800"
      >
        {name}
      </Link>,
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.length > 0 ? parts : content;
}

export default function ChatPage() {
  const { id: routeRoomId } = useParams();
  const [roomId, setRoomId] = useState(routeRoomId || null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [roomStatus, setRoomStatus] = useState("active");
  const [awaitingResolutionConfirm, setAwaitingResolutionConfirm] =
    useState(false);

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
    if (routeRoomId) {
      setRoomId(routeRoomId);
      return;
    }

    const ensureRoom = async () => {
      try {
        const roomRes = await axiosClient.get("/chat/rooms");
        const nextRoomId = roomRes.data?.data?._id;
        if (nextRoomId) {
          setRoomId(nextRoomId);
        }
      } catch (err) {
        console.error("Create room error:", err);
      }
    };

    ensureRoom();
  }, [routeRoomId]);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    let newSocket;

    const initChat = async () => {
      setLoading(true);

      try {
        const res = await axiosClient.get(`/chat/rooms/${roomId}/messages`);
        setMessages(res.data?.data?.messages || []);
        setRoomStatus(res.data?.data?.room?.status || "active");
        setAwaitingResolutionConfirm(
          Boolean(res.data?.data?.room?.awaitingResolutionConfirm),
        );

        const apiBase =
          import.meta.env.VITE_API_URL || "http://localhost:5000/api";
        const socketBase = apiBase.replace(/\/api\/?$/, "");

        newSocket = io(socketBase, {
          transports: ["websocket"],
        });

        newSocket.emit("joinRoom", roomId);
        newSocket.on("newMessage", (message) => {
          appendUniqueMessages(message);

          if (message.senderRole === "bot") {
            const normalized = String(message.content || "").toLowerCase();
            if (
              normalized.includes("da giai quyet") &&
              normalized.includes("chua")
            ) {
              setAwaitingResolutionConfirm(true);
              setRoomStatus("resolved");
            }
            if (normalized.includes("ket thuc phien chat")) {
              setAwaitingResolutionConfirm(false);
              setRoomStatus("closed");
            }
          }
        });
        newSocket.on("adminAssigned", () => {
          alert("Admin đã tiếp nhận yêu cầu hỗ trợ.");
        });
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };

    initChat();

    return () => {
      if (newSocket) {
        newSocket.emit("leaveRoom", roomId);
        newSocket.off("newMessage", appendUniqueMessages);
        newSocket.disconnect();
      }
    };
  }, [roomId]);

  const handleSend = async () => {
    if (!input.trim() || !roomId) return;
    if (roomStatus === "closed") {
      alert("Phiên chat đã kết thúc. Vui lòng mở phiên mới.");
      return;
    }

    try {
      setSending(true);
      const res = await axiosClient.post(`/chat/rooms/${roomId}/messages`, {
        content: input,
      });

      appendUniqueMessages(res.data?.data);

      setInput("");
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi");
    } finally {
      setSending(false);
    }
  };

  const handleResolutionConfirm = async (resolved) => {
    if (!roomId) return;

    try {
      setSending(true);
      const res = await axiosClient.post(`/chat/rooms/${roomId}/resolve`, {
        resolved,
      });

      appendUniqueMessages(res.data?.data);

      if (resolved) {
        setRoomStatus("closed");
        setAwaitingResolutionConfirm(false);
      } else {
        setRoomStatus("active");
        setAwaitingResolutionConfirm(false);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi xác nhận trạng thái");
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="text-center py-12">Đang tải...</div>;

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-96 card">
      {/* Header */}
      <div className="card-header p-4 border-b">
        <h2 className="font-bold">Hỗ trợ khách hàng</h2>
        <p className="text-sm text-gray-500 mt-1">
          Trạng thái: {roomStatus === "closed" ? "Đã đóng" : "Đang hoạt động"}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg._id}
            className={`flex ${msg.senderRole === "customer" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded-lg ${
                msg.senderRole === "customer"
                  ? "bg-primary text-white rounded-br-none"
                  : "bg-gray-200 text-gray-800 rounded-bl-none"
              }`}
            >
              <div className="text-sm font-semibold mb-1">
                {msg.senderRole === "customer"
                  ? "Bạn"
                  : msg.senderRole === "bot"
                    ? "Bot"
                    : "Admin"}
              </div>
              <div>{renderMessageContent(msg.content)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="card-footer border-t p-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Nhập tin nhắn..."
          className="input-field flex-1"
          disabled={roomStatus === "closed"}
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim() || roomStatus === "closed"}
          className="btn-primary disabled:opacity-50"
        >
          Gửi
        </button>
      </div>

      {awaitingResolutionConfirm && roomStatus !== "closed" && (
        <div className="border-t p-4 bg-gray-50 flex flex-wrap gap-2">
          <button
            onClick={() => handleResolutionConfirm(true)}
            disabled={sending}
            className="btn-primary disabled:opacity-50"
          >
            Đã giải quyết
          </button>
          <button
            onClick={() => handleResolutionConfirm(false)}
            disabled={sending}
            className="btn-secondary disabled:opacity-50"
          >
            Hỏi thêm
          </button>
        </div>
      )}
    </div>
  );
}
