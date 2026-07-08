import { supabaseAdmin } from "../lib/supabaseAdmin";
// POST /api/selections

const { imageId, cloudinaryPublicId, userId } = await req.json();

const { data, error } = await supabaseAdmin
  .from("image_selections")
  .upsert(
    {
      user_id: userId ?? null,
      image_id: imageId,
      cloudinary_public_id: cloudinaryPublicId,
      selected: true,
      model_status: "pending",
    },
    {
      onConflict: "user_id,image_id",
    },
  )
  .select();
