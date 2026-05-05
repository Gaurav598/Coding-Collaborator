
// import React, { useEffect, useRef, useState, useCallback } from "react";
// import Client from "./Client";
// import Editor from "./Editor";
// import { initSocket } from "../Socket";
// import { ACTIONS } from "../Actions";
// import { useNavigate, useLocation, Navigate, useParams } from "react-router-dom";
// import { toast } from "react-hot-toast";
// import axios from "axios";
// import { getAuth } from "firebase/auth";
// import { memo } from "react";

// const MemoizedEditor = memo(Editor);

// function EditorPage() {
//   const [clients, setClients] = useState([]);
//   const [output, setOutput] = useState("");
//   const [input, setInput] = useState("");
//   const [isRunning, setIsRunning] = useState(false);
//   const [selectedLanguage, setSelectedLanguage] = useState("javascript");
//   const [codeName, setCodeName] = useState("");
//   const [showSaveModal, setShowSaveModal] = useState(false);
//   const [showSavedCodesModal, setShowSavedCodesModal] = useState(false);
//   const [showSaveOnlyModal, setShowSaveOnlyModal] = useState(false);
//   const [savedCodes, setSavedCodes] = useState([]);
//   const [isClosingSaveModal, setIsClosingSaveModal] = useState(false);
//   const [isClosingSavedCodesModal, setIsClosingSavedCodesModal] = useState(false);
//   const [isClosingSaveOnlyModal, setIsClosingSaveOnlyModal] = useState(false);
//   const codeRef = useRef("");
//   const socketRef = useRef(null);
//   const [socketInitialized, setSocketInitialized] = useState(false);
//   const [userEmail, setUserEmail] = useState("");
//   const location = useLocation();
//   const navigate = useNavigate();
//   const { roomId } = useParams();

//   const languages = [
//     { name: "JavaScript", value: "javascript", judge0Id: 63, mode: "javascript" },
//     { name: "Python", value: "python", judge0Id: 71, mode: "python" },
//     { name: "Java", value: "java", judge0Id: 62, mode: "java" },
//     { name: "C++", value: "cpp", judge0Id: 54, mode: "cpp" },
//     { name: "C", value: "c", judge0Id: 50, mode: "c" },
//   ];

//   const debounce = (func, wait) => {
//     let timeout;
//     return (...args) => {
//       clearTimeout(timeout);
//       timeout = setTimeout(() => func(...args), wait);
//     };
//   };

//   const debouncedSetClients = useCallback(debounce(setClients, 100), []);

//   useEffect(() => {
//     const auth = getAuth();
//     const user = auth.currentUser;
//     if (user) {
//       setUserEmail(user.email);
//     } else if (location.state?.email) {
//       setUserEmail(location.state.email);
//     } else {
//       toast.error("Please log in to access the editor");
//       navigate("/");
//     }
//   }, [navigate, location.state]);

//   useEffect(() => {
//     if (!userEmail) return;

//     const handleErrors = (err) => {
//       console.error("Socket error:", err);
//       toast.error("Socket connection failed, try again later");
//       navigate("/");
//     };

//     const init = async () => {
//       try {
//         socketRef.current = await initSocket();
//         socketRef.current.on("connect", () => {
//           setSocketInitialized(true);
//         });

//         socketRef.current.on("connect_error", handleErrors);
//         socketRef.current.on("connect_failed", handleErrors);

//         const joinData = {
//           roomId,
//           username: location.state?.username || "Anonymous",
//           photoURL: location.state?.photoURL || "",
//           email: userEmail,
//         };

//         socketRef.current.emit(ACTIONS.JOIN, joinData);

//         socketRef.current.on(ACTIONS.JOINED, ({ clients, username, socketId }) => {
//           if (username !== location.state?.username) {
//             toast.success(`${username} joined the room.`);
//           }
//           debouncedSetClients(clients);
//           if (codeRef.current) {
//             socketRef.current.emit(ACTIONS.SYNC_CODE, {
//               code: codeRef.current,
//               socketId,
//             });
//           }
//         });

//         socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code }) => {
//           codeRef.current = code;
//         });

//         socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
//           toast.success(`${username} left the room.`);
//           setClients((prev) => prev.filter((client) => client.socketId !== socketId));
//         });
//       } catch (error) {
//         handleErrors(error);
//       }
//     };

//     init();

//     return () => {
//       if (socketRef.current) {
//         socketRef.current.off("connect");
//         socketRef.current.off("connect_error");
//         socketRef.current.off("connect_failed");
//         socketRef.current.off(ACTIONS.JOINED);
//         socketRef.current.off(ACTIONS.CODE_CHANGE);
//         socketRef.current.off(ACTIONS.DISCONNECTED);
//         socketRef.current.disconnect();
//         socketRef.current = null;
//       }
//     };
//   }, [roomId, userEmail, navigate, debouncedSetClients, location.state]);

//   const runCode = async () => {
//     if (!codeRef.current) {
//       toast.error("No code to execute");
//       return;
//     }

//     setIsRunning(true);
//     setOutput("Running...");

//     try {
//       const language = languages.find((lang) => lang.value === selectedLanguage);
//       const requestPayload = {
//         source_code: btoa(codeRef.current),
//         language_id: language.judge0Id,
//         stdin: btoa(input),
//       };

//       const response = await axios.post(
//         `${process.env.REACT_APP_JUDGE0_HOST}/submissions?base64_encoded=true&wait=true`,
//         requestPayload,
//         {
//           headers: {
//             "x-rapidapi-key": process.env.REACT_APP_JUDGE0_API_KEY,
//             "x-rapidapi-host": "judge0-ce.p.rapidapi.com",
//             "content-type": "application/json",
//           },
//         }
//       );

