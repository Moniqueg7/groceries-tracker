import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: NextRequest) {
  const { monthlyBudget } = await request.json();
  if (!monthlyBudget || monthlyBudget < 0) {
    return NextResponse.json({ error: "Invalid budget" }, { status: 400 });
  }
  const settings = await prisma.settings.upsert({
    where: { id: "default" },
    create: { id: "default", monthlyBudget },
    update: { monthlyBudget },
  });
  return NextResponse.json(settings);
}
