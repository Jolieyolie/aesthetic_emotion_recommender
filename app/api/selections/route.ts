import { NextResponse } from "next/server";
import { supabase } from "../../../src/lib/supabaseClient";

type EventType = "seen" | "selected" | "deselected";

export async function POST(req: Request) {
  try {
    const {
      imageId,
      sessionId,
      eventType,
    }: {
      imageId: number;
      sessionId: string;
      eventType: EventType;
    } = await req.json();

    if (!imageId || !sessionId || !eventType) {
      return NextResponse.json(
        { error: "Missing imageId, sessionId, or eventType" },
        { status: 400 },
      );
    }

    if (!["seen", "selected", "deselected"].includes(eventType)) {
      return NextResponse.json({ error: "Invalid eventType" }, { status: 400 });
    }

    const selected = eventType === "selected" ? 1 : 0;

    const { data, error } = await supabase
      .from("image_interactions")
      .upsert(
        {
          session_id: sessionId,
          image_id: imageId,
          event_type: eventType,
          selected,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "session_id,image_id",
        },
      )
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      interaction: data,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }
}