//       const { stdout, stderr, compile_output, message, status } = response.data;
//       if (status.id === 3) {
//         setOutput(stdout ? atob(stdout) : "No output");
//       } else {
//         setOutput(
//           (stderr ? atob(stderr) : "") ||
//           (compile_output ? atob(compile_output) : "") ||
//           (message ? atob(message) : "") ||
//           "Unknown error"
//         );
//       }
//     } catch (error) {
//       setOutput(`Error: ${error.message || "Failed to execute code"}`);
//       toast.error(`Failed to execute code: ${error.message || "Unknown error"}`);
//     } finally {
//       setIsRunning(false);
//     }
//   };

//   const saveCode = async () => {
//     if (!userEmail) {
//       toast.error("Please log in to save code");
//       return;
//     }
//     if (!codeName || !codeRef.current) {
//       toast.error("Code name and code content are required");
//       return;
//     }
//     const payload = {
//       userEmail,
//       codeName,
//       code: codeRef.current,
//       language: selectedLanguage,
//     };
//     try {
//       await axios.post("http://localhost:5000/api/save-code", payload);
//       toast.success("Code saved successfully");
//       setCodeName("");
//       setIsClosingSaveModal(true);
//       setTimeout(() => {
//         setShowSaveModal(false);
//         setIsClosingSaveModal(false);
//         navigate("/");
//       }, 500);
//     } catch (error) {
//       toast.error(`Failed to save code: ${error.response?.data?.error || error.message}`);
//     }
//   };

//   const saveCodeWithoutLeaving = async () => {
//     if (!userEmail) {
//       toast.error("Please log in to save code");
//       return;
//     }
//     if (!codeName || !codeRef.current) {
//       toast.error("Code name and code content are required");
//       return;
//     }
//     const payload = {
//       userEmail,
//       codeName,
//       code: codeRef.current,
//       language: selectedLanguage,
//     };
//     try {
//       await axios.post("http://localhost:5000/api/save-code", payload);
//       toast.success("Code saved successfully");
//       setCodeName("");
//       setIsClosingSaveModal(true);
//       setTimeout(() => {
//         setShowSaveModal(false);
//         setIsClosingSaveModal(false);
//       }, 500);
//     } catch (error) {
//       toast.error(`Failed to save code: ${error.response?.data?.error || error.message}`);
//     }
//   };

//   const saveCodeOnly = async () => {
//     if (!userEmail) {
//       toast.error("Please log in to save code");
//       return;
//     }
//     if (!codeName || !codeRef.current) {
//       toast.error("Code name and code content are required");
//       return;
//     }
//     const payload = {
//       userEmail,
//       codeName,
//       code: codeRef.current,
//       language: selectedLanguage,
//     };
//     try {
//       await axios.post("http://localhost:5000/api/save-code", payload);
//       toast.success("Code saved successfully");
//       setCodeName("");
//       setIsClosingSaveOnlyModal(true);
//       setTimeout(() => {
//         setShowSaveOnlyModal(false);
//         setIsClosingSaveOnlyModal(false);
//       }, 500);
//     } catch (error) {
//       toast.error(`Failed to save code: ${error.response?.data?.error || error.message}`);
//     }
//   };

//   const fetchSavedCodes = async () => {
//     if (!userEmail) {
//       toast.error("Please log in to fetch codes");
//       return;
//     }
//     try {
//       const response = await axios.get(`http://localhost:5000/api/saved-codes/${userEmail}`);
//       setSavedCodes(response.data);
//     } catch (error) {
//       toast.error(`Failed to fetch saved codes: ${error.response?.data?.error || error.message}`);
//     }
//   };

//   const handleOpenCode = (savedCode) => {
//     if (socketRef.current && socketRef.current.connected) {
//       codeRef.current = savedCode.code;
//       setSelectedLanguage(savedCode.language);
//       socketRef.current.emit(ACTIONS.CODE_CHANGE, {
//         roomId,
//         code: savedCode.code,
//       });
//       setIsClosingSavedCodesModal(true);
//       setTimeout(() => {
//         setShowSavedCodesModal(false);
//         setIsClosingSavedCodesModal(false);
//       }, 500);
//       toast.success(`Loaded code: ${savedCode.codeName}`);
//     } else {
//       toast.error("Socket not connected");
//     }
//   };

//   const handleDeleteCode = async (codeId) => {
//     try {
//       await axios.delete(`http://localhost:5000/api/delete-code/${codeId}`);
//       toast.success("Code deleted successfully");
//       fetchSavedCodes();
//     } catch (error) {
//       toast.error(`Failed to delete code: ${error.response?.data?.error || error.message}`);
//     }
//   };

//   const copyRoomId = async () => {
//     try {
//       await navigator.clipboard.writeText(roomId);
//       toast.success("Room ID copied to clipboard");
//     } catch {
//       toast.error("Failed to copy Room ID");
//     }
//   };

//   const handleLeaveRoom = () => {
//     setShowSaveModal(true);
//   };

//   const handleSaveAndLeave = () => {
//     saveCode();
//   };

//   const closeSaveModal = () => {
//     setIsClosingSaveModal(true);
//     setTimeout(() => {
//       setShowSaveModal(false);
//       setIsClosingSaveModal(false);
//     }, 500);
//   };

//   const closeSavedCodesModal = () => {
//     setIsClosingSavedCodesModal(true);
//     setTimeout(() => {
//       setShowSavedCodesModal(false);
//       setIsClosingSavedCodesModal(false);
//     }, 500);
//   };

//   if (!location.state) {
//     return <Navigate to="/" />;
//   }

