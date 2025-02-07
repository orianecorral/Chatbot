import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeDatabase} from "./database.js";
import { handleSocketConnection } from "./socketHandler.js";


const app = express();
app.use(express.json());
const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {},
});
const __dirname = dirname(fileURLToPath(import.meta.url));

app.get("*", (req, res) => {
  console.log("Received request for /");
  res.sendFile(join(__dirname, "index.html"));
});

async function startServer() {
  try {
    await initializeDatabase();
    console.log("Database initialized");
    handleSocketConnection(io);
    console.log("Socket connection handler initialized");
    server.listen(5000, () => {
      console.log("Server running at http://localhost:5000");
    });
  } catch (error) {
    console.error("Error starting server:", error);
  }
}

startServer();