import { getMessagesCollection } from "./database.js";

/**
 * Ajoute un message pour un utilisateur dans la base de données.
 * @param {string} userId - L'ID de l'utilisateur.
 * @param {string} message - Le message de l'utilisateur.
 * @returns {Promise<void>} - Promesse résolue après l'ajout du message.
 */
export async function addUserMessage(userId, message) {
  if (!userId || !message) {
    throw new Error("userId et message sont requis.");
  }

  const messagesCollection = getMessagesCollection();

  const messageData = {
    user_id: userId,
    message: message,
    createdAt: new Date(), // Enregistre l'heure actuelle
  };

  try {
    await messagesCollection.insertOne(messageData);
    console.log(`Message ajouté pour l'utilisateur ${userId}`);
  } catch (error) {
    console.error("Erreur lors de l'ajout du message :", error);
    throw new Error("Impossible d'ajouter le message.");
  }
}

/**
 * Récupère tous les messages pour un utilisateur spécifique.
 * @param {string} userId - L'ID de l'utilisateur.
 * @returns {Promise<Array>} - Une liste des messages de l'utilisateur.
 */
export async function getUserMessages(userId) {
  if (!userId) {
    throw new Error("userId est requis.");
  }

  const messagesCollection = getMessagesCollection();

  try {
    const messages = await messagesCollection
      .find({ user_id: userId })
      .sort({ createdAt: 1 }) // Trie par date de création (ascendant)
      .toArray();

    return messages;
  } catch (error) {
    console.error("Erreur lors de la récupération des messages :", error);
    throw new Error("Impossible de récupérer les messages.");
  }
}
