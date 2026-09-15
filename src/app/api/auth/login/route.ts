import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, verifyPassword } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const jar = await cookies();
    jar.set(SESSION_COOKIE, user.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      secure: process.env.NODE_ENV === "production",
    });

    return NextResponse.json({
      id: user.id,
      name: user.name,
      role: user.role,
      email: user.email,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
