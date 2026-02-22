"use server";

import { encodedRedirect } from "@/lib/utils";
import { redirect } from "next/navigation";

export const signUpAction = async (formData: FormData) => {
  return encodedRedirect(
    "success",
    "/sign-up",
    "Server signup action is deprecated. Use the web signup form.",
  );
};

export async function signInAction(formData: FormData) {
  return {
    error: true,
    message: "Server sign in action is deprecated. Use the web login form.",
    redirect: formData.get("redirect")?.toString() || "/",
  };
}

export const forgotPasswordAction = async (formData: FormData) => {
  return encodedRedirect(
    "success",
    "/forgot-password",
    "Server reset action is deprecated. Use the web password reset form.",
  );
};

export const resetPasswordAction = async (formData: FormData) => {
  return encodedRedirect(
    "success",
    "/recovery",
    "Server password update action is deprecated. Use the recovery page form.",
  );
};

export const signOutAction = async () => {
  return redirect("/login");
};
