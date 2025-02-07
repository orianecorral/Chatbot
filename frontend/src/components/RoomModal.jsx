import React, { useState } from "react";

const RoomModal = ({ onSubmit }) => {
  const [roomInput, setRoomInput] = useState("");

  const handleSubmit = () => {
    if (roomInput.trim()) {
      onSubmit(roomInput);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-md flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-96">
        <h2 className="text-2xl font-bold text-primary mb-4 text-center">Choose or Create a Room</h2>
        <input
          type="text"
          value={roomInput}
          onChange={(e) => setRoomInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()} // 🔥 Gère l'Enter
          placeholder="Room Name"
          className="input input-bordered w-full text-lg p-3 mb-4"
        />
        <button
          onClick={handleSubmit}
          className="btn btn-primary w-full text-lg"
        >
          Join Room
        </button>
      </div>
    </div>
  );
};

export default RoomModal;
