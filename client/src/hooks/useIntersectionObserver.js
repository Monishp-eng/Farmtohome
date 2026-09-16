import { useEffect, useRef } from 'react';

export const useIntersectionObserver = (onIntersect, options = { threshold: 0.1, rootMargin: '100px' }) => {
  const targetRef = useRef(null);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        onIntersect();
      }
    }, options);

    observer.observe(target);

    return () => {
      if (target) observer.unobserve(target);
    };
  }, [onIntersect, options.threshold, options.rootMargin]);

  return targetRef;
};

export default useIntersectionObserver;
