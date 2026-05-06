'use client';

import React, { createContext, useContext } from 'react';

// Create a context to store animation settings
const AnimationContext = createContext({
  disabled: false,
});

export function AnimationProvider({ children }: { children: React.ReactNode }) {
  return (
    <AnimationContext.Provider value={{ disabled: true }}>
      {children}
    </AnimationContext.Provider>
  );
}

export function useAnimationDisabled() {
  const context = useContext(AnimationContext);
  return context.disabled;
}

// Custom wrapper for framer-motion that respects the disabled setting
export function getTransitionProps(disabled: boolean) {
  if (disabled) {
    return {
      duration: 0,
      repeat: 0,
    };
  }
  return {};
}

export function getInitialState(disabled: boolean, initial: any = false) {
  // When animations are disabled, start in the "animate" state immediately
  if (disabled) {
    return false;
  }
  return initial;
}
