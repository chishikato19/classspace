import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CalculatorContextType {
  isCalculatorVisible: boolean;
  setCalculatorVisible: (val: boolean) => void;
}

const CalculatorContext = createContext<CalculatorContextType | undefined>(undefined);

export const CalculatorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isCalculatorVisible, setCalculatorVisible] = useState(false);

  return (
    <CalculatorContext.Provider
      value={{
        isCalculatorVisible,
        setCalculatorVisible,
      }}
    >
      {children}
    </CalculatorContext.Provider>
  );
};

export const useCalculator = () => {
  const context = useContext(CalculatorContext);
  if (context === undefined) {
    throw new Error('useCalculator must be used within a CalculatorProvider');
  }
  return context;
};
