import { useEffect, useState } from "react";

export const PHONE_QUERY = "(max-width: 639px)";

export function isPhone() {
  return typeof window !== "undefined" && window.matchMedia(PHONE_QUERY).matches;
}

export function usePhone() {
  const [phone, setPhone] = useState(isPhone);
  useEffect(() => {
    const mq = window.matchMedia(PHONE_QUERY);
    const on = () => setPhone(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return phone;
}
