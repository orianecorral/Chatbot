import { getRoomsCollection } from './database.js';
import { getMessagesCollection } from "./database.js"; 

/**
 * Crée une nouvelle room si elle n'existe pas déjà.
 * @param {string} roomName Nom de la room.
 * @param {string} creator Nom de l'utilisateur créant la room.
 */
export async function createRoom(roomName, creator) {
  console.log(roomName)
  try {
    const roomsCollection = getRoomsCollection();
    const roomExists = await roomsCollection.findOne({ name: roomName });
    if (roomExists) {
      console.log(`Room already exists: ${roomName}`);
      throw new Error('Room already exists');
    }

    // Création de la room
    const newRoom = {
      name: roomName,
      users: [{ username: creator, joinedAt: new Date() }],
      messages: [],
      creator,
      createdAt: new Date(),
    };

    console.log("Inserting room:", newRoom);
    await roomsCollection.insertOne(newRoom);

    console.log("Room created successfully:", roomName);
    return { success: true, room: newRoom };
  } catch (err) {
    console.error("Failed to create room:", err.message);
    throw err; // Relancer l'erreur pour gestion dans le socket
  }
}

/**
 * Ajoute un utilisateur à une room existante.
 * @param {string} roomName Nom de la room.
 * @param {string} username Nom de l'utilisateur à ajouter.
 */
export async function joinRoom(roomName, username) {

  const roomsCollection = getRoomsCollection();
  const room = await roomsCollection.findOne({ name: roomName });

  if (!room) {
    console.log("Room not found, creating it...");
    const createdRoom = await createRoom(roomName, username);
    return createdRoom;
  }

  // const alreadyInRoom = room.users.some(user => user.username === username);
  // if (alreadyInRoom) {
  //     return { success: true, message: 'User already in the room', room };
  // }

  await roomsCollection.updateOne(
    { name: roomName },
    { $addToSet: { users: { username, joinedAt: new Date() } } }
  );

  return { success: true, message: 'User joined the room', room };
}

/**
 * Ajoute un message à une room.
 * @param {string} roomName Nom de la room.
 * @param {string} username Nom de l'utilisateur envoyant le message.
 * @param {string} message Contenu du message.
 */

export async function addMessageToRoom(roomName, username, message) {
  const roomsCollection = getRoomsCollection();
  const room = await roomsCollection.findOne({ name: roomName });

  if (!room) {
    return { success: false, message: "Room not found" };
  }

  const isUserInRoom = room.users.some(user => user.username === username);
  if (!isUserInRoom) {
    return { success: false, message: "User not in room" };
  }

  await roomsCollection.updateOne(
    { name: roomName },
    {
      $push: {
        messages: {
          username,
          content: message,
          timestamp: new Date(),
        },
      },
    }
  );

  return { success: true, message: "Message added to room" };
}

/**
 * Récupère la liste des utilisateurs d'une room.
 * @param {string} roomName Nom de la room.
 * @returns {Promise<Array>} Liste des utilisateurs.
 */
export async function getRoomUsers(roomName) {
  const roomsCollection = getRoomsCollection();
  const room = await roomsCollection.findOne({ name: roomName });

  if (!room) {
      return [];
  }

  return room.users || [];
}

/**
 * Met à jour le username dans tous les messages des rooms.
 * @param {string} oldUsername - L'ancien pseudo.
 * @param {string} newUsername - Le nouveau pseudo.
 */
export async function updateUsernameInMessages(oldUsername, newUsername) {
  const roomsCollection = getRoomsCollection();

  try {
      // 🔥 Met à jour tous les messages dans toutes les rooms
      const result = await roomsCollection.updateMany(
          { "messages.username": oldUsername }, // Trouve les messages avec l'ancien pseudo
          { $set: { "messages.$[elem].username": newUsername } }, // Met à jour le pseudo
          { arrayFilters: [{ "elem.username": oldUsername }] } // Filtre pour modifier uniquement les bons messages
      );

      console.log(`Updated ${result.modifiedCount} messages from ${oldUsername} to ${newUsername}`);
  } catch (error) {
      console.error("Error updating messages:", error);
  }
}

/**
 * Met à jour le username dans toutes les rooms
 * @param {string} oldUsername - L'ancien username.
 * @param {string} newUsername - Le nouveau username.
 */
export async function updateUsernameInRooms(oldUsername, newUsername) {
  const roomsCollection = getRoomsCollection();

  // Met à jour toutes les rooms où l'utilisateur est présent
  await roomsCollection.updateMany(
      { "users.username": oldUsername },
      { $set: { "users.$.username": newUsername } }
  );

  console.log(`Updated username in all rooms: ${oldUsername} -> ${newUsername}`);
}
/**
 * Récupère les messages d'une room.
 * @param {string} roomName Nom de la room.
 * @returns {Array} Liste des messages.
 */
// Modify getRoomMessages to include proper sorting
export async function getRoomMessages(roomName) {
  const roomsCollection = getRoomsCollection();
  const room = await roomsCollection.findOne({ name: roomName });

  if (!room) {
    return { success: false, message: "Room not found", messages: [] };
  }

  // Trie les messages avant de les envoyer
  const sortedMessages = (room.messages || []).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return { success: true, messages: sortedMessages };
}


export async function getAvailableRooms() {
  const roomsCollection = getRoomsCollection();
  const rooms = await roomsCollection.find().toArray(); // Récupère toutes les rooms
  return rooms.map(({ name, creator, createdAt }) => ({ name, creator, createdAt })); // Renvoie uniquement les champs nécessaires
}