//   return (
//     <div className="vampire-theme-container">
//       <nav className="vampire-navbar">
//         <div className="navbar-left">
//           <span className="navbar-title">Code & Colab</span>
//         </div>
//         <div className="navbar-right">
//           <select
//             value={selectedLanguage}
//             onChange={(e) => setSelectedLanguage(e.target.value)}
//             className="language-selector"
//             aria-label="Select Programming Language"
//           >
//             {languages.map((lang) => (
//               <option key={lang.value} value={lang.value}>
//                 {lang.name}
//               </option>
//             ))}
//           </select>
//           <button
//             className="btn btn-run"
//             onClick={runCode}
//             disabled={isRunning}
//             aria-label="Run Code"
//           >
//             {isRunning ? "Running..." : "Run"}
//           </button>
//           <button
//             className="btn btn-save"
//             onClick={() => setShowSaveOnlyModal(true)}
//           >
//             Save Code
//           </button>
//           <button className="btn btn-copy" onClick={copyRoomId}>
//             Copy Room ID
//           </button>
//           <span className="room-id">
//             Room: <code>{roomId}</code>
//           </span>
//           <button
//             className="btn btn-saved-codes"
//             onClick={() => {
//               fetchSavedCodes();
//               setShowSavedCodesModal(true);
//             }}
//           >
//             Saved Codes
//           </button>
//           <button className="btn btn-leave" onClick={handleLeaveRoom}>
//             Leave Room
//           </button>
//         </div>
//       </nav>

//       <div className="vampire-main">
//         <aside className="vampire-sidebar">
//           <div className="sidebar-header">
//             <h4>Active Users ({clients.length})</h4>
//           </div>
//           <ul className="client-list">
//             {clients.map((client) => (
//               <li key={client.socketId} className="client-item">
//                 <Client
//                   username={client.username}
//                   photoURL={client.photoURL}
//                   email={client.email}
//                 />
//               </li>
//             ))}
//           </ul>
//         </aside>

//         <main className="vampire-editor">
//           <div className="editor-container">
//             {socketInitialized && (
//               <MemoizedEditor
//                 socketRef={socketRef}
//                 roomId={roomId}
//                 selectedLanguage={selectedLanguage}
//                 codeRef={codeRef}
//                 onCodeChange={(code) => {
//                   codeRef.current = code;
//                 }}
//               />
//             )}
//           </div>
//           <div className="io-panel">
//             <div className="input-panel">
//               <h5>Input</h5>
//               <textarea
//                 value={input}
//                 onChange={(e) => setInput(e.target.value)}
//                 placeholder="Enter input here"
//                 aria-label="Input for the program"
//               />
//             </div>
//             <div className="output-panel">
//               <h5>Output</h5>
//               <pre>{output || "Execute the code to view the output."}</pre>
//             </div>
//           </div>
//         </main>
//       </div>

//       {showSaveModal && (
//         <div className={`modal-overlay${isClosingSaveModal ? " closing" : ""}`}>
//           <div className={`modal-content${isClosingSaveModal ? " closing" : ""}`}>
//             <div
//               className="modal-close"
//               onClick={closeSaveModal}
//               role="button"
//               tabIndex={0}
//               onKeyPress={(e) => {
//                 if (e.key === "Enter" || e.key === " ") closeSaveModal();
//               }}
//               aria-label="Close Modal"
//             >
//               ✖
//             </div>
//             <h3>Save Code</h3>
//             <input
//               type="text"
//               value={codeName}
//               onChange={(e) => setCodeName(e.target.value)}
//               placeholder="Enter code name"
//               aria-label="Code name"
//             />
//             <div className="modal-buttons">
//               <button className="modal-btn save-btn" onClick={handleSaveAndLeave}>Save and Leave</button>
//               <button className="modal-btn save-btn" onClick={saveCodeWithoutLeaving}>Save</button>
//               <button className="modal-btn cancel-btn" onClick={() => navigate("/")}>Leave without Saving</button>
//             </div>
//           </div>
//         </div>
//       )}

//       {showSavedCodesModal && (
//         <div className={`modal-overlay${isClosingSavedCodesModal ? " closing" : ""}`}>
//           <div className={`modal-content${isClosingSavedCodesModal ? " closing" : ""}`}>
//             <div
//               className="modal-close"
//               onClick={closeSavedCodesModal}
//               role="button"
//               tabIndex={0}
//               onKeyPress={(e) => {
//                 if (e.key === "Enter" || e.key === " ") closeSavedCodesModal();
//               }}
//               aria-label="Close Modal"
//             >
//               ✖
//             </div>
//             <h3>Saved Codes</h3>
//             <ul>
//               {savedCodes.map((code) => (
//                 <li key={code._id}>
//                   {code.codeName}
//                   <button className="modal-btn open-btn" onClick={() => handleOpenCode(code)}>Open</button>
//                   <button className="modal-btn delete-btn" onClick={() => handleDeleteCode(code._id)}>Delete</button>
//                 </li>
//               ))}
//             </ul>
//             <div className="modal-buttons">
//               <button className="modal-btn close-btn" onClick={closeSavedCodesModal}>Close</button>
//             </div>
//           </div>
//         </div>
//       )}

