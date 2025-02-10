import React, { useState, useEffect } from "react";
import { IoMdClose } from "react-icons/io";
import { FaPaperPlane } from "react-icons/fa";
import { MdMessage } from "react-icons/md";

const PrivateMessage = ({ socket, username }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [selectedUser, setSelectedUser] = useState("");
    const [conversations, setConversations] = useState([]); // Liste des conversations privées


    useEffect(() => {
        const handlePrivateMessage = (data) => {
            console.log("📩 Message privé reçu :", data);
            setMessages((prevMessages) => [...prevMessages, data]);

            // ✅ Ajouter l'utilisateur à la liste des conversations s'il est absent
            setConversations((prev) => {
                if (!prev.includes(data.from) && data.from !== username) {
                    return [...prev, data.from];
                }
                return prev;
            });
        };

        socket.on("private message", handlePrivateMessage);

        return () => {
            socket.off("private message", handlePrivateMessage);
        };
    }, [socket, username]);
    useEffect(() => {
        socket.emit("get private conversations", (response) => {
          if (response.success) {
            console.log("📌 Conversations reçues du serveur :", response.conversations);
            setConversations(response.conversations);
          } else {
            console.error("❌ Erreur lors de la récupération des conversations :", response.message);
          }
        });
      
        return () => {
          socket.off("private conversations");
        };
      }, []);
       // 🔥 Plus besoin de `conversations` ici

    useEffect(() => {
        socket.emit("get private conversations", {}, (response) => {
          if (response.success) {
            setConversations(response.conversations);
          }
        });
      }, []);
      



    // Fonction pour envoyer un message privé
    const sendPrivateMessage = () => {
        if (!input.trim() || !selectedUser.trim()) return;
      
        const messageData = { to: selectedUser, message: input };
      
        socket.emit("private message", messageData, (response) => {
          if (response.success) {
            setMessages((prevMessages) => [
              ...prevMessages,
              { from: username, to: selectedUser, content: input, timestamp: new Date() },
            ]);
      
            // ✅ Ajouter automatiquement l'utilisateur à la liste des conversations
            setConversations((prev) =>
              prev.includes(selectedUser) ? prev : [...prev, selectedUser]
            );
          } else {
            alert(response.message);
          }
        });
      
        setInput("");
      };
      

    const loadMessages = (user) => {
        setSelectedUser(user);
        setMessages([]); // 🔄 Reset des messages en attendant la réponse du serveur

        socket.emit("get private messages", { with: user }, (response) => {
            if (response.success) {
                setMessages(response.messages);
            } else {
                console.error("Erreur lors du chargement des messages :", response.message);
            }
        });
    };



    return (
        <div>
            {/* 🔥 Liste des conversations */}
            <div className="h-20 border-b p-3 overflow-x-auto flex gap-2">
                {conversations.length > 0 ? (
                    conversations.map((user, index) => (
                        <button
                            key={index}
                            onClick={() => loadMessages(user)}
                            className={`p-2 rounded-lg text-sm ${selectedUser === user ? "bg-blue-500 text-white" : "bg-gray-200"
                                }`}
                        >
                            {user}
                        </button>
                    ))
                ) : (
                    <p className="text-gray-500 text-center w-full">Aucune conversation</p>
                )}
            </div>
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
                                    className={`p-2 text-sm max-w-[80%] rounded-md ${msg.from === username
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
                        {/* 🔥 Si aucune conversation, autoriser la saisie manuelle */}
                        {conversations.length === 0 ? (
                            <input
                                className="w-1/3 p-2 border rounded-md text-sm outline-none"
                                placeholder="Utilisateur..."
                                value={selectedUser}
                                onChange={(e) => setSelectedUser(e.target.value)}
                            />
                        ) : (
                            <div className="w-1/3 p-2 border rounded-md text-sm bg-gray-100 text-center">
                                {selectedUser ? selectedUser : "Choisis un chat"}
                            </div>
                        )}


                        {/* 🔥 Champ de saisie du message */}
                        <input
                            className="w-full p-2 border rounded-md text-sm outline-none"
                            placeholder="Message..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && sendPrivateMessage()}
                        />

                        {/* 🔥 Bouton d'envoi */}
                        <button
                            className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition-all"
                            onClick={sendPrivateMessage}
                        >
                            <FaPaperPlane />
                        </button>
                    </div>

                </div>)
            }
        </div >
    );
};

export default PrivateMessage;
