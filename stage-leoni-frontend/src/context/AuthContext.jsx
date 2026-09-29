import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('leoni_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const loginWithBadge = async (badgeId) => {
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login-badge', { badgeId });
      if (res.data.success) {
        const userData = {
          badgeId: res.data.badgeId,
          role: res.data.role,
          salleAttribuee: res.data.salleAttribuee || null
        };
        setUser(userData);
        localStorage.setItem('leoni_user', JSON.stringify(userData));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('leoni_user');
  };

  return (
    <AuthContext.Provider value={{ user, loginWithBadge, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);