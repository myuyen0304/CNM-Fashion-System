import { useEffect, useMemo, useState } from "react";
import axiosClient from "../../api/axiosClient";
import StaffLayout from "../../components/StaffLayout";

export default function SupportChatPage() {
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState("");
  const [keyword, setKeyword] = useState("");

  const selectedRoomId = useMemo(() => selectedRoom?._id, [selectedRoom]);

  const loadRooms = async (searchKeyword = keyword) => {
    try {
      setLoadingRooms(true);
      const res = await axiosClient.get("/chat/admin/rooms", {
        params: {
          page: 1,
          limit: 50,
          keyword: searchKeyword || undefined,
        },
      });
      const roomList = res.data?.data?.rooms || [];
      setRooms(roomList);

      if (!selectedRoomId && roomList.length > 0) {
        setSelectedRoom(roomList[0]);
      } else if (selectedRoomId) {
        const found = roomList.find((item) => item._id === selectedRoomId);
        if (found) setSelectedRoom(found);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Cannot load support rooms");
    } finally {
      setLoadingRooms(false);
    }
  };

  const loadMessages = async (roomId) => {
    if (!roomId) return;
    try {
      setLoadingMessages(true);
      const res = await axiosClient.get(`/chat/admin/rooms/${roomId}/messages`);
      setMessages(res.data?.data?.messages || []);
    } catch (err) {
      alert(err.response?.data?.message || "Cannot load messages");
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    loadRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadMessages(selectedRoomId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoomId]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (selectedRoomId) loadMessages(selectedRoomId);
      loadRooms(keyword);
    }, 12000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoomId, keyword]);

  const assignToMe = async (roomId) => {
    try {
      await axiosClient.patch(`/chat/admin/rooms/${roomId}/assign-self`);
      loadRooms(keyword);
      loadMessages(roomId);
    } catch (err) {
      alert(err.response?.data?.message || "Cannot assign room");
    }
  };

  const sendMessage = async () => {
    if (!selectedRoomId || !input.trim()) return;
    try {
      await axiosClient.post(`/chat/admin/rooms/${selectedRoomId}/messages`, {
        content: input.trim(),
      });
      setInput("");
      loadMessages(selectedRoomId);
      loadRooms(keyword);
    } catch (err) {
      alert(err.response?.data?.message || "Cannot send message");
    }
  };

  return (
    <StaffLayout
      title="Employee - Customer Support"
      subtitle="Nhận phòng chat, phản hồi khách hàng theo thời gian thực"
    >

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-4 lg:col-span-1">
          <div className="flex gap-2 mb-3">
            <input
              className="input-field"
              placeholder="Search customer"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <button className="btn-secondary" onClick={() => loadRooms(keyword)}>
              Search
            </button>
            <button className="btn-primary" onClick={() => loadRooms(keyword)}>
              Refresh
            </button>
          </div>

          {loadingRooms ? (
            <div className="py-8 text-center text-gray-500">Loading rooms...</div>
          ) : rooms.length === 0 ? (
            <div className="py-8 text-center text-gray-500">No support room</div>
          ) : (
            <div className="space-y-2 max-h-[520px] overflow-auto">
              {rooms.map((room) => (
                <button
                  key={room._id}
                  onClick={() => setSelectedRoom(room)}
                  className={`w-full text-left border rounded p-3 ${
                    selectedRoomId === room._id
                      ? "border-primary bg-blue-50"
                      : "border-gray-200 hover:border-primary/40"
                  }`}
                >
                  <div className="font-semibold">{room.customerId?.name || "Unknown user"}</div>
                  <div className="text-xs text-gray-500">{room.customerId?.email || ""}</div>
                  <div className="text-xs text-gray-600 mt-1">Status: {room.status}</div>
                  <div className="text-xs text-gray-500 truncate mt-1">
                    {room.lastMessage || "No message yet"}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card p-4 lg:col-span-2 flex flex-col min-h-[560px]">
          {!selectedRoom ? (
            <div className="flex-1 grid place-items-center text-gray-500">
              Select a room to start support
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b pb-3 mb-3">
                <div>
                  <div className="font-semibold">
                    {selectedRoom.customerId?.name || "Unknown user"}
                  </div>
                  <div className="text-xs text-gray-500">
                    {selectedRoom.customerId?.email || ""}
                  </div>
                </div>
                <button
                  className="btn-primary text-sm"
                  onClick={() => assignToMe(selectedRoom._id)}
                >
                  Assign To Me
                </button>
              </div>

              <div className="flex-1 overflow-auto space-y-3 pr-1">
                {loadingMessages ? (
                  <div className="py-10 text-center text-gray-500">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="py-10 text-center text-gray-500">No message</div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg._id}
                      className={`max-w-[80%] rounded p-3 ${
                        msg.senderRole === "customer"
                          ? "bg-gray-100"
                          : "bg-primary text-white ml-auto"
                      }`}
                    >
                      <div className="text-xs opacity-80 mb-1">{msg.senderRole}</div>
                      <div>{msg.content}</div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t pt-3 mt-3 flex gap-2">
                <input
                  className="input-field flex-1"
                  placeholder="Type support reply..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
                <button className="btn-primary" onClick={sendMessage}>
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </StaffLayout>
  );
}
