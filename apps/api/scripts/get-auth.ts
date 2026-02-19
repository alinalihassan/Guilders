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
  console.log("Token for test123@test.com:", user.token);

  const user2 = await auth.api.signInEmail({
    body: {
      email: "test1234@test.com",
      password: "test1234@test.com",
    },
  });
  console.log("Token for test1234@test.com:", user2.token);
} catch (error) {
  console.log("Sign up failed:", error);
}