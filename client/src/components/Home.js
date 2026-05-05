
import React, { useState } from "react";
import { v4 as uuid } from "uuid";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { auth, provider } from "../firebase";
import { signInWithPopup } from "firebase/auth";

function Home() {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [email, setEmail] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const navigate = useNavigate();

  const generateRoomId = (e) => {
    e.preventDefault();
    const Id = uuid();
    setRoomId(Id);
    toast.success("Room Id is generated");
  };

  const joinRoom = () => {
    if (!roomId || !username) {
      toast.error("Both fields are required");
      return;
    }
    navigate(`/editor/${roomId}`, {
      state: { username, photoURL, email },
    });
    toast.success("Room joined successfully");
  };

  const handleInputEnter = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      joinRoom();
    }
  };

  const googleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      setUsername(user.displayName || "");
      setPhotoURL(user.photoURL || "");
      setEmail(user.email || "");
      setIsLoggedIn(true);
      toast.success("Logged in with Google");
    } catch (error) {
      console.error("Google login failed:", error);
      toast.error("Google login failed");
    }
  };

  const closeModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowModal(false);
      setIsClosing(false);
    }, 500); // Match animation duration
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&display=swap');

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        html, body, #root {
          height: 100%;
          font-family: 'Orbitron', sans-serif;
          background: url('/images/backgroundLogin.gif') no-repeat center center fixed;
          background-size: cover;
          color: white;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          overflow-x: hidden;
          text-align: center;
        }

        .text-section {
          max-width: 90vw;
          margin-bottom: 2rem;
        }

        .welcome-text {
          font-size: clamp(3rem, 7vw, 6rem);
          font-weight: 900;
          color: white;
          text-shadow: 0 0 20px rgba(255,255,255,0.6);
          margin-bottom: 1rem;
        }

        .typing-text {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0.8rem;
          font-weight: 700;
          font-size: clamp(1.2rem, 3.5vw, 2.5rem);
          color: rgba(255,255,255,0.85);
          text-shadow: 0 0 15px rgba(255,255,255,0.4);
        }

        .google-login-btn {
          background-color: white;
          color: #000 !important;
          font-size: clamp(0.9rem, 2.5vw, 1.1rem);
          font-weight: 600;
          padding: 0.7rem 2.5rem;
          border: none;
          border-radius: 25px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 6px 15px rgba(0,0,0,0.2);
          font-family: 'Orbitron', sans-serif;
          width: auto;
          max-width: 380px;
          min-width: 200px;
          margin-bottom: 1rem;
          text-transform: none;
        }

        .google-login-btn img {
          width: 24px;
          height: 24px;
        }

        .google-login-btn:hover {
          transform: scale(1.05);
          background-color: #f5f5f5;
          box-shadow: 0 8px 18px rgba(0,0,0,0.25);
        }

        @media (min-width: 1200px) {
          .google-login-btn {
            max-width: 260px;
            padding: 0.7rem 2rem;
          }
          .welcome-text {
            font-size: clamp(4rem, 8vw, 7rem);
          }
          .typing-text {
            font-size: clamp(1.3rem, 4vw, 2.8rem);
          }
        }

        @media (max-width: 480px) {
          .google-login-btn {
            padding: 0.6rem 1.5rem;
            font-size: 0.95rem;
            max-width: 90%;
            min-width: 180px;
          }
          .google-login-btn img {
            width: 20px;
            height: 20px;
          }
          .welcome-text {
            font-size: clamp(2.5rem, 6vw, 4rem);
          }
          .typing-text {
            font-size: clamp(1rem, 3vw, 1.8rem);
          }
        }

        input.form-control {
          background: rgba(255,255,255,0.1);
          border: none;
          border-radius: 25px;
          padding: 0.9rem 1.5rem;
          font-size: 1rem;
          color: white;
          margin-bottom: 1rem;
          width: 100%;
          max-width: 280px;
          font-family: 'Orbitron', sans-serif;
          outline: none;
          box-shadow: 0 0 10px rgba(255,255,255,0.3);
          transition: background-color 0.3s ease;
        }

        input.form-control::placeholder {
          color: rgba(255,255,255,0.7);
        }

        input.form-control:focus {
          background: rgba(255,255,255,0.25);
          box-shadow: 0 0 15px rgba(255,255,255,0.7);
        }

        button.btn-success {
          background-color: #28a745;
          border: none;
          border-radius: 30px;
          padding: 0.9rem 2.4rem;
          font-size: 1.1rem;
          font-weight: 600;
          color: white;
          cursor: pointer;
          width: 100%;
          max-width: 280px;
          font-family: 'Orbitron', sans-serif;
          box-shadow: 0 8px 18px rgba(0,0,0,0.25);
          transition: background-color 0.3s ease, transform 0.3s ease;
        }

        button.btn-success:hover {
          background-color: #218838;
          transform: scale(1.05);
        }

        p.mt-3 {
          margin-top: 1rem;
          color: rgba(255,255,255,0.8);
          font-family: 'Orbitron', sans-serif;
          cursor: default;
        }

        span.text-warning {
          color: #ffc107;
          cursor: pointer;
          user-select: none;
          transition: color 0.3s ease;
        }

        span.text-warning:hover {
          color: #ffdb58;
        }

        .learn-more {
          margin-top: 2rem;
          font-weight: 600;
          font-size: 1.2rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: rgba(255,255,255,1);
          text-shadow: 0 0 8px rgba(255,255,255,0.5);
          transition: color 0.3s ease-out;
        }

        .learn-more:hover {
          color: rgba(255,255,255,0.9);
        }

        .learn-more span {
          font-size: 1.5rem;
          display: inline-block;
          transition: transform 0.3s ease-out;
        }

        .learn-more:hover span {
          transform: scaleX(1.5) translateX(5px);
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          width: 100vw;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(10px);
          z-index: 1000;
          display: flex;
          justify-content: center;
          align-items: center;
          animation: fadeIn 0.5s ease-in-out;
        }

        .modal-content {
          background: rgba(255,255,255,0.05);
          border-radius: 20px;
          padding: 2rem;
          max-width: 700px;
          width: 90%;
          position: relative;
          color: #fff;
          text-align: left;
          box-shadow: 0 0 20px rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.2);
          font-family: 'Orbitron', sans-serif;
          animation: scaleIn 0.5s ease-in-out;
        }

        .modal-overlay.closing {
          animation: fadeOut 0.5s ease-in-out forwards;
        }

        .modal-content.closing {
          animation: scaleOut 0.5s ease-in-out forwards;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleIn {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        @keyframes scaleOut {
          from { transform: scale(1); opacity: 1; }
          to { transform: scale(0.8); opacity: 0; }
        }

        .modal-close {
          position: absolute;
          top: 15px;
          right: 20px;
          font-size: 1.5rem;
          cursor: pointer;
          color: #ff6666;
        }
      `}</style>

      <div className="text-section">
        <h1 className="welcome-text">WELCOME TO</h1>
        <div className="typing-text">
          <span>CODING</span>
          <span>COLLABORATOR</span>
        </div>
      </div>

      {!isLoggedIn && (
        <button
          onClick={googleLogin}
          className="google-login-btn"
          aria-label="Sign in with Google"
          type="button"
        >
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt="Google Icon"
            aria-hidden="true"
          />
          Sign in with Google
        </button>
      )}

      {isLoggedIn && (
        <>
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="form-control"
            placeholder="Room ID"
            onKeyDown={handleInputEnter}
            aria-label="Room ID"
            autoFocus
          />
          <input
            type="text"
            value={username}
            readOnly
            className="form-control"
            placeholder="Username"
            aria-label="Username"
          />
          <button
            onClick={joinRoom}
            className="btn btn-success"
            type="button"
            aria-label="Join Room"
          >
            Join
          </button>
          <p className="mt-3">
            Don’t have a Room ID?{" "}
            <span
              onClick={generateRoomId}
              className="text-warning"
              role="button"
              tabIndex={0}
              onKeyPress={(e) => {
                if (e.key === "Enter" || e.key === " ") generateRoomId(e);
              }}
              aria-label="Generate Room ID"
            >
              Create Room
            </span>
          </p>
        </>
      )}

      <div
        className="learn-more"
        onClick={() => setShowModal(true)}
        role="button"
        tabIndex={0}
        onKeyPress={(e) => {
          if (e.key === "Enter" || e.key === " ") setShowModal(true);
        }}
        aria-label="Learn More"
      >
        Application Features <span>➔</span>
      </div>

      {showModal && (
        <div className={`modal-overlay${isClosing ? " closing" : ""}`}>
          <div className={`modal-content${isClosing ? " closing" : ""}`}>
            <div
              className="modal-close"
              onClick={closeModal}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => {
                if (e.key === "Enter" || e.key === " ") closeModal();
              }}
              aria-label="Close Modal"
            >
              ✖
            </div>
            <h2 style={{ marginBottom: "1rem" }}>🚀 Features</h2>
            <ul style={{ lineHeight: "1.7" }}>
               <li>🧑‍🤝‍🧑 Collaborate on code in real-time with your group</li>
               <li>💡 Real-time Gemini AI code suggestions to help you write faster</li>
               <li>⚙️ Compile your code and see the output instantly</li>
               <li>💾 Save your code snippets for future use</li>
               <li>🔐 Secure Google Login Authentication</li>
               <li>🖥️ Syntax-highlighted editor with Dracula theme</li>
               <li>⚡ Instant Room ID generation and sharing</li>
               <li>📈 Built-in support for future extensions (compiler, versions)</li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

export default Home;