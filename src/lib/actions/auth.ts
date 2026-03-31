"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";

const RegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function register(formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  const validatedFields = RegisterSchema.safeParse(data);

  if (!validatedFields.success) {
    // Correctly access the error messages from Zod
    const errorMessages = validatedFields.error.issues.map((issue) => issue.message);
    return { error: errorMessages.join(". ") };
  }

  const { name, email, password } = validatedFields.data;
  const passwordHash = await bcrypt.hash(password, 10);

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) return { error: "Email already in use!" };

  await prisma.user.create({
    data: { name, email, passwordHash },
  });

  try {
    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid credentials." };
        default:
          return { error: "Something went wrong." };
      }
    }
    // We MUST re-throw the error so that Next.js can handle the redirect
    throw error;
  }
}

export async function login(formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  const parsedCredentials = z
    .object({ email: z.string().email(), password: z.string().min(6) })
    .safeParse(data);

  if (!parsedCredentials.success) {
    return { error: "Invalid email or password." };
  }

  const { email, password } = parsedCredentials.data;

  try {
    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid credentials." };
        default:
          return { error: "Something went wrong." };
      }
    }
    throw error;
  }
}