//       {showSaveOnlyModal && (
//         <div className={`modal-overlay${isClosingSaveOnlyModal ? " closing" : ""}`}>
//           <div className={`modal-content${isClosingSaveOnlyModal ? " closing" : ""}`}>
//             <div
//               className="modal-close"
//               onClick={() => {
//                 setIsClosingSaveOnlyModal(true);
//                 setTimeout(() => {
//                   setShowSaveOnlyModal(false);
//                   setIsClosingSaveOnlyModal(false);
//                 }, 500);
//               }}
//               role="button"
//               tabIndex={0}
//               onKeyPress={(e) => {
//                 if (e.key === "Enter" || e.key === " ") {
//                   setIsClosingSaveOnlyModal(true);
//                   setTimeout(() => {
//                     setShowSaveOnlyModal(false);
//                     setIsClosingSaveOnlyModal(false);
//                   }, 500);
//                 }
//               }}
//               aria-label="Close Modal"
//             >
//               ✖
//             </div>
//             <h3>Save Code</h3>
//             <input
//               type="text"
//               value={codeName}
//               onChange={(e) => setCodeName(e.target.value)}
//               placeholder="Enter code name"
//               aria-label="Code name"
//             />
//             <div className="modal-buttons">
//               <button className="modal-btn save-btn" onClick={saveCodeOnly}>Save</button>
//             </div>
//           </div>
//         </div>
//       )}

//       <style jsx>{`
//         @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&display=swap');

//         .vampire-theme-container {
//           height: 100vh;
//           display: flex;
//           flex-direction: column;
//           overflow: hidden;
//         }

//         .vampire-navbar {
//           flex-shrink: 0;
//           background-color: #212529;
//           padding: 10px;
//           display: flex;
//           justify-content: space-between;
//           align-items: center;
//         }

//         .navbar-right button {
//           margin-left: 10px;
//         }

//         .vampire-main {
//           display: flex;
//           flex: 1;
//           overflow: hidden;
//         }

//         .vampire-sidebar {
//           width: 250px;
//           flex-shrink: 0;
//           background-color: #212529;
//           color: #ffffff;
//           padding: 10px;
//           overflow-y: auto;
//         }

//         .vampire-editor {
//           flex: 1;
//           display: flex;
//           flex-direction: column;
//           overflow: hidden;
//         }

//         .editor-container {
//           flex: 1;
//           overflow-y: auto;
//         }

//         .io-panel {
//           flex-shrink: 0;
//           display: flex;
//           justify-content: space-between;
//           background-color: #282a36;
//           padding: 10px;
//           box-shadow: 0 -2px 5px rgba(0, 0, 0, 0.3);
//         }

//         .input-panel,
//         .output-panel {
//           flex: 1;
//           margin: 0 10px;
//         }

//         .input-panel textarea {
//           width: 100%;
//           height: 100px;
//           background: rgba(255, 255, 255, 0.1);
//           color: white;
//           border: none;
//           border-radius: 10px;
//           padding: 10px;
//           resize: none;
//           font-family: 'Fira Code', 'JetBrains Mono', monospace;
//           box-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
//           transition: background-color 0.3s ease;
//         }

//         .input-panel textarea:focus {
//           background: rgba(255, 255, 255, 0.25);
//           box-shadow: 0 0 15px rgba(255, 255, 255, 0.7);
//           outline: none;
//         }

//         .output-panel pre {
//           background: rgba(255, 255, 255, 0.1);
//           color: white;
//           padding: 10px;
//           border: none;
//           border-radius: 10px;
//           height: 100px;
//           overflow-y: auto;
//           margin: 0;
//           font-family: 'Fira Code', 'JetBrains Mono', monospace;
//           box-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
//         }

//         .modal-overlay {
//           position: fixed;
//           top: 0;
//           left: 0;
//           height: 100vh;
//           width: 100vw;
//           background: rgba(0, 0, 0, 0.3);
//           backdrop-filter: blur(10px);
//           z-index: 1000;
//           display: flex;
//           justify-content: center;
//           align-items: center;
//           animation: fadeIn 0.5s ease-in-out;
//         }

//         .modal-overlay.closing {
//           animation: fadeOut 0.5s ease-in-out forwards;
//         }

//         .modal-content {
//           background: rgba(255, 255, 255, 0.05);
//           border-radius: 20px;
//           padding: 1.5rem;
//           max-width: 500px;
//           width: 90%;
//           min-height: 200px;
//           position: relative;
//           color: #fff;
//           text-align: center;
//           box-shadow: 0 0 20px rgba(255, 255, 255, 0.2);
//           border: 1px solid rgba(255, 255, 255, 0.2);
//           font-family: 'Orbitron', sans-serif;
//           animation: scaleIn 0.5s ease-in-out;
//         }

//         .modal-content.closing {
//           animation: scaleOut 0.5s ease-in-out forwards;
//         }

//         @keyframes fadeIn {
//           from { opacity: 0; }
//           to { opacity: 1; }
//         }

//         @keyframes scaleIn {
//           from { transform: scale(0.8); opacity: 0; }
//           to { transform: scale(1); opacity: 1; }
//         }

//         @keyframes fadeOut {
//           from { opacity: 1; }
//           to { opacity: 0; }
//         }

//         @keyframes scaleOut {
//           from { transform: scale(1); opacity: 1; }
//           to { transform: scale(0.8); opacity: 0; }
//         }

//         .modal-close {
//           position: absolute;
//           top: 10px;
//           right: 15px;
//           font-size: 1.2rem;
//           cursor: pointer;
//           color: #ff6666;
//           transition: color 0.3s ease;
//         }

//         .modal-close:hover {
//           color: #ff8888;
//         }

//         .modal-content h3 {
//           margin-bottom: 1rem;
//           font-size: 1.3em;
//           font-weight: 700;
//         }

//         .modal-content input {
//           width: 100%;
//           padding: 0.7rem 1.2rem;
//           margin: 0.8rem 0;
//           background: rgba(255, 255, 255, 0.1);
//           border: none;
//           border-radius: 20px;
//           color: white;
//           font-family: 'Orbitron', sans-serif;
//           box-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
//           transition: background-color 0.3s ease;
//         }

