import React from 'react';
import { Navigate } from 'react-router-dom';
import { useData } from './Context';

const Protected = ({ children }) => {
  const { accesstoken } = useData();

  if (!accesstoken) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default Protected;
