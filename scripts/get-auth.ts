import { treaty } from "@elysiajs/eden";
import type { App } from "../src/app";
import { auth } from "../src/lib/auth";

const app = treaty<App>("http://localhost:3000");

try {
  // const res = await auth.api.signUpEmail({
  //   body: {
  //     name: "test123",
  //     email: "test123@test.com",
  //     password: "test123@test.com",
  //   },
  // });
  // console.log("Sign up successful:", res);

  const user = await auth.api.signInEmail({
    body: {
      email: "test123@test.com",
      password: "test123@test.com",
    },
  });
  console.log("Token:", user.token);
} catch (error) {
  console.log("Sign up failed:", error);
}