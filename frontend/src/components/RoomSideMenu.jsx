import React from "react";
import { FaTimes, FaDoorOpen } from "react-icons/fa";

const RoomSideMenu = ({ room, usersInRoom, onClose, onLeaveRoom }) => {
  // Génération d'une image aléatoire pour la room
  const roomAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${room}`;

  return (
    <div className="fixed top-0 right-0 h-full w-64 bg-white shadow-lg p-5 flex flex-col">
      {/* 🔹 Header du Side Menu */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-primary">Room Info</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-red-500">
          <FaTimes size={20} />
        </button>
      </div>

      {/* 🔹 Image de la Room */}
      <div className="flex flex-col items-center">
        <img
          src={roomAvatar}
          alt={`Avatar de ${room}`}
          className="w-24 h-24 rounded-full shadow-md mb-3"
        />
        <h3 className="text-lg font-semibold text-gray-700">{room}</h3>
      </div>

      {/* 🔹 Liste des Utilisateurs */}
      <div className="mt-5 flex-1 overflow-y-auto">
        <h3 className="text-md font-semibold text-secondary mb-2">Users in Room</h3>
        <ul className="space-y-2">
          {usersInRoom.length > 0 ? (
            usersInRoom.map((user, index) => (
              <li key={index} className="p-2 bg-gray-100 rounded-lg shadow-sm">
                {user.username}
              </li>
            ))
          ) : (
            <p className="text-gray-500 text-sm">No users in this room.</p>
          )}
        </ul>
      </div>

      {/* 🔹 Bouton Quitter la Room */}
      <button
        onClick={onLeaveRoom}
        className="mt-5 bg-red-500 text-white p-3 rounded-lg flex items-center justify-center hover:bg-red-600 transition"
      >
        <FaDoorOpen className="mr-2" /> Quit Room
      </button>
    </div>
  );
};

export default RoomSideMenu;
