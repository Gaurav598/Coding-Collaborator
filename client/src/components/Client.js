
import React from "react";

function Client({ username, photoURL, email }) {
  return (
    <div className="d-flex align-items-center mb-3">
      <img
        src={photoURL || "/images/default-avatar.png"} 
        alt={username}
        style={{ width: 40, height: 40, borderRadius: "14px", marginRight: 10 }}
      />
      <div>
        <span className="mx-2">{username.toString()}</span>
        <br />
        <small style={{ color: "#ffffff" }}>{email}</small> {/* Use white text */}
      </div>
    </div>
  );
}

export default Client;