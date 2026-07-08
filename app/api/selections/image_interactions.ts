import { supabase } from "../../../src/lib/supabaseClient";

export default async function handler(req: Request, res: Response) {
  const { imageId, sessionId, eventType } = await req.json();

  const selected = eventType === "selected" ? 1 : 0;

  const { data, error } = await supabase
    .from("image_events")
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
}
