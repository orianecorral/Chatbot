import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import UsernameModal from "./components/UsernameModal";
import RoomModal from "./components/RoomModal";
import ChatInterface from "./components/ChatInterface";
import SideMenu from "./components/SideMenu";
import PrivateMessage from "./components/PrivateMessage";

const socket = io("http://localhost:3000"); // Connexion au serveur

const App = () => {
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [showUsernameModal, setShowUsernameModal] = useState(true);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showSideMenu, setShowSideMenu] = useState(false); // État pour le side menu
  const [availableRooms, setAvailableRooms] = useState([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [usersInRoom, setUsersInRoom] = useState([]); // 🔥 Liste des utilisateurs
  const [notifications, setNotifications] = useState([]);
  const [newUsername, setNewUsername] = useState("");

  // Gestion des messages reçus via Socket.IO
  useEffect(() => {
    const handleRoomMessage = (data) => {
      console.log("Message received from server:", data); // Vérification

      setMessages((prevMessages) => {
        const messageExists = prevMessages.some(
          (msg) => msg.username === data.username && msg.content === data.content
        );
        if (messageExists) return prevMessages; // Évite les doublons

        return [
          ...prevMessages,
          {
            ...data,
            timestamp: new Date(data.timestamp),
          },
        ];
      });
    };

    socket.on("room message", handleRoomMessage);

    // Nettoyez les écouteurs lorsque le composant est démonté ou que `username` change
    return () => {
      socket.off("room message", handleRoomMessage);
    };
  }, [username]);

  useEffect(() => {
    const handleSystemMessage = (message, roomName) => {
      if (roomName === room) { // Vérifie si c'est la bonne room
        showNotification(message);
      }
    };

    // 🔥 Supprime TOUS les anciens écouteurs pour éviter les doublons
    socket.off("system message");

    // 🔥 Utilisation de `on` pour toujours écouter UNE SEULE FOIS
    socket.on("system message", handleSystemMessage);

    return () => {
      socket.off("system message", handleSystemMessage); // 🔥 Nettoyage strict
    };
  }, [room]); // Déclenché UNIQUEMENT lorsque `room` change

  useEffect(() => {
    const fetchRooms = () => {
      socket.emit("list rooms"); // Demande la liste des rooms
    };

    // 🔥 Récupère les rooms disponibles dès le démarrage
    fetchRooms();

    socket.on("available rooms", (rooms) => {
      console.log("🔹 Rooms mises à jour :", rooms);
      setAvailableRooms(rooms); // Met à jour la liste des rooms
    });

    return () => {
      socket.off("available rooms");
    };
  }, []);

  useEffect(() => {
    socket.on("room created", () => {
      socket.emit("list rooms"); // 🔥 Met à jour la liste si une room est créée
    });

    socket.on("room deleted", () => {
      socket.emit("list rooms"); // 🔥 Met à jour la liste si une room est supprimée
    });

    return () => {
      socket.off("room created");
      socket.off("room deleted");
    };
  }, []);




  useEffect(() => {
    socket.on("room users", (users) => {
      // 🔥 Filtrage des doublons côté client
      const uniqueUsers = Array.from(new Map(users.map(user => [user.username, user])).values());
      setUsersInRoom(uniqueUsers);
    });

    return () => {
      socket.off("room users");
    };
  }, []);

  useEffect(() => {
    socket.on("system message", (message) => {
      showNotification(message);
    });

    return () => {
      socket.off("system message");
    };
  }, []);

  useEffect(() => {
    const handleJoinRoom = (response) => {
      if (response.success) {
        setMessages(response.messages ?? []);
        setUsersInRoom(response.users ?? []);
        console.log(`Successfully joined room: ${room}`);
      } else {
        console.error("Error joining room:", response.message);
        setShowRoomModal(true);
      }
    };

    // 🔥 Supprime TOUS les anciens écouteurs avant d'en ajouter un nouveau
    socket.off("join room");

    // 🔥 Ajoute un seul écouteur
    socket.on("join room", handleJoinRoom);

    return () => {
      socket.off("join room", handleJoinRoom); // 🔥 Nettoyage propre
    };
  }, [room]); // Exécute l'effet uniquement si `room` change



  useEffect(() => {
    const handleSocketConnect = () => {
      if (room) {
        // Automatically rejoin room on reconnect
        socket.emit("join room", room, (response) => {
          if (!response.success) {
            console.error("Auto-rejoin failed:", response.message);
          }
        });
      }
    };

    socket.on("connect", handleSocketConnect);

    return () => {
      socket.off("connect", handleSocketConnect);
    };
  }, [room]); // Re-run when room changes




  // Gestion de l'initialisation des rooms disponibles
  useEffect(() => {
    const handleAvailableRooms = (rooms) => {
      console.log("Available rooms received:", rooms);
      if (Array.isArray(rooms)) {
        setAvailableRooms(rooms);
      } else {
        console.error("Invalid rooms data received:", rooms);
      }
    };

    socket.on("available rooms", handleAvailableRooms);

    return () => {
      socket.off("available rooms", handleAvailableRooms);
    };
  }, []);

  const handleUsernameSubmit = (enteredUsername) => {
    setUsername(enteredUsername);
    setShowUsernameModal(false);
    setShowRoomModal(true);
  };
  const showNotification = (message) => {
    setNotifications((prev) => [...prev, message]); // Ajoute le message

    setTimeout(() => {
      setNotifications((prev) => prev.slice(1)); // Supprime après 3s
    }, 5000);
  };

  const handleRoomSubmit = async (enteredRoom) => {
    if (!enteredRoom.trim()) return; // 🔥 Évite les entrées vides

    setIsLoadingMessages(true);
    setRoom(enteredRoom); // 🔥 Met à jour la room avant de rejoindre
    setShowRoomModal(false); // 🔥 Cache immédiatement le prompt

    socket.auth = { username };
    socket.connect();

    socket.emit("join room", enteredRoom, (response) => {
      if (response.success) {
        setMessages(response.messages ?? []);
        setUsersInRoom(response.users ?? []);
        console.log(`Successfully joined room: ${enteredRoom}`);
      } else {
        console.error("Error joining room:", response.message);
        setShowRoomModal(true); // 🔥 Si erreur, on ré-affiche le prompt
      }
      setIsLoadingMessages(false);
    });
  };

  useEffect(() => {
    socket.on("private message", (data) => {
      alert(`New private message from ${data.from}: ${data.content}`);
    });

    return () => {
      socket.off("private message");
    };
  }, []);


  const sendMessage = () => {
    if (!input.trim()) return;

    const parts = input.trim().split(" ");
    const command = parts[0].toLowerCase();
    const arg = parts.slice(1).join(" "); // Argument de la commande

    if (command === "/create") {
      if (!arg) return alert("Usage: /create channel_name");
      socket.emit("create room", arg, (response) => {
        if (!response.success) alert(response.message);
      });
    } else if (command === "/delete") {
      if (!arg) return alert("Usage: /delete channel_name");
      socket.emit("delete room", arg, (response) => {
        if (!response.success) alert(response.message);
      });
    } else if (command === "/join") {
      if (!arg) return alert("Usage: /join channel_name");
      socket.emit("join room", arg, (response) => {
        if (response.success) {
          setRoom(arg);
          setMessages(response.messages ?? []);
          setUsersInRoom(response.users ?? []);
        } else {
          alert(response.message);
        }
      });

    } else if (command === "/quit") {
      if (!arg) return alert("Usage: /quit channel_name");

      socket.emit("quit room", arg, (response) => {
        if (response.success) {
          setRoom(""); // Quitte la room
          setUsersInRoom([]); // Réinitialise les utilisateurs
          showNotification(`You have left the room ${response.room}.`);
        } else {
          alert(response.message);
        }
      });


    } else if (command === "/users") {
      if (!room) {
        alert("You're not in any room.");
        return;
      }

      // 🔥 Demande la liste des utilisateurs au serveur
      socket.emit("get room users", room, (response) => {
        if (response.success) {
          // 🔥 Filtrer les utilisateurs uniques avant d'afficher la notification
          const uniqueUsers = Array.from(
            new Map(response.users.map((user) => [user.username, user])).values()
          );

          const userList = uniqueUsers.map((user) => user.username).join(", ");
          showNotification(`Users in ${room}: ${userList || "No users in this room."}`);
        } else {
          alert(response.message);
        }
      });
    } else if (command === "/list") {
      // 🔥 Demande la liste des rooms au serveur
      socket.emit("list rooms", (response) => {
        if (response.success) {
          let rooms = response.rooms || [];

          // 🔹 Si un filtre (string) est spécifié, filtrer les rooms
          if (arg) {
            rooms = rooms.filter((room) => room.name.toLowerCase().includes(arg.toLowerCase()));
          }

          const roomList = rooms.map((room) => room.name).join(", ") || "No matching rooms found.";
          showNotification(`Available Rooms: ${roomList}`);
        } else {
          alert(response.message);
        }
      });

    } else if (command === "/msg") {
      const parts = input.split(" ");
      if (parts.length < 3) {
        alert("Usage: /msg username message");
        return;
      }

      const to = parts[1];
      const message = parts.slice(2).join(" ");

      socket.emit("private message", { to, message }, (response) => {
        if (!response.success) {
          alert(response.message);
        }
      });
    } else if (command === "/nick") {
      if (!arg) {
        showNotification("Usage: /nick new_username");
      } else {
        changeUsername(arg);
      }

    } else {
      // Envoi de message normal
      socket.emit("room message", {
        room,
        message: input,
        timestamp: new Date().toISOString(),
      });
    }
    setInput("");
  };

  // Update changeUsername function
  const changeUsername = (newName) => {
    if (!newName.trim()) return;

    // Store current room before disconnect
    const previousRoom = room;

    socket.emit("change username", newName.trim(), async (response) => {
      if (response.success) {
        // 🔥 Reconnect and rejoin room
        socket.disconnect();

        // Update socket auth with new username
        socket.auth = { username: newName.trim() };

        // Reconnect and rejoin previous room
        socket.connect();

        if (previousRoom) {
          socket.emit("join room", previousRoom, (joinResponse) => {
            if (joinResponse.success) {
              setUsername(response.newUsername);
              setNewUsername("");
              showNotification(`Username changed to ${response.newUsername}`);
            } else {
              alert("Failed to rejoin room after username change");
            }
          });
        }
      } else {
        alert(response.message);
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-800 flex flex-col items-center justify-center p-6">
      {/* 🔥 Encart utilisateur connecté */}
      <div className="fixed bottom-4 left-4 bg-gray-100 p-3 rounded-lg shadow-md flex items-center gap-2">
        <span className="text-gray-700 text-lg font-semibold">👤 {username}</span>
      </div>
      {showUsernameModal && <UsernameModal onSubmit={handleUsernameSubmit} />}
      {showRoomModal && <RoomModal onSubmit={handleRoomSubmit} />}

      {!showUsernameModal && !showRoomModal && (
        <>
          {/* 🔥 Interface du Chat */}
          <ChatInterface
            messages={messages || []} // Par défaut, un tableau vide
            input={input}
            setInput={setInput}
            sendMessage={sendMessage}
            rooms={availableRooms}
            setRooms={setAvailableRooms}
            joinRoom={handleRoomSubmit}
            username={username}
            usersInRoom={usersInRoom}
            changeUsername={changeUsername}
            newUsername={newUsername}
            setNewUsername={setNewUsername}
            socket={socket}

          />
        </>
      )}

      {/* 🔥 SideMenu amélioré */}
      {showSideMenu && (
        <SideMenu
          rooms={availableRooms}
          onClose={() => setShowSideMenu(false)}
          onJoinRoom={(room) => handleRoomSubmit(room)}
        />
      )}

      {/* Interface des messages privés */}
      <PrivateMessage socket={socket} username={username} />

      {/* 🔥 Notifications stylisées */}
      <div className="fixed top-5 right-5 flex flex-col space-y-2 z-50">
        {notifications.map((msg, index) => (
          <div key={index} className="alert alert-success shadow-lg text-lg p-3 transition-opacity duration-500 animate-fadeIn">
            {msg}
          </div>
        ))}
      </div>
    </div>


  );
};

export default App;