import React from "react";
import { FaDoorOpen } from "react-icons/fa"; // Icône pour le bouton

const SideMenu = ({ show, rooms, onClose, onJoinRoom }) => {
  if (!show) return null; // Ne rend rien si show est false

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-end z-50">
      <div className="bg-white w-72 p-6 shadow-2xl rounded-l-lg transform transition-transform duration-300 ease-in-out">
        {/* 🔥 Header du menu avec bouton stylisé */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-primary">Available Rooms</h2>
          <button
            onClick={onClose}
            className="btn btn-sm btn-circle btn-outline text-red-500 hover:bg-red-500 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* 🔥 Liste des Rooms */}
        <ul className="overflow-y-auto max-h-[70vh] space-y-3">
          {rooms.length > 0 ? (
            rooms.map((room, index) => (
              <li
                key={index}
                className="card bg-gray-100 p-4 rounded-lg shadow-md hover:bg-primary hover:text-white cursor-pointer transition"
                onClick={() => {
                  onJoinRoom(room.name); // Utilise le nom de la room directement
                  onClose(); // Ferme le menu après sélection
                }}
              >
                <div className="font-bold">{room.name}</div>
                <div className="text-xs opacity-70">
                  {room.users?.length || 0} users
                </div>
              </li>
            ))
          ) : (
            <li className="text-gray-500 text-center">No rooms available.</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default SideMenu;
