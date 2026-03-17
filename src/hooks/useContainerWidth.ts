import { useState, useEffect, useRef, useCallback } from "react";

/** ResizeObserver-baserad hook som mäter föräldracontainerns bredd */
export function useContainerWidth(): [
  (node: HTMLDivElement | null) => void,
  number,
] {
  const [width, setWidth] = useState(0);
  const observerRef = useRef<ResizeObserver | null>(null);
  const nodeRef = useRef<HTMLDivElement | null>(null);

  const ref = useCallback((node: HTMLDivElement | null) => {
    // Koppla bort tidigare observer
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    nodeRef.current = node;

    if (node) {
      // Sätt initial bredd direkt
      const rect = node.getBoundingClientRect();
      if (rect.width > 0) setWidth(rect.width);

      observerRef.current = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const cr = entry.contentRect;
          if (cr.width > 0) setWidth(cr.width);
        }
      });
      observerRef.current.observe(node);
    }
  }, []);

  // Städa upp vid unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return [ref, width];
}
