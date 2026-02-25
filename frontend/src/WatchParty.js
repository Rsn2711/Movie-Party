// import { useEffect, useState } from "react";
// import socket from "./socket";

// function WatchParty({ roomId, username }) {
//   const [messages, setMessages] = useState([]);
//   const [text, setText] = useState("");

//   useEffect(() => {
//     socket.emit("join-room", { roomId, username });

//     socket.on("system-message", (data) => {
//       setMessages((prev) => [...prev, data.text]);
//     });

//     socket.on("chat-message", (data) => {
//       setMessages((prev) => [...prev, `${data.username}: ${data.message}`]);
//     });

//     return () => {
//       socket.off("system-message");
//       socket.off("chat-message");
//     };
//   }, [roomId, username]);

//   const sendMessage = () => {
//     if (!text.trim()) return;

//     socket.emit("send-message", {
//       roomId,
//       username,
//       message: text,
//     });

//     setText("");
//   };

//   return (
//     <div>
//       <h3>Room: {roomId} | You: {username}</h3>

//       <div style={{ border: "1px solid black", height: "150px", overflowY: "auto" }}>
//         {messages.map((m, i) => (
//           <div key={i}>{m}</div>
//         ))}
//       </div>

//       <input
//         value={text}
//         onChange={(e) => setText(e.target.value)}
//         placeholder="Type message"
//       />
//       <button onClick={sendMessage}>Send</button>
//     </div>
//   );
// }

// export default WatchParty;
