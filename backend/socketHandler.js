import { getMessagesCollection } from "./database.js";
import { createRoom, joinRoom, addMessageToRoom, getRoomMessages } from "./rooms.js";
import { getAvailableRooms } from "./rooms.js";
import { getRoomsCollection } from "./database.js";



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


    socket.on("list rooms", async (callback) => {
      try {
        const roomsCollection = getRoomsCollection();
        const rooms = await roomsCollection.find({}).toArray();
        callback({ success: true, rooms });
      } catch (error) {
        console.error("Error fetching rooms:", error);
        callback({ success: false, message: "Could not fetch rooms." });
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
  });
}