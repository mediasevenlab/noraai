/* ChevronsUpDownIcon from https://lucide-animated.com/icons/chevrons-up-down (MIT) */
import type React from 'react'
import type { Transition } from "motion/react";
import { motion, useAnimation } from "motion/react";
import type { SVGAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";


export interface ChevronsUpDownIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface ChevronsUpDownIconProps extends SVGAttributes<SVGSVGElement> {
  size?: number;
  strokeWidth?: number | string;
}

const DEFAULT_TRANSITION: Transition = {
  type: "spring",
  stiffness: 250,
  damping: 25,
};

const ChevronsUpDownIcon = forwardRef<
  ChevronsUpDownIconHandle,
  ChevronsUpDownIconProps
>(({ onMouseEnter, onMouseLeave, className, size = 24, strokeWidth = 2, ...props }, ref) => {
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
        <motion.path
          animate={controls}
          d="m7 15 5 5 5-5"
          initial="normal"
          transition={DEFAULT_TRANSITION}
          variants={{
            normal: { translateY: "0%" },
            animate: { translateY: "2px" },
          }}
        />
        <motion.path
          animate={controls}
          d="m7 9 5-5 5 5"
          initial="normal"
          transition={DEFAULT_TRANSITION}
          variants={{
            normal: { translateY: "0%" },
            animate: { translateY: "-2px" },
          }}
        />
      </svg>
  );
});

ChevronsUpDownIcon.displayName = "ChevronsUpDownIcon";

export { ChevronsUpDownIcon };
