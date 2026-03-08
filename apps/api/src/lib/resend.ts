import { instrumentResend } from "@kubiks/otel-resend";
import { Resend } from "resend";

export const resend = instrumentResend(new Resend(process.env.RESEND_API_KEY));
