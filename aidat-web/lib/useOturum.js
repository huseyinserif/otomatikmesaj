"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./supabase";

// Giriş yoksa ana sayfaya yollar. Oturum hazır olana kadar undefined döner.
export function useOturum() {
  const [oturum, setOturum] = useState(undefined);
  const router = useRouter();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/" + (location.hash.includes("error") ? location.hash : ""));
      else setOturum(data.session);
    });
    const { data: l } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!s) router.replace("/"); else setOturum(s);
    });
    return () => l.subscription.unsubscribe();
  }, [router]);
  return oturum;
}
