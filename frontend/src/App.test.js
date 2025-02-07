import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "./App";
import { io } from "socket.io-client";

jest.mock("socket.io-client", () => {
  return {
    io: jest.fn(() => ({
      on: jest.fn(),
      emit: jest.fn(),
      off: jest.fn(),
      connect: jest.fn(),
      auth: {},
    })),
  };
});

describe("App Component", () => {
  test("affiche le modal UsernameModal au chargement", () => {
    render(<App />);
    expect(screen.getByText(/Enter your username/i)).toBeInTheDocument();
  });

  test("ferme UsernameModal et ouvre RoomModal après saisie du nom d'utilisateur", async () => {
    render(<App />);
    
    const input = screen.getByPlaceholderText("Your Username");
    fireEvent.change(input, { target: { value: "TestUser" } });
    fireEvent.click(screen.getByText(/Submit/i));

    await waitFor(() => {
      expect(screen.getByText(/Choose or Create a Room/i)).toBeInTheDocument();
    });
  });

  test("affiche l'interface de chat après entrée dans une room", async () => {
    render(<App />);
    
    fireEvent.change(screen.getByPlaceholderText("Your Username"), {
      target: { value: "TestUser" },
    });
    fireEvent.click(screen.getByText(/Submit/i));

    await waitFor(() => {
      fireEvent.change(screen.getByPlaceholderText("Room Name"), {
        target: { value: "TestRoom" },
      });
      fireEvent.click(screen.getByText(/Join Room/i));
    });

    await waitFor(() => {
      expect(screen.getByText(/Send Message/i)).toBeInTheDocument();
    });
  });

  test("vérifie que le socket est bien initialisé et connecté", () => {
    const mockSocket = io();
    expect(mockSocket.connect).toHaveBeenCalled();
  });

  test("envoi de message via socket", async () => {
    const mockSocket = io();
    render(<App />);
    
    fireEvent.change(screen.getByPlaceholderText("Your Username"), {
      target: { value: "TestUser" },
    });
    fireEvent.click(screen.getByText(/Submit/i));

    await waitFor(() => {
      fireEvent.change(screen.getByPlaceholderText("Room Name"), {
        target: { value: "TestRoom" },
      });
      fireEvent.click(screen.getByText(/Join Room/i));
    });

    await waitFor(() => {
      fireEvent.change(screen.getByPlaceholderText("Type your message"), {
        target: { value: "Hello World!" },
      });
      fireEvent.click(screen.getByText(/Send Message/i));
    });

    expect(mockSocket.emit).toHaveBeenCalledWith("room message", expect.objectContaining({
      room: "TestRoom",
      message: "Hello World!",
    }));
  });

  test("réception de message depuis le serveur via socket", async () => {
    const mockSocket = io();
    mockSocket.on.mockImplementation((event, callback) => {
      if (event === "room message") {
        callback({ username: "ServerUser", content: "Welcome!" });
      }
    });
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText("Welcome!")).toBeInTheDocument();
    });
  });
});
