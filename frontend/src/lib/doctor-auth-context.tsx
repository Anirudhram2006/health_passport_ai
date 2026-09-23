"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "@/lib/api";

export interface DoctorProfileData {
  fullName?: string;
  registrationNumber: string;
  registrationAuthority?: string;
  qualification?: string;
  specialization?: string;
  hospital?: string;
  clinic?: string;
  city?: string;
  state?: string;
}

export interface DoctorVerificationData {
  status: "VERIFIED" | "PENDING" | "REJECTED" | "UNAVAILABLE" | string;
  verifiedAt?: string;
  verificationSource?: string;
  verificationReference?: string;
}

export interface DoctorUser {
  id: string;
  name: string;
  email: string;
  role: "doctor" | "admin";
  verified: boolean;
  doctorProfile?: DoctorProfileData;
  verification?: DoctorVerificationData;
}

interface DoctorAuthContextValue {
  doctorUser: DoctorUser | null;
  loading: boolean;
  doctorLogin: (loginId: string, password: string) => Promise<DoctorUser>;
  doctorRegister: (data: any) => Promise<any>;
  doctorLogout: () => void;
  verifyRegistrationNumber: (registrationNumber: string) => Promise<any>;
}

const DoctorAuthContext = createContext<DoctorAuthContextValue | null>(null);

export function DoctorAuthProvider({ children }: { children: React.ReactNode }) {
  const [doctorUser, setDoctorUser] = useState<DoctorUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("hpa_doctor_user");
      if (stored) setDoctorUser(JSON.parse(stored));
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  const persistDoctor = useCallback((u: DoctorUser) => {
    localStorage.setItem("hpa_doctor_user", JSON.stringify(u));
    setDoctorUser(u);
  }, []);

  const doctorLogin = useCallback(
    async (loginId: string, password: string) => {
      const data = await api<{ token: string; user: DoctorUser }>("/doctor/login", {
        method: "POST",
        body: JSON.stringify({ loginId, password }),
      });
      localStorage.setItem("hpa_doctor_token", data.token);
      persistDoctor(data.user);
      return data.user;
    },
    [persistDoctor]
  );

  const doctorRegister = useCallback(async (formData: any) => {
    const res = await api<{ token: string; user: DoctorUser; message: string }>("/doctor/register", {
      method: "POST",
      body: JSON.stringify(formData),
    });
    if (res.token && res.user) {
      localStorage.setItem("hpa_doctor_token", res.token);
      persistDoctor(res.user);
    }
    return res;
  }, [persistDoctor]);

  const verifyRegistrationNumber = useCallback(async (registrationNumber: string) => {
    return await api<{ status: string; verification: any }>("/doctor/verify-registration", {
      method: "POST",
      body: JSON.stringify({ registrationNumber }),
    });
  }, []);

  const doctorLogout = useCallback(() => {
    localStorage.removeItem("hpa_doctor_user");
    localStorage.removeItem("hpa_doctor_token");
    setDoctorUser(null);
  }, []);

  const value = useMemo(
    () => ({
      doctorUser,
      loading,
      doctorLogin,
      doctorRegister,
      doctorLogout,
      verifyRegistrationNumber,
    }),
    [doctorUser, loading, doctorLogin, doctorRegister, doctorLogout, verifyRegistrationNumber]
  );

  return <DoctorAuthContext.Provider value={value}>{children}</DoctorAuthContext.Provider>;
}

export function useDoctorAuth() {
  const ctx = useContext(DoctorAuthContext);
  if (!ctx) throw new Error("useDoctorAuth must be used within DoctorAuthProvider");
  return ctx;
}
