"use server";

import { redirect } from "next/navigation";
import { signInWithCredentials, signOut } from "@/lib/auth";

function toErrorCode(error: unknown) {
  if (!(error instanceof Error)) return "unknown";
  if (error.message.includes("INVALID_CREDENTIALS")) return "invalid";
  if (error.message.includes("INACTIVE_USER")) return "inactive";
  if (error.message.includes("AUTH_CONFIGURATION_ERROR")) return "config";
  return "unknown";
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    redirect("/login?error=missing");
  }

  try {
    await signInWithCredentials(email, password);
  } catch (error) {
    redirect(`/login?error=${toErrorCode(error)}`);
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  await signOut();
  redirect("/login");
}
