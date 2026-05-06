/**
 * Animation Configuration
 * Set ANIMATIONS_ENABLED to false to disable heavy animations
 */

// Toggle animations on/off
const ANIMATIONS_ENABLED = false;

export const animationConfig = {
  enabled: ANIMATIONS_ENABLED,
  // Default duration when animations are disabled
  disabledDuration: 0,
  // Variants wrapper for Framer Motion - returns no animation variants if disabled
  getVariants: (variants: any) => {
    if (!ANIMATIONS_ENABLED) {
      return {};
    }
    return variants;
  },
  // Transition config
  getTransition: (transition: any = {}) => {
    if (!ANIMATIONS_ENABLED) {
      return { duration: 0 };
    }
    return transition;
  },
  // Wrapper for initial state
  getInitial: (initial: any = false) => {
    if (!ANIMATIONS_ENABLED) {
      return false; // Show final state immediately
    }
    return initial;
  },
};

export default animationConfig;
