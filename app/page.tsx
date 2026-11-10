"use client";

import { useRouter } from "next/navigation";
import LandingPage from "@/app/components/landing/LandingPage";

export default function Home() {
  const router = useRouter();
  return <LandingPage onOpenDashboard={() => router.push("/dashboard")} />;
}
