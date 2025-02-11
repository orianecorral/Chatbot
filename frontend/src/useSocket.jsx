import { useState, useEffect } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3000"); // Connexion au serveur

export function useSocket() {
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [messages, setMessages] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [usersInRoom, setUsersInRoom] = useState([]);
  const [notifications, setNotifications] = useState([]);
  
  // Gérer les messages de room
  useEffect(() => {
    const handleRoomMessage = (data) => {
      setMessages((prev) => [...prev, { ...data, timestamp: new Date(data.timestamp) }]);
    };

    socket.on("room message", handleRoomMessage);
    return () => socket.off("room message", handleRoomMessage);
  }, []);

  // Gérer les rooms disponibles
  useEffect(() => {
    socket.emit("list rooms");
    socket.on("available rooms", (rooms) => setAvailableRooms(rooms));

    return () => socket.off("available rooms");
  }, []);

  // Gérer les utilisateurs d'une room
  useEffect(() => {
    socket.on("room users", (users) => {
      const uniqueUsers = Array.from(new Map(users.map((user) => [user.username, user])).values());
      setUsersInRoom(uniqueUsers);
    });

    return () => socket.off("room users");
  }, []);

  // Gérer les messages privés
  useEffect(() => {
    socket.on("private message", (data) => {
      setNotifications((prev) => [...prev, `New private message from ${data.from}: ${data.content}`]);
    });

    return () => socket.off("private message");
  }, []);

  // Rejoindre une room
  const joinRoom = (roomName) => {
    socket.emit("join room", roomName, (response) => {
      if (response.success) {
        setRoom(roomName);
        setMessages(response.messages ?? []);
        setUsersInRoom(response.users ?? []);
      }
    });
  };

  return {
    socket,
    username,
    setUsername,
    room,
    setRoom,
    messages,
    setMessages,
    availableRooms,
    usersInRoom,
    joinRoom,
    notifications,
    setNotifications,
  };
}
