/* CookingPotIcon from https://lucide-animated.com/icons/cooking-pot (MIT) */
import type React from 'react'
import type { Variants } from "motion/react";
import { motion, useAnimation } from "motion/react";
import type { SVGAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";


export interface CookingPotIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface CookingPotIconProps extends SVGAttributes<SVGSVGElement> {
  size?: number;
  strokeWidth?: number | string;
}

const LID_VARIANTS: Variants = {
  normal: { rotate: 0 },
  animate: {
    rotate: [0, -14, 14, -10, 10, -6, 6, 0],
    transition: {
      duration: 0.9,
      ease: "easeInOut",
    },
  },
};

const POT_VARIANTS: Variants = {
  normal: { scale: 1 },
  animate: {
    scale: [1, 1.08, 1],
    transition: {
      duration: 0.95,
      ease: "easeInOut",
    },
  },
};

const CookingPotIcon = forwardRef<CookingPotIconHandle, CookingPotIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 24, strokeWidth = 2, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<SVGSVGElement>) => {
        if (isControlledRef.current) {
          onMouseEnter?.(e);
        } else {
          controls.start("animate");
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<SVGSVGElement>) => {
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else {
          controls.start("normal");
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <svg data-nora-animated-icon="" aria-hidden={props["aria-hidden"]} aria-label={props["aria-label"]} color={props.color} onClick={props.onClick} style={props.style} className={className} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <motion.g
            animate={controls}
            initial="normal"
            style={{ transformOrigin: "12px 16px" }}
            variants={POT_VARIANTS}
          >
            <path d="M2 12h20" />
            <path d="M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8" />
          </motion.g>
          <motion.g
            animate={controls}
            initial="normal"
            style={{ transformOrigin: "18px 6px" }}
            variants={LID_VARIANTS}
          >
            <path d="m4 8 16-4" />
            <path d="m8.86 6.78-.45-1.81a2 2 0 0 1 1.45-2.43l1.94-.48a2 2 0 0 1 2.43 1.46l.45 1.8" />
          </motion.g>
        </svg>
    );
  }
);

CookingPotIcon.displayName = "CookingPotIcon";

export { CookingPotIcon };