//         .modal-content input::placeholder {
//           color: rgba(255, 255, 255, 0.7);
//         }

//         .modal-content input:focus {
//           background: rgba(255, 255, 255, 0.25);
//           box-shadow: 0 0 12px rgba(255, 255, 255, 0.7);
//           outline: none;
//         }

//         .modal-content ul {
//           list-style: none;
//           padding: 0;
//           margin: 0;
//           text-align: left;
//           max-height: 150px;
//           overflow-y: auto;
//         }

//         .modal-content li {
//           margin: 8px 0;
//           display: flex;
//           justify-content: space-between;
//           align-items: center;
//           padding: 6px 10px;
//           background: rgba(255, 255, 255, 0.05);
//           border-radius: 4px;
//           transition: background 0.2s ease;
//         }

//         .modal-content li:hover {
//           background: rgba(255, 255, 255, 0.1);
//         }

//         .modal-btn {
//           padding: 0.6rem 1.5rem;
//           margin: 0 5px;
//           border: none;
//           border-radius: 20px;
//           cursor: pointer;
//           font-size: 0.9rem;
//           font-weight: 600;
//           font-family: 'Orbitron', sans-serif;
//           box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
//           transition: background-color 0.3s ease, transform 0.3s ease;
//         }

//         .save-btn {
//           background: #50fa7b;
//           color: #282a36;
//         }

//         .save-btn:hover {
//           background: #75fb95;
//           transform: scale(1.05);
//         }

//         .btn-save {
//           background: #50fa7b;
//           color: #282a36;
//           padding: 0.6rem 1.5rem;
//           border: none;
//           border-radius: 20px;
//           cursor: pointer;
//           font-family: 'Orbitron', sans-serif;
//           transition: background-color 0.3s ease, transform 0.3s ease;
//         }

//         .btn-save:hover {
//           background: #75fb95;
//           transform: scale(1.05);
//         }

//         .cancel-btn, .close-btn {
//           background: #ff5555;
//           color: #ffffff;
//         }

//         .cancel-btn:hover, .close-btn:hover {
//           background: #ff7777;
//           transform: scale(1.05);
//         }

//         .open-btn {
//           background: #6272a4;
//           color: #ffffff;
//         }

//         .open-btn:hover {
//           background: #8193b2;
//           transform: scale(1.05);
//         }

//         .delete-btn {
//           background: #bd93f9;
//           color: #282a36;
//         }

//         .delete-btn:hover {
//           background: #cbb2fe;
//           transform: scale(1.05);
//         }

//         .modal-buttons {
//           display: flex;
//           justify-content: space-around;
//           margin-top: 15px;
//         }
//       `}</style>
//     </div>
//   );
// }

