import React from 'react';
import { Navigate } from 'react-router-dom';
import { useData } from './Context';

const Protected = ({ children }) => {
  const { accesstoken } = useData();

  // Redirect to login if no valid access token is available
  if (!accesstoken || accesstoken === 'guest_token') {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default Protected;
