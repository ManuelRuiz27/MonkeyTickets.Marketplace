import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import EventSelect from './pages/EventSelect';
import Scanner from './pages/Scanner';

function App() {
  const isAuthenticated = () => {
    return !!localStorage.getItem('token');
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/events"
          element={isAuthenticated() ? <EventSelect /> : <Navigate to="/login" />}
        />
        <Route
          path="/scanner/:eventId"
          element={isAuthenticated() ? <Scanner /> : <Navigate to="/login" />}
        />
        <Route path="/" element={<Navigate to="/events" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