// export default EditorPage;
import React, { useEffect, useRef, useState, useCallback } from "react";
import Client from "./Client";
import Editor from "./Editor";
import { initSocket } from "../Socket";
import { ACTIONS } from "../Actions";
import { useNavigate, useLocation, Navigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import axios from "axios";
import { getAuth } from "firebase/auth";
import { memo } from "react";

const MemoizedEditor = memo(Editor);

function EditorPage() {
  const [clients, setClients] = useState([]);
  const [output, setOutput] = useState("");
  const [input, setInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [codeName, setCodeName] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showSavedCodesModal, setShowSavedCodesModal] = useState(false);
  const [showSaveOnlyModal, setShowSaveOnlyModal] = useState(false);
  const [savedCodes, setSavedCodes] = useState([]);
  const [isClosingSaveModal, setIsClosingSaveModal] = useState(false);
  const [isClosingSavedCodesModal, setIsClosingSavedCodesModal] = useState(false);
  const [isClosingSaveOnlyModal, setIsClosingSaveOnlyModal] = useState(false);
  const codeRef = useRef("");
  const socketRef = useRef(null);
  const [socketInitialized, setSocketInitialized] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const { roomId } = useParams();

  const languages = [
    { name: "JavaScript", value: "javascript", judge0Id: 63, mode: "javascript" },
    { name: "Python", value: "python", judge0Id: 71, mode: "python" },
    { name: "Java", value: "java", judge0Id: 62, mode: "java" },
    { name: "C++", value: "cpp", judge0Id: 54, mode: "cpp" },
    { name: "C", value: "c", judge0Id: 50, mode: "c" },
  ];

  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  const debouncedSetClients = useCallback(debounce(setClients, 100), []);

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      setUserEmail(user.email);
    } else if (location.state?.email) {
      setUserEmail(location.state.email);
    } else {
      toast.error("Please log in to access the editor");
      navigate("/");
    }
  }, [navigate, location.state]);

  useEffect(() => {
    if (!userEmail) return;

    const handleErrors = (err) => {
      console.error("Socket error:", err);
      toast.error("Socket connection failed, try again later");
      navigate("/");
    };

    const init = async () => {
      try {
        socketRef.current = await initSocket();
        socketRef.current.on("connect", () => {
          setSocketInitialized(true);
        });

        socketRef.current.on("connect_error", handleErrors);
        socketRef.current.on("connect_failed", handleErrors);

        const joinData = {
          roomId,
          username: location.state?.username || "Anonymous",
          photoURL: location.state?.photoURL || "",
          email: userEmail,
        };

        socketRef.current.emit(ACTIONS.JOIN, joinData);

        socketRef.current.on(ACTIONS.JOINED, ({ clients, username, socketId }) => {
          if (username !== location.state?.username) {
            toast.success(`${username} joined the room.`);
          }
          debouncedSetClients(clients);
          if (codeRef.current) {
            socketRef.current.emit(ACTIONS.SYNC_CODE, {
              code: codeRef.current,
              socketId,
            });
          }
        });

        socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code }) => {
          codeRef.current = code;
        });

        socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
          toast.success(`${username} left the room.`);
          setClients((prev) => prev.filter((client) => client.socketId !== socketId));
        });
      } catch (error) {
        handleErrors(error);
      }
    };

    init();

    return () => {
      if (socketRef.current) {
        socketRef.current.off("connect");
        socketRef.current.off("connect_error");
        socketRef.current.off("connect_failed");
        socketRef.current.off(ACTIONS.JOINED);
        socketRef.current.off(ACTIONS.CODE_CHANGE);
        socketRef.current.off(ACTIONS.DISCONNECTED);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [roomId, userEmail, navigate, debouncedSetClients, location.state]);

  const runCode = async () => {
    if (!codeRef.current) {
      toast.error("No code to execute");
      return;
    }

    setIsRunning(true);
    setOutput("Running...");

    try {
      const language = languages.find((lang) => lang.value === selectedLanguage);
      const requestPayload = {
        source_code: btoa(codeRef.current),
        language_id: language.judge0Id,
        stdin: btoa(input),
      };

      const response = await axios.post(
        `${process.env.REACT_APP_JUDGE0_HOST}/submissions?base64_encoded=true&wait=true`,
        requestPayload,
        {
          headers: {
            "x-rapidapi-key": process.env.REACT_APP_JUDGE0_API_KEY,
            "x-rapidapi-host": "judge0-ce.p.rapidapi.com",
            "content-type": "application/json",
          },
        }
      );

      const { stdout, stderr, compile_output, message, status } = response.data;
      if (status.id === 3) {
        setOutput(stdout ? atob(stdout) : "No output");
      } else {
        setOutput(
          (stderr ? atob(stderr) : "") ||
          (compile_output ? atob(compile_output) : "") ||
          (message ? atob(message) : "") ||
          "Unknown error"
        );
      }
    } catch (error) {
      setOutput(`Error: ${error.message || "Failed to execute code"}`);
      toast.error(`Failed to execute code: ${error.message || "Unknown error"}`);
    } finally {
      setIsRunning(false);
    }
  };

  const saveCode = async () => {
    if (!userEmail) {
      toast.error("Please log in to save code");
      return;
    }
    if (!codeName || !codeRef.current) {
      toast.error("Code name and code content are required");
      return;
    }
    const payload = {
      userEmail,
      codeName,
      code: codeRef.current,
      language: selectedLanguage,
    };
    try {
      const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/save-code`, payload);
      console.log("Save code response:", response.data);
      toast.success("Code saved successfully");
      setCodeName("");
      setIsClosingSaveModal(true);
      setTimeout(() => {
        setShowSaveModal(false);
        setIsClosingSaveModal(false);
        navigate("/");
      }, 500);
    } catch (error) {
      console.error("Save code error:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      toast.error(`Failed to save code: ${error.response?.data?.error || error.message}`);
    }
  };

  const saveCodeWithoutLeaving = async () => {
    if (!userEmail) {
      toast.error("Please log in to save code");
      return;
    }
    if (!codeName || !codeRef.current) {
      toast.error("Code name and code content are required");
      return;
    }
    const payload = {
      userEmail,
      codeName,
      code: codeRef.current,
      language: selectedLanguage,
    };
    try {
      const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/save-code`, payload);
      console.log("Save code without leaving response:", response.data);
      toast.success("Code saved successfully");
      setCodeName("");
      setIsClosingSaveModal(true);
      setTimeout(() => {
        setShowSaveModal(false);
        setIsClosingSaveModal(false);
      }, 500);
    } catch (error) {
      console.error("Save code without leaving error:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      toast.error(`Failed to save code: ${error.response?.data?.error || error.message}`);
    }
  };

  const saveCodeOnly = async () => {
    if (!userEmail) {
      toast.error("Please log in to save code");
      return;
    }
    if (!codeName || !codeRef.current) {
      toast.error("Code name and code content are required");
      return;
    }
    const payload = {
      userEmail,
      codeName,
      code: codeRef.current,
      language: selectedLanguage,
    };
    try {
      const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/save-code`, payload);
      console.log("Save code only response:", response.data);
      toast.success("Code saved successfully");
      setCodeName("");
      setIsClosingSaveOnlyModal(true);
      setTimeout(() => {
        setShowSaveOnlyModal(false);
        setIsClosingSaveOnlyModal(false);
      }, 500);
    } catch (error) {
      console.error("Save code only error:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      toast.error(`Failed to save code: ${error.response?.data?.error || error.message}`);
    }
  };

  const fetchSavedCodes = async () => {
    if (!userEmail) {
      toast.error("Please log in to fetch codes");
      return;
    }
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/saved-codes/${userEmail}`);
      console.log("Fetch saved codes response:", response.data);
      setSavedCodes(response.data);
    } catch (error) {
      console.error("Fetch saved codes error:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      toast.error(`Failed to fetch saved codes: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleOpenCode = (savedCode) => {
    if (socketRef.current && socketRef.current.connected) {
      codeRef.current = savedCode.code;
      setSelectedLanguage(savedCode.language);
      socketRef.current.emit(ACTIONS.CODE_CHANGE, {
        roomId,
        code: savedCode.code,
      });
      setIsClosingSavedCodesModal(true);
      setTimeout(() => {
        setShowSavedCodesModal(false);
        setIsClosingSavedCodesModal(false);
      }, 500);
      toast.success(`Loaded code: ${savedCode.codeName}`);
    } else {
      toast.error("Socket not connected");
    }
  };

  const handleDeleteCode = async (codeId) => {
    try {
      const response = await axios.delete(`${process.env.REACT_APP_BACKEND_URL}/api/delete-code/${codeId}`);
      console.log("Delete code response:", response.data);
      toast.success("Code deleted successfully");
      fetchSavedCodes();
    } catch (error) {
      console.error("Delete code error:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      toast.error(`Failed to delete code: ${error.response?.data?.error || error.message}`);
    }
  };

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success("Room ID copied to clipboard");
    } catch {
      toast.error("Failed to copy Room ID");
    }
  };

  const handleLeaveRoom = () => {
    setShowSaveModal(true);
  };

  const handleSaveAndLeave = () => {
    saveCode();
  };

  const closeSaveModal = () => {
    setIsClosingSaveModal(true);
    setTimeout(() => {
      setShowSaveModal(false);
      setIsClosingSaveModal(false);
    }, 500);
  };

  const closeSavedCodesModal = () => {
    setIsClosingSavedCodesModal(true);
    setTimeout(() => {
      setShowSavedCodesModal(false);
      setIsClosingSavedCodesModal(false);
    }, 500);
  };

  if (!location.state) {
    return <Navigate to="/" />;
  }

  return (
    <div className="vampire-theme-container">
      <nav className="vampire-navbar">
        <div className="navbar-left">
          <span className="navbar-title">Code & Colab</span>
        </div>
        <div className="navbar-right">
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="language-selector"
            aria-label="Select Programming Language"
          >
            {languages.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.name}
              </option>
            ))}
          </select>
          <button
            className="btn btn-run"
            onClick={runCode}
            disabled={isRunning}
            aria-label="Run Code"
          >
            {isRunning ? "Running..." : "Run"}
          </button>
          <button
            className="btn btn-save"
            onClick={() => setShowSaveOnlyModal(true)}
          >
            Save Code
          </button>
          <button className="btn btn-copy" onClick={copyRoomId}>
            Copy Room ID
          </button>
          <span className="room-id">
            Room: <code>{roomId}</code>
          </span>
          <button
            className="btn btn-saved-codes"
            onClick={() => {
              fetchSavedCodes();
              setShowSavedCodesModal(true);
            }}
          >
            Saved Codes
          </button>
          <button className="btn btn-leave" onClick={handleLeaveRoom}>
            Leave Room
          </button>
        </div>
      </nav>

      <div className="vampire-main">
        <aside className="vampire-sidebar">
          <div className="sidebar-header">
            <h4>Active Users ({clients.length})</h4>
          </div>
          <ul className="client-list">
            {clients.map((client) => (
              <li key={client.socketId} className="client-item">
                <Client
                  username={client.username}
                  photoURL={client.photoURL}
                  email={client.email}
                />
              </li>
            ))}
          </ul>
        </aside>

        <main className="vampire-editor">
          <div className="editor-container">
            {socketInitialized && (
              <MemoizedEditor
                socketRef={socketRef}
                roomId={roomId}
                selectedLanguage={selectedLanguage}
                codeRef={codeRef}
                onCodeChange={(code) => {
                  codeRef.current = code;
                }}
              />
            )}
          </div>
          <div className="io-panel">
            <div className="input-panel">
              <h5>Input</h5>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter input here"
                aria-label="Input for the program"
              />
            </div>
            <div className="output-panel">
              <h5>Output</h5>
              <pre>{output || "Execute the code to view the output."}</pre>
            </div>
          </div>
        </main>
      </div>

      {showSaveModal && (
        <div className={`modal-overlay${isClosingSaveModal ? " closing" : ""}`}>
          <div className={`modal-content${isClosingSaveModal ? " closing" : ""}`}>
            <div
              className="modal-close"
              onClick={closeSaveModal}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => {
                if (e.key === "Enter" || e.key === " ") closeSaveModal();
              }}
              aria-label="Close Modal"
            >
              ✖
            </div>
            <h3>Save Code</h3>
            <input
              type="text"
              value={codeName}
              onChange={(e) => setCodeName(e.target.value)}
              placeholder="Enter code name"
              aria-label="Code name"
            />
            <div className="modal-buttons">
              <button className="modal-btn save-btn" onClick={handleSaveAndLeave}>Save and Leave</button>
              <button className="modal-btn save-btn" onClick={saveCodeWithoutLeaving}>Save</button>
              <button className="modal-btn cancel-btn" onClick={() => navigate("/")}>Leave without Saving</button>
            </div>
          </div>
        </div>
      )}

      {showSavedCodesModal && (
        <div className={`modal-overlay${isClosingSavedCodesModal ? " closing" : ""}`}>
          <div className={`modal-content${isClosingSavedCodesModal ? " closing" : ""}`}>
            <div
              className="modal-close"
              onClick={closeSavedCodesModal}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => {
                if (e.key === "Enter" || e.key === " ") closeSavedCodesModal();
              }}
              aria-label="Close Modal"
            >
              ✖
            </div>
            <h3>Saved Codes</h3>
            <ul>
              {savedCodes.map((code) => (
                <li key={code._id}>
                  {code.codeName}
                  <button className="modal-btn open-btn" onClick={() => handleOpenCode(code)}>Open</button>
                  <button className="modal-btn delete-btn" onClick={() => handleDeleteCode(code._id)}>Delete</button>
                </li>
              ))}
            </ul>
            <div className="modal-buttons">
              <button className="modal-btn close-btn" onClick={closeSavedCodesModal}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showSaveOnlyModal && (
        <div className={`modal-overlay${isClosingSaveOnlyModal ? " closing" : ""}`}>
          <div className={`modal-content${isClosingSaveOnlyModal ? " closing" : ""}`}>
            <div
              className="modal-close"
              onClick={() => {
                setIsClosingSaveOnlyModal(true);
                setTimeout(() => {
                  setShowSaveOnlyModal(false);
                  setIsClosingSaveOnlyModal(false);
                }, 500);
              }}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setIsClosingSaveOnlyModal(true);
                  setTimeout(() => {
                    setShowSaveOnlyModal(false);
                    setIsClosingSaveOnlyModal(false);
                  }, 500);
                }
              }}
              aria-label="Close Modal"
            >
              ✖
            </div>
            <h3>Save Code</h3>
            <input
              type="text"
              value={codeName}
              onChange={(e) => setCodeName(e.target.value)}
              placeholder="Enter code name"
              aria-label="Code name"
            />
            <div className="modal-buttons">
              <button className="modal-btn save-btn" onClick={saveCodeOnly}>Save</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&display=swap');

        .vampire-theme-container {
          height: 100vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .vampire-navbar {
          flex-shrink: 0;
          background-color: #212529;
          padding: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .navbar-right button {
          margin-left: 10px;
        }

        .vampire-main {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        .vampire-sidebar {
          width: 250px;
          flex-shrink: 0;
          background-color: #212529;
          color: #ffffff;
          padding: 10px;
          overflow-y: auto;
        }

        .vampire-editor {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .editor-container {
          flex: 1;
          overflow-y: auto;
        }

        .io-panel {
          flex-shrink: 0;
          display: flex;
          justify-content: space-between;
          background-color: #282a36;
          padding: 10px;
          box-shadow: 0 -2px 5px rgba(0, 0, 0, 0.3);
        }

        .input-panel,
        .output-panel {
          flex: 1;
          margin: 0 10px;
        }

        .input-panel textarea {
          width: 100%;
          height: 100px;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: none;
          border-radius: 10px;
          padding: 10px;
          resize: none;
          font-family: 'Fira Code', 'JetBrains Mono', monospace;
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
          transition: background-color 0.3s ease;
        }

        .input-panel textarea:focus {
          background: rgba(255, 255, 255, 0.25);
          box-shadow: 0 0 15px rgba(255, 255, 255, 0.7);
          outline: none;
        }

        .output-panel pre {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          padding: 10px;
          border: none;
          border-radius: 10px;
          height: 100px;
          overflow-y: auto;
          margin: 0;
          font-family: 'Fira Code', 'JetBrains Mono', monospace;
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          width: 100vw;
          background: rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(10px);
          z-index: 1000;
          display: flex;
          justify-content: center;
          align-items: center;
          animation: fadeIn 0.5s ease-in-out;
        }

        .modal-overlay.closing {
          animation: fadeOut 0.5s ease-in-out forwards;
        }

        .modal-content {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          padding: 1.5rem;
          max-width: 500px;
          width: 90%;
          min-height: 200px;
          position: relative;
          color: #fff;
          text-align: center;
          box-shadow: 0 0 20px rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.2);
          font-family: 'Orbitron', sans-serif;
          animation: scaleIn 0.5s ease-in-out;
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
          top: 10px;
          right: 15px;
          font-size: 1.2rem;
          cursor: pointer;
          color: #ff6666;
          transition: color 0.3s ease;
        }

        .modal-close:hover {
          color: #ff8888;
        }

        .modal-content h3 {
          margin-bottom: 1rem;
          font-size: 1.3em;
          font-weight: 700;
        }

        .modal-content input {
          width: 100%;
          padding: 0.7rem 1.2rem;
          margin: 0.8rem 0;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 20px;
          color: white;
          font-family: 'Orbitron', sans-serif;
          box-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
          transition: background-color 0.3s ease;
        }

        .modal-content input::placeholder {
          color: rgba(255, 255, 255, 0.7);
        }

        .modal-content input:focus {
          background: rgba(255, 255, 255, 0.25);
          box-shadow: 0 0 12px rgba(255, 255, 255, 0.7);
          outline: none;
        }

        .modal-content ul {
          list-style: none;
          padding: 0;
          margin: 0;
          text-align: left;
          max-height: 150px;
          overflow-y: auto;
        }

        .modal-content li {
          margin: 8px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 10px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
          transition: background 0.2s ease;
        }

        .modal-content li:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .modal-btn {
          padding: 0.6rem 1.5rem;
          margin: 0 5px;
          border: none;
          border-radius: 20px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 600;
          font-family: 'Orbitron', sans-serif;
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
          transition: background-color 0.3s ease, transform 0.3s ease;
        }

        .save-btn {
          background: #50fa7b;
          color: #282a36;
        }

        .save-btn:hover {
          background: #75fb95;
          transform: scale(1.05);
        }

        .btn-save {
          background: #50fa7b;
          color: #282a36;
          padding: 0.6rem 1.5rem;
          border: none;
          border-radius: 20px;
          cursor: pointer;
          font-family: 'Orbitron', sans-serif;
          transition: background-color 0.3s ease, transform 0.3s ease;
        }

        .btn-save:hover {
          background: #75fb95;
          transform: scale(1.05);
        }

        .cancel-btn, .close-btn {
          background: #ff5555;
          color: #ffffff;
        }

        .cancel-btn:hover, .close-btn:hover {
          background: #ff7777;
          transform: scale(1.05);
        }

        .open-btn {
          background: #6272a4;
          color: #ffffff;
        }

        .open-btn:hover {
          background: #8193b2;
          transform: scale(1.05);
        }

        .delete-btn {
          background: #bd93f9;
          color: #282a36;
        }

        .delete-btn:hover {
          background: #cbb2fe;
          transform: scale(1.05);
        }

        .modal-buttons {
          display: flex;
          justify-content: space-around;
          margin-top: 15px;
        }
      `}</style>
    </div>
  );
}

export default EditorPage;
