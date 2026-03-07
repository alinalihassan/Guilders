import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import { encodedRedirect } from "@/lib/utils";

export const signUpAction = createServerFn({ method: "POST" }).handler(async () => {
  encodedRedirect(
    "success",
    "/sign-up",
    "Server signup action is deprecated. Use the web signup form.",
  );
});

export const signInAction = createServerFn({ method: "POST" })
  .inputValidator((data: FormData) => data)
  .handler(async ({ data }) => {
    return {
      error: true,
      message: "Server sign in action is deprecated. Use the web login form.",
      redirect: data.get("redirect")?.toString() || "/",
    };
  });

export const forgotPasswordAction = createServerFn({ method: "POST" }).handler(async () => {
  encodedRedirect(
    "success",
    "/forgot-password",
    "Server reset action is deprecated. Use the web password reset form.",
  );
});

export const resetPasswordAction = createServerFn({ method: "POST" }).handler(async () => {
  encodedRedirect(
    "success",
    "/recovery",
    "Server password update action is deprecated. Use the recovery page form.",
  );
});

export const signOutAction = createServerFn({ method: "POST" }).handler(async () => {
  throw redirect({ to: "/login" });
});
