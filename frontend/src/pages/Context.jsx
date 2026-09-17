import React, { useState, createContext, useContext } from 'react';

const ContextData = createContext();

const Context = ({ children }) => {
  const [currentuser, setCurrentuserState] = useState(() => {
    const saved = sessionStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const [accesstoken, setAccesstokenState] = useState(() => {
    return sessionStorage.getItem('token') || '';
  });

  const setCureentuser = (user) => {
    setCurrentuserState(user);
    if (user) {
      sessionStorage.setItem('user', JSON.stringify(user));
    } else {
      sessionStorage.removeItem('user');
    }
  };

  const setAccesstoken = (token) => {
    setAccesstokenState(token);
    if (token) {
      sessionStorage.setItem('token', token);
    } else {
      sessionStorage.removeItem('token');
    }
  };

  const logout = () => {
    setAccesstoken('');
    setCureentuser(null);
  };

  return (
    <ContextData.Provider
      value={{
        accesstoken,
        setAccesstoken,
        logout,
        currentuser,
        setCureentuser,
      }}
    >
      {children}
    </ContextData.Provider>
  );
};

export const useData = () => {
  return useContext(ContextData);
};

export default Context;