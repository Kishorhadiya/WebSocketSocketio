import React from 'react'
import Home from "./pages/Home"
import Login from "./pages/login"
import Register from "./pages/register"
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Protected from './pages/Protected';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        
        <Route path="/" element={<Protected><Home /></Protected>} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App