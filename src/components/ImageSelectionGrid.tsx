import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Check } from "lucide-react";

const IMAGE_TABLE =
  import.meta.env.VITE_SUPABASE_IMAGE_TABLE?.trim() || "images";
const EVENT_TABLE =
  import.meta.env.VITE_SUPABASE_EVENT_TABLE?.trim() || "image_event";
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
type ImageEventType = "seen" | "selected" | "deselected";

export default function ImageSelectionGrid() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [currentBatchId, setCurrentBatchId] = useState(FIRST_BATCH_ID - 1);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const sessionIdRef = useRef(crypto.randomUUID());
  const selectedIdsRef = useRef<Set<number>>(new Set());
  const imageButtonRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const imageByIdRef = useRef<Map<number, ImageItem>>(new Map());
  const visibleImageIdsRef = useRef<Set<number>>(new Set());
  const seenLoggedRef = useRef<Set<number>>(new Set());
  const interactedImageIdsRef = useRef<Set<number>>(new Set());
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);
  const hasMore = currentBatchId < LAST_BATCH_ID;
  console.log("[session] current session id:", sessionIdRef.current);
  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  useEffect(() => {
    imageByIdRef.current = new Map(
      images.map((image) => [image.image_id, image]),
    );
  }, [images]);

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

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const element = entry.target as HTMLElement;
          const imageId = Number(element.dataset.imageId);

          if (!Number.isFinite(imageId)) return;

          if (entry.isIntersecting) {
            visibleImageIdsRef.current.add(imageId);
            return;
          }

          const wasVisible = visibleImageIdsRef.current.has(imageId);

          visibleImageIdsRef.current.delete(imageId);

          if (!wasVisible) return;
          if (selectedIdsRef.current.has(imageId)) return;
          if (seenLoggedRef.current.has(imageId)) return;
          if (interactedImageIdsRef.current.has(imageId)) return;

          const image = imageByIdRef.current.get(imageId);

          if (!image) return;

          seenLoggedRef.current.add(imageId);
          void logImageEvent(image, "seen");
        });
      },
      {
        root: null,
        threshold: 0.5,
      },
    );

    imageButtonRefs.current.forEach((button) => {
      observer.observe(button);
    });

    return () => {
      observer.disconnect();
    };
  }, [images]);

  async function logImageEvent(
    image: ImageItem,
    eventType: "seen" | "selected" | "deselected",
  ) {
    const { error } = await supabase.from("image_event").insert({
      image_id: image.image_id,
      session_id: sessionIdRef.current,
      event_type: eventType,
      batch_id: image.batch_id,
    });

    if (error) {
      console.error("Error logging image event:", error.message);
    }
  }
  //test
  /* async function logImageEvent(image: ImageItem, eventType: ImageEventType) {
    const payload = {
      image_id: image.image_id,
      session_id: sessionIdRef.current,
      event_type: eventType,
      batch_id: image.batch_id,
    };

    console.log("[image_event] inserting payload:", payload);

    const { data, error } = await supabase
      .from("image_event")
      .insert(payload)
      .select();

    if (error) {
      console.error("[image_event] insert failed:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return;
    }

    console.log("[image_event] insert success:", data);
  } */
  //test end
  //test
  /* async function handleImageClick(image: ImageItem) {
    console.log("[click] image clicked:", image);

    const wasSelected = selectedIdsRef.current.has(image.image_id);
    const nextSelected = !wasSelected;
    const eventType: ImageEventType = nextSelected ? "selected" : "deselected";

    console.log("[click] selection state:", {
      image_id: image.image_id,
      wasSelected,
      nextSelected,
      eventType,
      session_id: sessionIdRef.current,
    });

    interactedImageIdsRef.current.add(image.image_id);

    const nextIds = new Set(selectedIdsRef.current);

    if (nextSelected) {
      nextIds.add(image.image_id);
    } else {
      nextIds.delete(image.image_id);
    }

    selectedIdsRef.current = nextIds;
    setSelectedIds(nextIds);

    await logImageEvent(image, eventType);
  } */
  //test end

  async function handleImageClick(image: ImageItem) {
    const wasSelected = selectedIdsRef.current.has(image.image_id);
    const nextSelected = !wasSelected;
    const eventType: ImageEventType = nextSelected ? "selected" : "deselected";
    interactedImageIdsRef.current.add(image.image_id);
    const nextIds = new Set(selectedIdsRef.current);

    if (nextSelected) {
      nextIds.add(image.image_id);
    } else {
      nextIds.delete(image.image_id);
    }

    selectedIdsRef.current = nextIds;
    setSelectedIds(nextIds);

    await logImageEvent(image, eventType);
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
              ref={(node) => {
                if (node) {
                  imageButtonRefs.current.set(image.image_id, node);
                } else {
                  imageButtonRefs.current.delete(image.image_id);
                }
              }}
              data-image-id={image.image_id}
              type="button"
              aria-pressed={selected}
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
                <div
                  aria-label="Selected"
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-white shadow-md"
                >
                  <Check className="h-4 w-4" strokeWidth={3} />
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
