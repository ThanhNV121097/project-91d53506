import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/** A section as it enters: 16px up over 0.6s, once. Still under reduced motion. */
export default function Reveal({ children, delay = 0, className = "" }: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const still = useReducedMotion();
  if (still) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.2, 0.7, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}
