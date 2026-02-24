"use server";

import { redirect } from "next/navigation";

import { encodedRedirect } from "@/lib/utils";

export const signUpAction = async (_: FormData) => {
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

export const forgotPasswordAction = async (_: FormData) => {
  return encodedRedirect(
    "success",
    "/forgot-password",
    "Server reset action is deprecated. Use the web password reset form.",
  );
};

export const resetPasswordAction = async (_: FormData) => {
  return encodedRedirect(
    "success",
    "/recovery",
    "Server password update action is deprecated. Use the recovery page form.",
  );
};

export const signOutAction = async () => {
  return redirect("/login");
};
