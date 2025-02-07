import React, { useEffect, useRef } from "react";
import { FaUsers, FaDoorOpen } from "react-icons/fa"; 

const ChatInterface = ({
  messages = [],
  input = "",
  setInput,
  sendMessage,
  rooms = [],
  joinRoom,
  username,
  usersInRoom = [],
  newUsername,
  setNewUsername,
  changeUsername,
}) => {
  const messagesEndRef = useRef(null); // Référence pour l'auto-scroll

  // Fonction pour faire défiler automatiquement vers le dernier message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const uniqueUsers = Array.from(
    new Map(usersInRoom.map((user) => [user.username, user])).values()
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-800 flex flex-col items-center">

      {/* 🌟 Header */}
      <header className="w-full bg-white shadow-lg py-5 text-center text-3xl font-extrabold text-primary tracking-wide">
        ChatApp 💬
      </header>

      <div className="flex flex-col md:flex-row w-full h-full justify-center items-center mt-4 px-4 md:px-8">

        {/* 🔥 Sidebar responsive */}
        <div className="w-full md:w-1/4 bg-white p-5 shadow-xl h-auto md:h-[85vh] rounded-lg flex flex-col mb-4 md:mb-0">

          {/* 🌟 Rooms Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-primary">Available Rooms</h2>
              <FaDoorOpen className="text-primary" size={22} />
            </div>
            <ul className="overflow-y-auto max-h-48 space-y-2">
              {rooms.length > 0 ? (
                rooms.map((room) => (
                  <li
                    key={room.name}
                    className="card bg-gray-100 shadow-md hover:bg-primary hover:text-white transition cursor-pointer p-3 rounded-lg"
                    onClick={() => joinRoom(room.name)}
                  >
                    <div className="font-bold">{room.name}</div>
                    <div className="text-sm opacity-70">Created by: {room.creator || "Unknown"}</div>
                    <div className="text-xs text-gray-400">
                      {room.createdAt ? new Date(room.createdAt).toLocaleString() : "Unknown Date"}
                    </div>
                  </li>
                ))
              ) : (
                <li className="text-gray-500 text-center">No rooms available.</li>
              )}
            </ul>
          </div>

          {/* 🌟 Users in Room Section */}
          <div className="bg-gray-100 p-3 rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-secondary">Users in this Room</h3>
              <FaUsers className="text-secondary" size={22} />
            </div>
            <ul className="overflow-y-auto max-h-32 space-y-2">
              {uniqueUsers.length > 0 ? (
                uniqueUsers.map((user, index) => (
                  <li key={index} className="badge badge-secondary p-2">
                    {user.username}
                  </li>
                ))
              ) : (
                <li className="text-gray-500 text-center">No users in this room</li>
              )}
            </ul>
          </div>
        </div>

        {/* 🔥 Chat Interface (Responsive) */}
        <div className="w-full md:w-3/4 max-w-5xl flex flex-col bg-white shadow-2xl rounded-lg p-6 h-[75vh] md:h-[85vh]">

          {/* 🌟 Messages Section */}
          <div className="overflow-y-auto flex-grow flex flex-col gap-3 p-2">
            {messages.map((msg, index) => {
              const isUser = msg.username === username;
              return (
                <div key={index} className={`chat ${isUser ? "chat-end" : "chat-start"}`}>
                  <div className={`chat-bubble ${isUser ? "bg-primary text-white" : "bg-accent text-white"}`}>
                    <div className="text-sm font-bold">{msg.username}</div>
                    <div>{msg.content}</div>
                    <div className="text-xs opacity-70 mt-1 text-right">
                      {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : "No Time"}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* 🌟 Input Box */}
          <div className="flex flex-col md:flex-row items-center gap-2 mt-4 p-3 border-t">
            <input
              className="input input-bordered w-full text-lg p-4"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type your message..."
            />
            <button
              onClick={sendMessage}
              className="btn btn-primary shadow-lg px-6 py-3 text-lg w-full md:w-auto"
            >
              Send
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
