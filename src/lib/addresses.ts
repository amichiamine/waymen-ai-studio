import { useEffect, useState, useCallback } from "react";

export type UserAddress = {
  id: string;
  label: string; // "Domicile", "Bureau", etc.
  fullName: string;
  phone: string;
  wilaya: string; // wilaya code
  address: string;
  isDefault?: boolean;
};

const KEY = (uid: string) => `katech.addresses.v1.${uid || "guest"}`;

function read(uid: string): UserAddress[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(KEY(uid)) ?? "[]"); } catch { return []; }
}
function write(uid: string, list: UserAddress[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY(uid), JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("katech:addresses-changed", { detail: uid }));
}

export function useAddresses(userId: string | undefined) {
  const uid = userId ?? "guest";
  const [list, setList] = useState<UserAddress[]>(() => read(uid));

  useEffect(() => {
    setList(read(uid));
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (!d || d === uid) setList(read(uid));
    };
    window.addEventListener("katech:addresses-changed", handler);
    return () => window.removeEventListener("katech:addresses-changed", handler);
  }, [uid]);

  const upsert = useCallback((a: UserAddress) => {
    const cur = read(uid);
    let next = cur.slice();
    const idx = next.findIndex((x) => x.id === a.id);
    if (idx >= 0) next[idx] = a; else next.push(a);
    if (a.isDefault) next = next.map((x) => ({ ...x, isDefault: x.id === a.id }));
    if (!next.some((x) => x.isDefault) && next.length) next[0].isDefault = true;
    write(uid, next);
  }, [uid]);

  const remove = useCallback((id: string) => {
    const cur = read(uid).filter((x) => x.id !== id);
    if (!cur.some((x) => x.isDefault) && cur.length) cur[0].isDefault = true;
    write(uid, cur);
  }, [uid]);

  const setDefault = useCallback((id: string) => {
    const cur = read(uid).map((x) => ({ ...x, isDefault: x.id === id }));
    write(uid, cur);
  }, [uid]);

  const defaultAddress = list.find((x) => x.isDefault) ?? list[0];

  return { list, upsert, remove, setDefault, defaultAddress };
}

export function newAddressId() {
  return `addr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
}
