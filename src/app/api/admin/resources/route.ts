import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, isManagerRole, isMongoObjectId } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(
    await prisma.salesResource.findMany({
      include: { product: true },
      orderBy: { title: "asc" },
    }),
  );
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || !isManagerRole(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const productId = String(body.productId ?? "");
  const resourceType = String(body.resourceType ?? "Proposal");
  const title = String(body.title ?? "").trim();
  const sharePointUrl = String(body.sharePointUrl ?? "").trim();
  if (!productId || !title || !sharePointUrl) {
    return NextResponse.json(
      { error: "Product, title and SharePoint URL required" },
      { status: 400 },
    );
  }
  const resource = await prisma.salesResource.create({
    data: { productId, resourceType, title, sharePointUrl },
  });
  return NextResponse.json(resource);
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user || !isManagerRole(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const id = String(body.id ?? "");
  if (!isMongoObjectId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const updated = await prisma.salesResource.update({
    where: { id },
    data: {
      title: body.title != null ? String(body.title).trim() : undefined,
      resourceType:
        body.resourceType != null ? String(body.resourceType) : undefined,
      sharePointUrl:
        body.sharePointUrl != null
          ? String(body.sharePointUrl).trim()
          : undefined,
      productId: body.productId != null ? String(body.productId) : undefined,
      isActive: body.isActive != null ? Boolean(body.isActive) : undefined,
    },
    include: { product: true },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user || !isManagerRole(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!isMongoObjectId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  await prisma.clientRequest.updateMany({
    where: { resourceId: id },
    data: { resourceId: null },
  });
  await prisma.salesResource.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
