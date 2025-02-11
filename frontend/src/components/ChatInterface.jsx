import React, { useEffect, useRef, useState } from "react";
import { FaUsers, FaDoorOpen, FaBars } from "react-icons/fa"; // ✅ Ajout de FaBars
import RoomSideMenu from "./RoomSideMenu";

const ChatInterface = ({
  messages = [],
  input = "",
  setInput,
  sendMessage,
  joinRoom,
  username,
  rooms,
  setRooms,
  usersInRoom = [],
  newUsername,
  setNewUsername,
  changeUsername,
  socket,
  room,
}) => {
  const messagesEndRef = useRef(null);
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);


  // Auto-scroll vers le dernier message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fonction pour quitter la room
  const leaveRoom = () => {
    socket.emit("quit room", room, (response) => {
      if (response.success) {
        setRoom(""); // Réinitialise la room après le départ
        setUsersInRoom([]); // Vide la liste des utilisateurs
        setIsSideMenuOpen(false); // Ferme le Side Menu
      } else {
        alert(response.message);
      }
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Récupération des rooms disponibles
  useEffect(() => {
    socket.emit("list rooms");
    socket.on("available rooms", (rooms) => setRooms(rooms));
    return () => socket.off("available rooms");
  }, [socket]);

  // Mises à jour des rooms lors des événements
  useEffect(() => {
    socket.on("room created", () => socket.emit("list rooms"));
    socket.on("room deleted", () => socket.emit("list rooms"));
    return () => {
      socket.off("room created");
      socket.off("room deleted");
    };
  }, []);

  // Liste des utilisateurs uniques dans la room
  const uniqueUsers = Array.from(
    new Map(usersInRoom.map((user) => [user.username, user])).values()
  );

  return (
    <div className="h-screen w-full flex flex-col bg-gradient-to-br from-blue-600 to-purple-800">
      {/* 🌟 Header */}
      <header className="w-full bg-white shadow-lg py-5 text-center text-3xl font-extrabold text-primary">
        ChatApp 💬
      </header>

      {/* 🔥 Header affichant la room actuelle */}
      {room && (
        <div className="w-full bg-gray-200 text-center py-3 text-lg font-semibold text-gray-700 shadow-md flex justify-between px-6">
          <span>🏠 Room actuelle : <span className="text-blue-600">{room}</span></span>
          <button onClick={() => setIsSideMenuOpen(true)} className="text-gray-600 hover:text-gray-900">
            <FaBars size={22} /> {/* ✅ Icône du menu */}
          </button>
        </div>
      )}


      {/* 🌟 Conteneur principal avec flex */}
      <div className="flex flex-1 w-full h-full">

        {/* 🔥 Sidebar (Liste des Rooms et Utilisateurs) */}
        <div className="w-1/4 min-w-[250px] bg-white p-5 shadow-xl flex flex-col">
          {/* 🔹 Liste des rooms */}
          <div className="mb-6 flex flex-col flex-1 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-primary">Available Rooms</h2>
              <FaDoorOpen className="text-primary" size={22} />
            </div>
            <ul className="space-y-2">
              {rooms.length > 0 ? (
                rooms.map((room) => (
                  <li
                    key={room.name}
                    className="cursor-pointer bg-gray-100 p-3 rounded-lg shadow-md hover:bg-primary hover:text-white transition"
                    onClick={() => joinRoom(room.name)}
                  >
                    <div className="font-bold">{room.name}</div>
                    <div className="text-sm opacity-70">Created by: {room.creator || "Unknown"}</div>
                  </li>
                ))
              ) : (
                <li className="text-gray-500 text-center">No rooms available.</li>
              )}
            </ul>
          </div>

          {/* 🔹 Liste des utilisateurs */}
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

        {/* 🔥 Chat Interface (Full Height) */}
        <div className="flex-1 flex flex-col bg-white shadow-2xl rounded-lg h-full">

          {/* 🌟 Messages Section */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {messages.map((msg, index) => {
              const isUser = msg.username === username;
              return (
                <div key={index} className={`chat ${isUser ? "chat-end" : "chat-start"}`}>
                  <div className={`chat-bubble ${isUser ? "bg-blue-500 text-white" : "bg-gray-300 text-black"}`}>
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
          <div className="p-4 border-t flex gap-2 bg-gray-100">
            <input
              className="flex-1 p-3 border rounded-md text-lg outline-none"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button
              onClick={sendMessage}
              className="bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700 transition"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* 🔥 Side Menu (s'affiche seulement si ouvert) */}
      {isSideMenuOpen && (
        <RoomSideMenu
          room={room}
          usersInRoom={usersInRoom}
          onClose={() => setIsSideMenuOpen(false)}
          onLeaveRoom={leaveRoom}
        />
      )}

    </div>

  );
};

export default ChatInterface;
