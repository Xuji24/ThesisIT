'use client';

/**
 * ReactBits — FadeIn animation component.
 * Inspired by reactbits.dev motion patterns.
 * Uses framer-motion for entrance animations with configurable direction and delay.
 */
import { motion } from 'framer-motion';
import { type ReactNode } from 'react';

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  className?: string;
  duration?: number;
}

function FadeIn({ children, delay = 0, direction = 'up', className, duration = 0.4 }: FadeInProps) {
  const initial = {
    opacity: 0,
    y: direction === 'up' ? 16 : direction === 'down' ? -16 : 0,
    x: direction === 'left' ? 16 : direction === 'right' ? -16 : 0,
  };

  return (
    <motion.div
      initial={initial}
      animate={{ opacity: 1, y: 0, x: 0 }}
      transition={{
        duration,
        delay,
        ease: [0.175, 0.885, 0.32, 1.275],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * ReactBits — StaggerContainer
 * Wraps children in a staggered entrance group.
 */
function StaggerContainer({ children, className, staggerDelay = 0.08 }: { children: ReactNode; className?: string; staggerDelay?: number }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: staggerDelay },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * ReactBits — StaggerItem
 * Must be a direct child of StaggerContainer.
 */
function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 12 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.35, ease: [0.175, 0.885, 0.32, 1.275] },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export { FadeIn, StaggerContainer, StaggerItem };
