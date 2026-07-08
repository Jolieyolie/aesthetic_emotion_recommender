import { supabaseAdmin } from "../../../lib/supabaseAdmin";

const NextResponse = {
  json(body: unknown, init?: { status?: number }) {
    return new Response(JSON.stringify(body), {
      status: init?.status,
      headers: { "Content-Type": "application/json" },
    });
  },
};

export async function POST(req: Request) {
  try {
    const { imageId, cloudinaryPublicId, userId } = await req.json();

    if (!imageId || !cloudinaryPublicId) {
      return NextResponse.json(
        { error: "Missing imageId or cloudinaryPublicId" },
        { status: 400 },
      );
    }

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

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      selection: data,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }
}
