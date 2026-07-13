import { NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function POST() {
  revalidateTag("business", "default");
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
