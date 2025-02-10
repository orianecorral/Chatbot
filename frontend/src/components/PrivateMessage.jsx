import React, { useState, useEffect } from "react";
import { IoMdClose } from "react-icons/io";
import { FaPaperPlane } from "react-icons/fa";
import { MdMessage } from "react-icons/md";

const PrivateMessage = ({ socket, username }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [selectedUser, setSelectedUser] = useState("");

  useEffect(() => {
    const handlePrivateMessage = (data) => {
      console.log("📩 Message privé reçu :", data);
      setMessages((prevMessages) => [...prevMessages, data]);
    };
  
    socket.on("private message", handlePrivateMessage);
  
    return () => {
      socket.off("private message", handlePrivateMessage);
    };
  }, []);
  
  

  // Fonction pour envoyer un message privé
  const sendPrivateMessage = () => {
    if (!input.trim() || !selectedUser.trim()) return;
  
    if (!socket.connected) {
      console.error("Socket is not connected. Trying to reconnect...");
      socket.connect();
    }
  
    const messageData = { to: selectedUser, message: input };
  
    socket.emit("private message", messageData, (response) => {
      if (response.success) {
        setMessages((prevMessages) => [
          ...prevMessages,
          { from: username, to: selectedUser, content: input, timestamp: new Date() },
        ]);
      } else {
        alert(response.message);
      }
    });
  
    setInput("");
  };
  

  return (
    <div>
      {/* Bouton flottant pour ouvrir la messagerie privée */}
      <button
        className="fixed bottom-5 right-5 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all"
        onClick={() => setIsOpen(!isOpen)}
      >
        <MdMessage size={24} />
      </button>

      {/* Fenêtre de messages privés */}
      {isOpen && (
        <div className="fixed bottom-16 right-5 w-80 bg-white shadow-xl rounded-lg overflow-hidden border border-gray-300">
          {/* Header */}
          <div className="bg-blue-600 text-white p-3 flex justify-between items-center">
            <h3 className="text-lg font-bold">Messages Privés</h3>
            <IoMdClose
              className="cursor-pointer hover:text-gray-300"
              size={24}
              onClick={() => setIsOpen(false)}
            />
          </div>

          {/* Liste des messages */}
          <div className="h-60 overflow-y-auto p-3 space-y-2">
            {messages.length > 0 ? (
              messages.map((msg, index) => (
                <div
                  key={index}
                  className={`p-2 text-sm max-w-[80%] rounded-md ${
                    msg.from === username
                      ? "bg-blue-500 text-white ml-auto text-right"
                      : "bg-gray-300 text-black"
                  }`}
                >
                  <strong>{msg.from}</strong>: {msg.content}
                  <div className="text-xs opacity-70 mt-1">{new Date(msg.timestamp).toLocaleTimeString()}</div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center">Aucun message privé.</p>
            )}
          </div>

          {/* Input pour envoyer un message */}
          <div className="p-3 border-t flex gap-2">
            <input
              className="w-1/3 p-2 border rounded-md text-sm outline-none"
              placeholder="Utilisateur..."
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
            />
            <input
              className="w-full p-2 border rounded-md text-sm outline-none"
              placeholder="Message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendPrivateMessage()}
            />
            <button
              className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition-all"
              onClick={sendPrivateMessage}
            >
              <FaPaperPlane />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrivateMessage;
