import { getMessagesCollection } from "./database.js";
import { createRoom, joinRoom, addMessageToRoom, getRoomMessages } from "./rooms.js";
import { getAvailableRooms } from "./rooms.js";
import { getRoomsCollection } from "./database.js";
import { getPrivateMessagesCollection } from "./database.js";

export function handleSocketConnection(io) {
  io.on("connection", async (socket) => {
    const username = socket.handshake.auth.username;
    if (!username) {
      console.error("No username provided!");
      socket.disconnect();
      return;
    }

    console.log(`User connected: ${username}`);
    let currentRoom = null;

    // Gestion des messages généraux (hors rooms)
    socket.on("chat message", async (msg) => {
      try {
        const messagesCollection = getMessagesCollection();
        const result = await messagesCollection.insertOne({
          username: username,
          content: msg,
          timestamp: new Date(),
        });
        io.emit("chat message", { username, content: msg });
        console.log(`Message sent by ${username}: ${msg}`);
      } catch (err) {
        console.error("Failed to insert message", err);
      }
    });

    // Gestion de la création d'une room
    socket.on("create room", async (roomName, callback) => {
      try {
        if (!roomName) throw new Error("Room name is required.");
        const room = await createRoom(roomName, username);

        if (room.success) {
          io.emit("available rooms", await getAvailableRooms()); // Met à jour la liste des rooms
          callback({ success: true, room: room.room });
        } else {
          callback({ success: false, message: "Room creation failed." });
        }
      } catch (error) {
        console.error("Error creating room:", error);
        callback({ success: false, message: error.message });
      }
    });

    // Gestion de l'entrée dans une room
    socket.on("join room", async (roomName, callback) => {
      try {
        const currentUsername = socket.handshake.auth.username;
        console.log(`User ${currentUsername} is trying to join room: ${roomName}`);
    
        // 1. Check existing membership first
        const wasAlreadyInRoom = socket.rooms.has(roomName);
        
        // 2. Process room joining
        const result = await joinRoom(roomName, currentUsername);
        if (!result.success) {
          console.log(`Join room failed for ${roomName}`);
          return callback({ success: false, message: "Could not join room." });
        }
    
        // 3. Only join physically if not already in room
        if (!wasAlreadyInRoom) {
          const previousRooms = Array.from(socket.rooms).filter(r => r !== socket.id);
          previousRooms.forEach(r => socket.leave(r));
          socket.join(roomName);
          console.log(`User ${currentUsername} physically joined ${roomName}`);
        }
    
        // 4. Get room data
        const [messagesResult, room] = await Promise.all([
          getRoomMessages(roomName),
          getRoomsCollection().findOne({ name: roomName })
        ]);
    
        // 5. Deduplicate users
        const uniqueUsers = Array.from(
          new Map(room.users.map(user => [user.username, user])).values()
        );
    
        // 6. Update clients
        io.to(roomName).emit("room users", uniqueUsers);
        
        // 7. Send system message ONLY for new joins
        if (!wasAlreadyInRoom) {
          io.to(roomName).emit("system message", 
            `${currentUsername} has joined the room`,
            roomName
          );
        }
    
        callback({
          success: true,
          room: result.room,
          messages: messagesResult.messages || [],
          users: uniqueUsers || [],
        });
    
      } catch (error) {
        console.error("Join room error:", error.message);
        callback({ success: false, message: error.message });
      }
    });

    socket.on("list rooms", async () => {
      try {
        const roomsCollection = getRoomsCollection();
        const rooms = await roomsCollection.find({}).toArray();
    
        // 🔥 Envoi des rooms à tous les clients
        io.emit("available rooms", rooms);
      } catch (error) {
        console.error("❌ Erreur lors de la récupération des rooms :", error);
      }
    });
    

    socket.on("private message", async ({ to, message }, callback) => {
      try {
        const privateMessagesCollection = getPrivateMessagesCollection();
    
        // Vérifier si l'utilisateur est bien identifié
        if (!socket.handshake.auth.username) {
          return callback({ success: false, message: "User not authenticated." });
        }
    
        const sender = socket.handshake.auth.username;
        const messageData = {
          from: sender,
          to,
          content: message,
          timestamp: new Date(),
        };
    
        console.log("📩 Message privé envoyé :", messageData);
    
        // ✅ 1. Sauvegarde en base de données
        await privateMessagesCollection.insertOne(messageData);
    
        // ✅ 2. Trouver le socket du destinataire
        const recipientSocket = [...io.sockets.sockets.values()].find(
          (s) => s.handshake.auth.username === to
        );
    
        if (recipientSocket) {
          console.log(`📨 Message délivré à : ${to}`);
          recipientSocket.emit("private message", messageData);
        } else {
          console.warn(`⚠️ ${to} est hors ligne. Message stocké en DB.`);
        }
    
        callback({ success: true });
      } catch (error) {
        console.error("Erreur d'envoi du message privé :", error);
        callback({ success: false, message: "Erreur lors de l'envoi." });
      }
    });

    socket.on("get private messages", async ({ with: user }, callback) => {
      try {
        const privateMessagesCollection = getPrivateMessagesCollection();
        const username = socket.handshake.auth.username;
    
        // 🔥 Trouver les messages échangés entre les deux utilisateurs
        const messages = await privateMessagesCollection
          .find({
            $or: [
              { from: username, to: user },
              { from: user, to: username },
            ],
          })
          .sort({ timestamp: 1 }) // Trie par ordre chronologique
          .toArray();
    
        callback({ success: true, messages });
      } catch (error) {
        console.error("Erreur lors du chargement des messages privés :", error);
        callback({ success: false, message: "Impossible de récupérer les messages." });
      }
    });
    
    socket.on("get private conversations", async () => {
      try {
        const privateMessagesCollection = getPrivateMessagesCollection();
        const username = socket.handshake.auth.username;
    
        // 🔥 Récupérer la liste unique des utilisateurs avec qui cet utilisateur a discuté
        const sentConversations = await privateMessagesCollection.distinct("to", { from: username });
        const receivedConversations = await privateMessagesCollection.distinct("from", { to: username });
    
        // 🔥 Fusionner les conversations sans doublons
        const conversations = Array.from(new Set([...sentConversations, ...receivedConversations]));
    
        console.log("📌 Conversations envoyées :", conversations); // 🔥 Debug
    
        // 🔥 Envoi des conversations au client
        socket.emit("private conversations", conversations);
      } catch (error) {
        console.error("Erreur lors de la récupération des conversations :", error);
        socket.emit("private conversations error", "Impossible de récupérer les conversations.");
      }
    });
    
  
    // In your socket.io connection handler
    socket.on("change username", async (newUsername, callback) => {
      try {
        const oldUsername = socket.handshake.auth.username;

        // Update socket authentication immediately
        socket.handshake.auth.username = newUsername;

        // Update database records
        const roomsCollection = getRoomsCollection();
        await roomsCollection.updateMany(
          { "users.username": oldUsername },
          { $set: { "users.$[elem].username": newUsername } },
          { arrayFilters: [{ "elem.username": oldUsername }] }
        );

        // Notify all clients
        io.emit("system message", `${oldUsername} is now known as ${newUsername}`);

        // Force refresh room user lists
        const rooms = await roomsCollection.find({
          "users.username": newUsername
        }).toArray();

        rooms.forEach(room => {
          io.to(room.name).emit("room users", room.users);
        });

        callback({ success: true, newUsername });
      } catch (error) {
        console.error("Error changing username:", error);
        callback({ success: false, message: "Error changing username." });
      }
    });

    // Quand un utilisateur quitte une room
    socket.on("quit room", async (roomName, callback) => {
      try {
        const roomsCollection = getRoomsCollection();
        await roomsCollection.updateOne(
          { name: roomName },
          { $pull: { users: { username: socket.username } } }
        );

        io.to(roomName).emit("system message", `${socket.username} has left the room`, roomName);
        socket.leave(roomName);
        callback({ success: true, room: roomName }); // 🔥 Envoie une réponse
      } catch (error) {
        console.error("Error quitting room:", error);
        callback({ success: false, message: "Failed to leave the room." }); // 🔥 Gérer l'erreur
      }
    });


    // Suppression d'une room
    socket.on("delete room", async (roomName, callback) => {
      try {
        const roomsCollection = getRoomsCollection();
        const room = await roomsCollection.findOne({ name: roomName });

        if (!room) {
          return callback({ success: false, message: "Room not found." });
        }

        if (room.creator !== username) {
          return callback({ success: false, message: "Only the creator can delete this room." });
        }

        await roomsCollection.deleteOne({ name: roomName });
        io.emit("available rooms", await getAvailableRooms()); // Met à jour la liste
        callback({ success: true });
      } catch (error) {
        callback({ success: false, message: "Error deleting room." });
      }
    });


    // Gestion des messages dans une room
    // In your "room message" handler
    socket.on("room message", async ({ room, message, timestamp }) => {
      // 🔥 Get FRESH username from socket auth
      const currentUsername = socket.handshake.auth.username;

      // 🔥 Validate room membership using rooms API
      if (!room || !socket.rooms.has(room)) {
        socket.emit("error", "You are not part of this room.");
        return;
      }

      const messageData = {
        username: currentUsername,
        content: message,
        timestamp: new Date(timestamp || Date.now())
      };

      try {
        const result = await addMessageToRoom(room, currentUsername, message, new Date());

        if (result.success) {
          io.to(room).emit("room message", messageData);
          console.log(`Message in ${room} by ${currentUsername}: ${message}`);
        } else {
          socket.emit("error", result.message);
        }
      } catch (error) {
        console.error("Message save error:", error);
        socket.emit("error", "Failed to save message");
      }
    });
    

    socket.on("get rooms", async () => {
      try {
        const rooms = await getAvailableRooms();
        socket.emit("available rooms", rooms);
      } catch (error) {
        console.error("Error fetching rooms:", error);
      }
    });


    socket.on("available rooms", (rooms) => {
      if (Array.isArray(rooms)) {
        setAvailableRooms(rooms);
      } else {
        console.error("Received rooms data is not an array:", rooms);
      }
    });

    socket.on("get room users", async (roomName, callback) => {
      try {
        const roomsCollection = getRoomsCollection();
        const room = await roomsCollection.findOne({ name: roomName });

        if (!room) {
          return callback({ success: false, message: "Room not found." });
        }

        // 🔹 Liste des utilisateurs de la room
        const users = room.users || [];
        callback({ success: true, users });
      } catch (error) {
        console.error("Error fetching room users:", error);
        callback({ success: false, message: "Could not fetch users." });
      }
    });


    // Gestion de la déconnexion de l'utilisateur
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${username}`);
      if (currentRoom) {
        io.to(currentRoom).emit("system message", `${username} disconnected`);
      }
    });
    socket.on("disconnect", (reason) => {
      console.warn(`⚠️ User ${username} disconnected. Reason: ${reason}`);
    });
    
  });
}