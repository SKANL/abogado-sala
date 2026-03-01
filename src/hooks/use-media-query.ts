import { useEffect, useState, startTransition } from "react";

export function useMediaQuery(query: string) {
  const [value, setValue] = useState(false);

  useEffect(() => {
    function onChange(event: MediaQueryListEvent) {
      setValue(event.matches);
    }

    const result = matchMedia(query);
    result.addEventListener("change", onChange);
    // Use startTransition to avoid synchronous setState in effect
    startTransition(() => setValue(result.matches));

    return () => result.removeEventListener("change", onChange);
  }, [query]);

  return value;
}
