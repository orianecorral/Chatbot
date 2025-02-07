import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

let messagesCollection;
let roomsCollection;
let privateMessagesCollection; 



export async function initializeDatabase() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    const db = client.db("Chatapp");
    messagesCollection = db.collection("messages");
    roomsCollection = db.collection("rooms")
    privateMessagesCollection = db.collection("private_messages");
    await messagesCollection.createIndex({ _id: 1 });
    await roomsCollection.createIndex({ name: 1 }, { unique: true });
    await privateMessagesCollection.createIndex({ to: 1 });
    console.log("MongoDB URI:", process.env.MONGO_URI ? "Loaded" : "Not found");


  } catch (err) {
    console.error("Failed to connect to MongoBD", err);
    process.exit(1);
  }
}

export function getUsersCollection() {
  if (!usersCollection) {
    throw new Error("Users collection not initialized. Call initializeDatabase first.");
  }
  return usersCollection;
}

export function getMessagesCollection() {
  if (!messagesCollection) {
    throw new Error("Database not initialized. Call initializeDatabase first.");
  }
  return messagesCollection;
}

export function getRoomsCollection() {
  if (!roomsCollection) {
    throw new Error("Rooms collection not initialized. Call initializeDatabase first.");
  }
  return roomsCollection;
}

export function getPrivateMessagesCollection() {
  if (!privateMessagesCollection) {
    throw new Error("Private messages collection not initialized. Call initializeDatabase first.");
  }
  return privateMessagesCollection;
}

export async function saveMsg(db, message) {
  // Validation de base
  if (!message || typeof message !== 'string') {
      throw new Error('Invalid message format. Expected a non-empty string.');
  }
  try {
      // Accès à la collection des messages
      const messagesCollection = db.collection('msg');
      // Insertion du message
      const result = await messagesCollection.insertOne({ message, username, createdAt: new Date() });
      // Retour de l'identifiant du message inséré
      return result.insertedId;
  } catch (error) {
      console.error('Failed to save message:', error);
      throw new Error('Could not save the message.');
  }  
}

export async function saveRoom(roomName, createdBy) {
  if (!roomName || typeof roomName !== 'string') {
    throw new Error('Invalid room name. Expected a non-empty string.');
  }

  try {
    const roomData = {
      name: roomName.trim().toLowerCase(), // Normalisation du nom
      createdBy,
      createdAt: new Date(),
    };

    // Vérifiez si la room existe déjà
    const existingRoom = await roomsCollection.findOne({ name: roomData.name });
    if (existingRoom) {
      console.log('Room already exists:', existingRoom);
      throw new Error('Room already exists.');
    }

    // Insérez la nouvelle room
    const result = await roomsCollection.insertOne(roomData);

    console.log(`Room created: ${roomData.name}`);
    return result.insertedId; // Retourne l'ID de la room insérée
  } catch (error) {
    console.error('Failed to save room:', error.message);
    throw error;
  }
}
