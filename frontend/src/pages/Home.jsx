import React, { useState, useEffect, useRef } from "react";
import { useData } from "./Context";
import axios from "axios";
import { io } from "socket.io-client";
import {
  IoChevronBack,
  IoSearchOutline,
  IoAdd,
  IoSend,
  IoCheckmarkDone,
  IoChevronForward,
  IoDocumentTextOutline,
  IoChatbubbleOutline,
  IoLogOutOutline,
} from "react-icons/io5";
import { API_URL } from "../config";
import chatBg from "../assets/chat-bg.jpg";

const socket = io(API_URL);

// WhatsApp avatar color generator
const AVATAR_COLORS = [
  "bg-[#007AFF]",
  "bg-[#34C759]",
  "bg-[#FF9500]",
  "bg-[#AF52DE]",
  "bg-[#FF2D55]",
  "bg-[#5856D6]",
  "bg-[#00C7BE]",
  "bg-[#5AC8FA]",
];

const getAvatarColor = (name = "") => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const formatTime = (dateStr) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return "";
  }
};

const formatDateDivider = (dateStr) => {
  if (!dateStr) return "Today";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Today";
    return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  } catch {
    return "Today";
  }
};

const Home = () => {
  const { logout, currentuser } = useData();

  const [users, setUsers] = useState([]);
  const [chatuser, setChatuser] = useState(null);
  const [inputmsg, setInputmsg] = useState("");
  const [handledata, setHandledata] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewImage, setPreviewImage] = useState(null);

  const messagesEndRef = useRef(null);

  const myId = currentuser?._id || currentuser?.U?._id;
  const targetId = chatuser?._id || chatuser?.U?._id;

  const roomid =
    myId && targetId
      ? [String(myId), String(targetId)].sort().join("_")
      : null;

  // Filter out the logged-in user so they only chat with other users
  const filteredUsers = users
    .filter((u) => String(u._id) !== String(myId))
    .filter(
      (u) =>
        u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [handledata]);

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
      return response.data;
    } catch (error) {
      console.error("Error uploading files:", error);
      return null;
    }
  };

  // Get all users
  const getAllUser = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/all-user`);
      setUsers(response.data.users || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  // Send message
  const sendmsg = async () => {
    if ((!inputmsg.trim() && selectedFiles.length === 0) || !roomid) {
      return;
    }

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

  // Initial setup & reconnect handler
  useEffect(() => {
    getAllUser();

    const handleConnect = () => {
      if (myId) {
        socket.emit("user-id", myId);
      }
      if (roomid) {
        socket.emit("roomid", roomid);
        socket.emit("getmsg", roomid);
      }
    };

    socket.on("connect", handleConnect);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);
    };
  }, [myId, roomid]);

  // Room messages listener
  useEffect(() => {
    if (!roomid) {
      setHandledata([]);
      return;
    }

    setHandledata([]);
    socket.emit("roomid", roomid);

    const receiveOldMessages = (data) => {
      if (Array.isArray(data)) {
        setHandledata(data);
      }
    };

    const receiveMessage = (data) => {
      if (String(data.roomid) === String(roomid)) {
        setHandledata((prev) => {
          const isDuplicate = prev.some(
            (m) => m._id && data._id && String(m._id) === String(data._id)
          );
          if (isDuplicate) return prev;
          return [...prev, data];
        });
      }
    };

    socket.on("oldmsg", receiveOldMessages);
    socket.on("messages", receiveMessage);
    socket.emit("getmsg", roomid);

    return () => {
      socket.off("oldmsg", receiveOldMessages);
      socket.off("messages", receiveMessage);
    };
  }, [roomid]);

  return (
    <div className="h-screen w-screen flex bg-[#f0f2f5] font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Segoe_UI',Roboto,Helvetica,Arial,sans-serif] text-[#000000] overflow-hidden select-none">
      {/* ================= LEFT SIDEBAR (CHATS LIST) ================= */}
      <div
        className={`w-full md:w-[360px] lg:w-[380px] bg-white border-r border-[#e5e5ea] flex flex-col shrink-0 h-full ${
          chatuser ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Top Header: Logged in User Profile & Logout */}
        <div className="pt-3 px-4 pb-2 bg-white flex flex-col shrink-0 border-b border-[#e5e5ea]/50">
          <div className="flex items-center justify-between h-10 mb-1">
            {/* Current User Info */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-9 h-9 rounded-full ${getAvatarColor(
                  currentuser?.username
                )} text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-2xs`}
              >
                {currentuser?.username
                  ? currentuser.username.charAt(0).toUpperCase()
                  : "U"}
              </div>
              <div className="truncate">
                <h2 className="text-[15px] font-semibold text-black leading-tight truncate">
                  {currentuser?.username || "My Account"}
                </h2>
                <p className="text-[12px] text-[#8e8e93] leading-none truncate">
                  {currentuser?.email}
                </p>
              </div>
            </div>

            {/* Real Logout Button */}
            <button
              onClick={logout}
              className="p-2 text-[#8e8e93] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
              title="Log Out"
            >
              <IoLogOutOutline className="w-5 h-5" />
            </button>
          </div>

          {/* Chats Heading */}
          <div className="flex items-center justify-between mt-2 mb-2">
            <h1 className="text-[28px] font-bold text-black tracking-tight leading-none">
              Chats
            </h1>
            <span className="text-xs font-semibold text-[#007AFF] bg-[#007AFF]/10 px-2 py-0.5 rounded-full">
              {filteredUsers.length} {filteredUsers.length === 1 ? "contact" : "contacts"}
            </span>
          </div>

          {/* Search Bar */}
          <div className="relative mt-1 mb-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8e8e93]">
              <IoSearchOutline className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-[#767680]/12 rounded-[10px] text-[15px] placeholder-[#8e8e93] text-black focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Chats List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#e5e5ea]/60">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => {
              const isSelected = targetId === user._id;
              const avatarBg = getAvatarColor(user.username || user.email);

              return (
                <div
                  key={user._id}
                  onClick={() => setChatuser(user)}
                  className={`flex items-center px-4 py-3 cursor-pointer transition-colors ${
                    isSelected ? "bg-[#eef2f5]" : "hover:bg-[#f9f9fb]"
                  }`}
                >
                  {/* Contact Avatar */}
                  <div
                    className={`w-12 h-12 rounded-full ${avatarBg} text-white font-semibold text-lg flex items-center justify-center shrink-0 shadow-2xs mr-3`}
                  >
                    {user.username ? user.username.charAt(0).toUpperCase() : "U"}
                  </div>

                  {/* Contact Details */}
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-baseline justify-between mb-0.5">
                      <h3 className="text-[16px] font-semibold text-black truncate">
                        {user.username}
                      </h3>
                      <span className="text-[11px] text-[#34C759] font-medium shrink-0">
                        Online
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-[13px] text-[#8e8e93] truncate">
                        <IoCheckmarkDone className="w-3.5 h-3.5 text-[#34B7F1] shrink-0 mr-1" />
                        <span className="truncate">{user.email}</span>
                      </div>
                      <IoChevronForward className="w-4 h-4 text-[#c7c7cc] shrink-0 ml-1" />
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-sm text-[#8e8e93]">
              {searchQuery ? "No contacts match your search" : "No other users found"}
            </div>
          )}
        </div>
      </div>

      {/* ================= RIGHT MAIN CHAT AREA ================= */}
      <div
        className={`flex-1 flex flex-col h-full relative ${
          !chatuser ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Chat Top Header Bar */}
        <div className="h-[60px] px-3 md:px-4 bg-[#f8f8f8] border-b border-[#e5e5ea] flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-2 min-w-0">
            {/* Mobile Back Button (< chevron) */}
            <button
              onClick={() => setChatuser(null)}
              className="md:hidden flex items-center gap-1 text-[#007AFF] hover:opacity-75 transition-opacity -ml-1 pr-1 font-normal text-[17px]"
            >
              <IoChevronBack className="w-6 h-6" />
              <span>Chats</span>
            </button>

            {chatuser ? (
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-9 h-9 rounded-full ${getAvatarColor(
                    chatuser.username
                  )} text-white font-semibold text-sm flex items-center justify-center shrink-0 shadow-2xs`}
                >
                  {chatuser.username
                    ? chatuser.username.charAt(0).toUpperCase()
                    : "U"}
                </div>
                <div className="truncate">
                  <h2 className="font-semibold text-[15px] text-black leading-tight truncate">
                    {chatuser.username}
                  </h2>
                  <p className="text-[11px] text-[#34C759] font-medium leading-none mt-0.5">
                    Online
                  </p>
                </div>
              </div>
            ) : (
              <h2 className="font-semibold text-[16px] text-[#8e8e93]">
                Select a chat
              </h2>
            )}
          </div>
        </div>

        {/* Empty State when no chat is selected on desktop */}
        {!chatuser ? (
          <div
            className="hidden md:flex flex-1 flex-col items-center justify-center p-6 text-center"
            style={{
              backgroundColor: "#efeae2",
              backgroundImage: `url(${chatBg})`,
              backgroundSize: "cover",
              backgroundBlendMode: "overlay",
            }}
          >
            <div className="w-16 h-16 rounded-full bg-white/90 shadow-md flex items-center justify-center mb-3 text-[#007AFF]">
              <IoChatbubbleOutline className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-black mb-1">WhatsApp Web</h3>
            <p className="text-xs text-[#8e8e93] max-w-xs leading-relaxed">
              Select a contact from the list on the left to start chatting in real time.
            </p>
          </div>
        ) : (
          <>
            {/* Messages Scroll Area with WhatsApp Wallpaper */}
            <div
              className="flex-1 overflow-y-auto p-3 md:p-6 space-y-2 relative"
              style={{
                backgroundColor: "#efeae2",
                backgroundImage: `url(${chatBg})`,
                backgroundSize: "cover",
                backgroundBlendMode: "overlay",
              }}
            >
              {/* Date Header Pill */}
              <div className="flex justify-center my-2">
                <span className="bg-[#e1e8ed]/90 text-[#52606d] text-[11px] font-medium px-3 py-1 rounded-md shadow-2xs backdrop-blur-xs">
                  {handledata.length > 0 && handledata[0]?.createdAt
                    ? formatDateDivider(handledata[0].createdAt)
                    : "Today"}
                </span>
              </div>

              {/* Message Bubbles */}
              {handledata
                .filter((msg) => String(msg.roomid) === String(roomid))
                .map((msg, index) => {
                  const isMe = String(msg.senderid) === String(myId);

                  // Extract image & file URLs
                  const rawFiles =
                    Array.isArray(msg.file) && msg.file.length > 0
                      ? msg.file
                      : Array.isArray(msg.fileData?.files)
                      ? msg.fileData.files
                      : [];

                  const imageUrls = rawFiles
                    .map((fItem) =>
                      typeof fItem === "string" ? fItem : fItem?.image || fItem?.url
                    )
                    .filter(Boolean);

                  const hasText = Boolean(msg.msg && msg.msg.trim());
                  const hasImages = imageUrls.length > 0;

                  if (!hasText && !hasImages) return null;

                  return (
                    <div
                      key={msg._id || index}
                      className={`flex ${isMe ? "justify-end" : "justify-start"} my-1`}
                    >
                      <div
                        className={`relative px-3 py-1.5 max-w-[85%] md:max-w-md shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] text-[15px] leading-snug ${
                          isMe
                            ? "bg-[#DCF8C6] text-black rounded-2xl rounded-tr-xs"
                            : "bg-white text-black rounded-2xl rounded-tl-xs"
                        }`}
                      >
                        {/* Image Attachments */}
                        {hasImages && (
                          <div className="flex flex-col gap-1.5 mb-1">
                            {imageUrls.map((imgUrl, fIdx) => (
                              <img
                                key={fIdx}
                                src={imgUrl}
                                alt="Attachment"
                                onClick={() => setPreviewImage(imgUrl)}
                                className="rounded-lg w-full max-h-60 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                                title="Click to view full image"
                              />
                            ))}
                          </div>
                        )}

                        {/* Text Message */}
                        {hasText && (
                          <div className="break-words pr-14 select-text">
                            {msg.msg}
                          </div>
                        )}

                        {/* Timestamp & Double Checkmarks (bottom right corner of bubble) */}
                        <div className="absolute right-2 bottom-1 flex items-center gap-1 text-[11px] text-[#8e8e93]">
                          <span>{formatTime(msg.createdAt) || "10:10"}</span>
                          {isMe && (
                            <IoCheckmarkDone className="w-3.5 h-3.5 text-[#34B7F1]" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

              <div ref={messagesEndRef} />
            </div>

            {/* Selected File Previews (before sending) */}
            {selectedFiles.length > 0 && (
              <div className="bg-[#f0f2f5] border-t border-[#e5e5ea] px-4 py-2 flex flex-wrap gap-2">
                {selectedFiles.map((file, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs bg-white text-black rounded-lg border border-[#e5e5ea] shadow-2xs"
                  >
                    <IoDocumentTextOutline className="w-4 h-4 text-[#007AFF]" />
                    <span className="truncate max-w-[150px] font-medium">{file.name}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedFiles((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="text-[#8e8e93] hover:text-red-500 font-bold ml-1 text-sm"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Bottom iOS Input Bar */}
            <div className="h-[56px] px-3 bg-[#f6f6f6] border-t border-[#e5e5ea] flex items-center gap-2 shrink-0 z-20">
              {/* Real Attachment '+' Button */}
              <label
                htmlFor="file-input"
                className="text-[#007AFF] hover:opacity-75 cursor-pointer p-1 transition-opacity flex items-center justify-center shrink-0"
                title="Attach files or photos"
              >
                <IoAdd className="w-7 h-7" />
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

              {/* Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendmsg();
                }}
                className="flex-1 flex items-center gap-2"
              >
                {/* Rounded Pill Text Input */}
                <input
                  type="text"
                  placeholder="Message"
                  value={inputmsg}
                  onChange={(e) => setInputmsg(e.target.value)}
                  className="flex-1 bg-white rounded-full border border-[#d1d5db] px-4 py-1.5 text-[15px] text-black placeholder:text-[#8e8e93] focus:outline-none focus:border-[#007AFF] transition-all"
                />

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!inputmsg.trim() && selectedFiles.length === 0}
                  className="w-8 h-8 rounded-full bg-[#007AFF] hover:bg-[#0062cc] disabled:opacity-40 text-white flex items-center justify-center transition-all shrink-0 active:scale-95 cursor-pointer"
                  title="Send"
                >
                  <IoSend className="w-4 h-4 ml-0.5" />
                </button>
              </form>
            </div>
          </>
        )}
      </div>

      {/* ================= IMAGE LIGHTBOX PREVIEW ================= */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
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
                className="text-white hover:text-red-400 font-bold text-2xl px-2 focus:outline-none cursor-pointer"
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
