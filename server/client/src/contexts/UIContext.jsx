import React, { createContext, useContext, useState } from 'react';

const UIContext = createContext();

export const UIProvider = ({ children }) => {
  const [activeTool, setActiveTool] = useState(null);

  const openTool = (toolName) => {
    setActiveTool(toolName);
  };

  const closeTool = () => {
    setActiveTool(null);
  };

  return (
    <UIContext.Provider value={{ activeTool, openTool, closeTool }}>
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};
