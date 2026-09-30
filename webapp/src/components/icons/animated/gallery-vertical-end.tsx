/* GalleryVerticalEndIcon from https://lucide-animated.com/icons/gallery-vertical-end (MIT) */
import type React from 'react'
import type { Variants } from "motion/react";
import { motion, useAnimation } from "motion/react";
import type { SVGAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";


export interface GalleryVerticalEndIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface GalleryVerticalEndIconProps extends SVGAttributes<SVGSVGElement> {
  size?: number;
  strokeWidth?: number | string;
}

const PATH_VARIANTS: Variants = {
  normal: {
    translateY: 0,
    opacity: 1,
    transition: {
      type: "tween",
      stiffness: 200,
      damping: 13,
    },
  },
  animate: (i: number) => ({
    translateY: [2 * i, 0],
    opacity: [0, 1],
    transition: {
      delay: 0.25 * (2 - i),
      type: "tween",
      stiffness: 200,
      damping: 13,
    },
  }),
};

const GalleryVerticalEndIcon = forwardRef<
  GalleryVerticalEndIconHandle,
  GalleryVerticalEndIconProps
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
          custom={1}
          d="M7 2h10"
          variants={PATH_VARIANTS}
        />
        <motion.path
          animate={controls}
          custom={2}
          d="M5 6h14"
          variants={PATH_VARIANTS}
        />
        <rect height="12" rx="2" width="18" x="3" y="10" />
      </svg>
  );
});

GalleryVerticalEndIcon.displayName = "GalleryVerticalEndIcon";

export { GalleryVerticalEndIcon };
