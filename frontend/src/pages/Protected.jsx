import React from 'react';
import { Navigate } from 'react-router-dom';
import { useData } from './Context';

const Protected = ({ children }) => {
  return children;
};

export default Protected;
