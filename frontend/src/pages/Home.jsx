import React, { useState, useEffect } from "react";
import { useData } from "./Context";
import axios from "axios";
import { io } from "socket.io-client";
import { TbPaperclip, TbArrowLeft } from "react-icons/tb";
import { API_URL } from "../config";

const socket = io(API_URL);

const Home = () => {
  const { logout, currentuser } = useData();

  const [users, setUsers] = useState([]);
  const [chatuser, setChatuser] = useState(null);
  const [inputmsg, setInputmsg] = useState("");
  const [handledata, setHandledata] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadfiles, setUploadfiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewImage, setPreviewImage] = useState(null);

  const filteredUsers = users.filter(
    (u) =>
      u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );


  // Handle file upload API call
  const handlefunc = async () => {
    if (selectedFiles.length === 0) return null;

    const formData = new FormData();
    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append("files", selectedFiles[i]);
    }

    try {
      const response = await axios.post(
        `${API_URL}/api/v1/upload/upload`,
        formData
     
      );
      console.log("Files uploaded successfully:", response.data);
      return response.data;
    } catch (error) {
      console.log("Error uploading files:", error);
      return null;
    }
  };

  const myId = currentuser?._id || currentuser?.U?._id;
  const targetId = chatuser?._id || chatuser?.U?._id;

  const roomid =
    myId && targetId
      ? [String(myId), String(targetId)].sort().join("_")
      : null;

  // Get all users
  const getAllUser = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/v1/all-user`
      );

      setUsers(response.data.users || []);
    } catch (error) {
      console.log("Error fetching users:", error);
    }
  };

  // Send message
  const sendmsg = async () => {
    if ((!inputmsg.trim() && selectedFiles.length === 0) || !roomid) {
      return;
    }

    // Call file upload API if files are selected
    let uploadResult = null;
    if (selectedFiles.length > 0) {
      uploadResult = await handlefunc();
    }

    const fileList = uploadResult?.files || [];

    socket.emit("user-msg", {
      roomid: roomid,
      msg: inputmsg,
      receiveid: targetId,
      senderid: myId,
      file: fileList,
      fileData: uploadResult,
    });

    setInputmsg("");
    setSelectedFiles([]);
  };

  // Initial setup
  useEffect(() => {
    getAllUser();

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
    });

    socket.emit("user-id", myId);

    return () => {
      socket.off("connect");
    };
  }, [myId]);
useEffect(() => {
  if (!roomid) {
    setHandledata([]);
    return;
  }

  console.log("Joining room:", roomid);

  // Clear previous chat immediately
  setHandledata([]);

  // Join room
  socket.emit("roomid", roomid);

  // Receive old messages
  const receiveOldMessages = (data) => {
    console.log("Old messages:", data);
    setHandledata(data);
  };

  // Receive new messages
  const receiveMessage = (data) => {
    console.log("New message:", data);
    setHandledata((prev) => [...prev, data]);
  };

  // IMPORTANT: listeners first
  socket.on("oldmsg", receiveOldMessages);
  socket.on("messages", receiveMessage);

  // Then request old messages
  socket.emit("getmsg", roomid);

  return () => {
    socket.off("oldmsg", receiveOldMessages);
    socket.off("messages", receiveMessage);
  };
}, [roomid]);
  return (
    <div className="h-screen w-screen flex bg-white font-sans text-slate-800 overflow-hidden">
      {/* Sidebar */}
      <div
        className={`w-full md:w-80 lg:w-96 border-r border-green-100 bg-green-50/40 flex flex-col shrink-0 h-full ${
          chatuser ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Header */}
        <div className="h-16 px-4 bg-white border-b border-green-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            <h1 className="font-bold text-base text-green-950">Chat App</h1>
          </div>

          <button
            onClick={logout}
            className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
          >
            Logout
          </button>
        </div>

        {/* Search */}
        <div className="p-3 bg-white border-b border-green-100 shrink-0">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-green-50/50 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <div
                key={user._id}
                onClick={() => setChatuser(user)}
                className={`p-3.5 flex items-center gap-3 cursor-pointer hover:bg-green-100/50 transition-colors ${
                  targetId === user._id
                    ? "bg-green-100 border-l-4 border-green-600"
                    : ""
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-green-600 text-white font-semibold flex items-center justify-center shrink-0">
                  {user.username ? user.username.charAt(0).toUpperCase() : "U"}
                </div>

                <div className="truncate">
                  <h3 className="text-sm font-semibold truncate">{user.username}</h3>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-xs text-slate-400">
              No users found
            </div>
          )}
        </div>
      </div>

      {/* Chat Container */}
      <div
        className={`flex-1 flex flex-col bg-white h-full ${
          !chatuser ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Chat Header */}
        <div className="h-16 px-4 md:px-6 bg-white border-b border-green-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile Back Button */}
            <button
              onClick={() => setChatuser(null)}
              className="md:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Back to contacts"
            >
              <TbArrowLeft className="w-5 h-5" />
            </button>

            {chatuser ? (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-green-600 text-white font-semibold flex items-center justify-center text-sm shrink-0">
                  {chatuser.username ? chatuser.username.charAt(0).toUpperCase() : "U"}
                </div>
                <div>
                  <h2 className="font-bold text-sm text-slate-800">
                    {chatuser.username}
                  </h2>
                  <p className="text-xs text-green-600 flex items-center gap-1 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Online
                  </p>
                </div>
              </div>
            ) : (
              <h2 className="font-bold text-sm text-slate-500">
                Select a user to chat
              </h2>
            )}
          </div>
        </div>

        {!chatuser ? (
          /* Empty state on desktop when no user selected */
          <div className="hidden md:flex flex-1 flex-col items-center justify-center p-6 bg-slate-50 text-slate-400">
            <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 4.418 9 8z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-700 text-base">Select a user to start messaging</h3>
            <p className="text-xs text-slate-400 mt-1">Choose a user from the sidebar list to view your chat history</p>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#f4f9f5] space-y-3">
              {handledata
                .filter((msg) => msg.roomid === roomid)
                .map((msg, index) => {
                  const isMe = String(msg.senderid) === String(myId);

                  // Extract image URLs
                  const rawFiles = Array.isArray(msg.file) && msg.file.length > 0
                    ? msg.file
                    : Array.isArray(msg.fileData?.files)
                    ? msg.fileData.files
                    : [];

                  const imageUrls = rawFiles
                    .map((fItem) => typeof fItem === "string" ? fItem : fItem?.image || fItem?.url)
                    .filter(Boolean);

                  const hasText = Boolean(msg.msg && msg.msg.trim());
                  const hasImages = imageUrls.length > 0;

                  if (!hasText && !hasImages) return null;

                  return (
                    <div
                      key={msg._id || index}
                      className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`p-2.5 px-3.5 rounded-xl max-w-[85%] md:max-w-xs ${
                          isMe
                            ? "bg-green-600 text-white"
                            : "bg-white text-slate-800 border border-slate-100 shadow-xs"
                        }`}
                      >
                        {/* Render image attachments if present */}
                        {hasImages && (
                          <div className="flex flex-col gap-2 mb-1.5">
                            {imageUrls.map((imgUrl, fIdx) => (
                              <img
                                key={fIdx}
                                src={imgUrl}
                                alt="Attachment"
                                onClick={() => setPreviewImage(imgUrl)}
                                className="rounded-lg w-full max-h-56 object-cover border border-black/10 bg-slate-100 cursor-pointer hover:opacity-90 transition-opacity"
                                title="Click to view full image"
                              />
                            ))}
                          </div>
                        )}

                        {hasText && <p className="break-words text-sm leading-relaxed">{msg.msg}</p>}
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Input */}
            <div className="p-3 md:p-4 bg-white border-t border-green-100 shrink-0">
              {selectedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2 px-1">
                  {selectedFiles.map((file, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs bg-slate-100 text-slate-700 rounded-md font-medium border border-slate-200"
                    >
                      <span className="truncate max-w-[150px]">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedFiles((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-red-500 font-bold ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendmsg();
                }}
                className="flex items-center gap-2"
              >
                <label
                  htmlFor="file-input"
                  className="p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 active:bg-slate-200 rounded-xl cursor-pointer transition-colors flex items-center justify-center shrink-0"
                  title="Attach files"
                >
                  <TbPaperclip className="w-5 h-5 text-slate-500" />
                  <input
                    id="file-input"
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setSelectedFiles(Array.from(e.target.files));
                      }
                    }}
                  />
                </label>

                <input
                  type="text"
                  placeholder="Type your message..."
                  value={inputmsg}
                  onChange={(e) => setInputmsg(e.target.value)}
                  className="flex-1 px-3.5 md:px-4 py-2.5 text-sm bg-green-50/50 border border-green-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-slate-800"
                />

                <button
                  type="submit"
                  className="px-4 md:px-5 py-2.5 text-sm bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors shrink-0"
                >
                  Send
                </button>
              </form>
            </div>
          </>
        )}
      </div>

      {/* Image Preview Modal (Lightbox) */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Action Buttons */}
            <div className="absolute -top-10 right-0 flex items-center gap-4">
              <a
                href={previewImage}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-md transition-colors"
              >
                Open Original ↗
              </a>
              <button
                onClick={() => setPreviewImage(null)}
                className="text-white hover:text-red-400 font-bold text-xl px-2 focus:outline-none"
                title="Close"
              >
                ✕
              </button>
            </div>

            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-[80vh] rounded-xl object-contain shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;