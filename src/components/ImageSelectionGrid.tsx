import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const IMAGE_TABLE =
  import.meta.env.VITE_SUPABASE_IMAGE_TABLE?.trim() || "images";
const TOTAL_BATCHES = 16;
const FIRST_BATCH_ID = 0;
const LAST_BATCH_ID = FIRST_BATCH_ID + TOTAL_BATCHES - 1;

type ImageItem = {
  image_id: number;
  style: number;
  motif: string;
  instance: number;
  batch_id: number;
  target_url: string;
};

function getVisitorId() {
  let visitorId = localStorage.getItem("visitor_id");

  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem("visitor_id", visitorId);
  }

  return visitorId;
}

export default function ImageSelectionGrid() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [currentBatchId, setCurrentBatchId] = useState(FIRST_BATCH_ID - 1);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loaderRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  const hasMore = currentBatchId < LAST_BATCH_ID;

  const loadBatch = useCallback(async (batchId: number) => {
    if (loadingRef.current) return;
    if (batchId > LAST_BATCH_ID) return;

    loadingRef.current = true;
    setIsLoading(true);
    setLoadError(null);

    const { data, error } = await supabase
      .from(IMAGE_TABLE)
      .select("image_id, style, motif, instance, batch_id, target_url")
      .eq("batch_id", batchId)
      .order("style", { ascending: true })
      .order("motif", { ascending: true })
      .order("instance", { ascending: true });

    loadingRef.current = false;
    setIsLoading(false);

    if (error) {
      setLoadError(
        `Could not load images from Supabase table "${IMAGE_TABLE}": ${error.message}`,
      );
      return;
    }

    const batchImages = data ?? [];

    if (batchImages.length === 0 && batchId === FIRST_BATCH_ID) {
      setLoadError(
        `No images found in "${IMAGE_TABLE}" for batch_id ${batchId}. Check the table name, batch_id values, and target_url column.`,
      );
    }

    setImages((prev) => [...prev, ...batchImages]);
    setCurrentBatchId(batchId);
  }, []);

  const loadNextBatch = useCallback(() => {
    if (loadingRef.current) return;

    const nextBatchId = currentBatchId + 1;

    if (nextBatchId <= LAST_BATCH_ID) {
      loadBatch(nextBatchId);
    }
  }, [currentBatchId, loadBatch]);

  useEffect(() => {
    loadBatch(FIRST_BATCH_ID);
  }, [loadBatch]);

  useEffect(() => {
    const loader = loaderRef.current;

    if (!loader) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];

        if (firstEntry.isIntersecting && hasMore && !loadingRef.current) {
          loadNextBatch();
        }
      },
      {
        root: null,
        rootMargin: "600px",
        threshold: 0.1,
      },
    );

    observer.observe(loader);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loadNextBatch]);

  async function handleImageClick(image: ImageItem) {
    const visitorId = getVisitorId();

    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.add(image.image_id);
      return next;
    });

    const { error } = await supabase.from("image_selections").upsert(
      {
        visitor_id: visitorId,
        image_id: image.image_id,
        style: image.style,
        motif: image.motif,
        instance: image.instance,
        batch_id: image.batch_id,
        target_url: image.target_url,
        selected: true,
      },
      {
        onConflict: "visitor_id,image_id",
      },
    );

    if (error) {
      console.error("Error saving selected image:", error.message);
    }
  }

  return (
    <div className="space-y-6">
      {loadError && (
        <div className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {!isLoading && !loadError && images.length === 0 && (
        <p className="text-sm text-gray-500">No images loaded yet.</p>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {images.map((image) => {
          const selected = selectedIds.has(image.image_id);

          return (
            <button
              key={image.image_id}
              type="button"
              onClick={() => handleImageClick(image)}
              className={[
                "relative overflow-hidden rounded-xl border-4 bg-white transition-all duration-200",
                selected
                  ? "border-orange-500 ring-4 ring-orange-200"
                  : "border-transparent hover:border-orange-300",
              ].join(" ")}
            >
              <img
                src={image.target_url}
                alt={`Style ${image.style}, motif ${image.motif}, instance ${image.instance}`}
                loading="lazy"
                decoding="async"
                className="aspect-square w-full object-cover"
              />

              {selected && (
                <div className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white shadow-md">
                  Selected
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div
        ref={loaderRef}
        className="flex min-h-16 items-center justify-center"
      >
        {isLoading && (
          <p className="text-sm text-gray-500">
            Loading batch {currentBatchId + 1}...
          </p>
        )}

        {!hasMore && !isLoading && images.length > 0 && (
          <p className="text-sm text-gray-500">All image batches loaded.</p>
        )}
      </div>
    </div>
  );
}
