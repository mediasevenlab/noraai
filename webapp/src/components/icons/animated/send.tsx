/* SendIcon from https://lucide-animated.com/icons/send (MIT) */
import type React from 'react'
import { motion, useAnimation } from "motion/react";
import type { SVGAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

export interface SendIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface SendIconProps extends SVGAttributes<SVGSVGElement> {
  size?: number;
  strokeWidth?: number | string;
}

const SendIcon = forwardRef<SendIconHandle, SendIconProps>(
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
      <svg data-nora-animated-icon="" aria-hidden={props["aria-hidden"]} aria-label={props["aria-label"]} color={props.color} onClick={props.onClick} style={props.style} className={[className, "overflow-visible"].filter(Boolean).join(" ")} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}
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
            transition={{ duration: 0.5 }}
            variants={{
              normal: { x: 0, y: 0, scale: 1 },
              animate: {
                x: 3,
                y: -3,
                scale: 0.8,
              },
            }}
          >
            <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
            <path d="m21.854 2.147-10.94 10.939" />
          </motion.g>
          <motion.path
            animate={controls}
            d="M -3 28 C -0.5 26.8 1.6 24.6 3.3 22 C 4.8 19.7 5.2 17.6 4.2 16.1 C 3.2 14.7 1.4 14.5 0.3 15.8 C -0.9 17.2 -0.6 19.4 1.2 20.4 C 3.4 21.5 6.4 19.4 9 15.8"
            fill="none"
            initial={{ opacity: 0, pathLength: 0 }}
            stroke="currentColor"
            strokeDasharray="2 2"
            strokeWidth="1"
            transition={{ duration: 0.55, delay: 0.1 }}
            variants={{
              normal: {
                pathLength: 0,
                opacity: 0,
                translateX: -3,
                translateY: 3,
                transition: { duration: 0.3 },
              },
              animate: {
                pathLength: 1,
                opacity: 1,
                translateX: 0,
                translateY: 0,
              },
            }}
          />
        </svg>
    );
  }
);

SendIcon.displayName = "SendIcon";

export { SendIcon };
