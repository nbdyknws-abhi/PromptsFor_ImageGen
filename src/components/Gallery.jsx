import { useEffect, useState, useRef } from "react";
import PhotoCard from "./PhotoCard";
import ImageModal from "./ImageModal";
import { fetchPhotos } from "../api/photos";
import { Loader2 } from "lucide-react";

function SkeletonCard() {
  return (
    <div className="bg-white/5 rounded-xl h-64 animate-shimmer border border-white/5 mb-4" />
  );
}

const DEFAULT_PAGE_SIZE = 12;

export default function Gallery({ limit, enableInfiniteScroll = true }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [columns, setColumns] = useState(2); // Default to 2 (mobile)
  const loaderRef = useRef(null);

  const pageSize = limit || DEFAULT_PAGE_SIZE;

  // Handle Resize for Columns (match Tailwind breakpoints)
  useEffect(() => {
    // Tailwind defaults: sm: 640px, lg: 1024px, xl: 1280px
    const mediaSm = window.matchMedia("(min-width: 640px)");
    const mediaLg = window.matchMedia("(min-width: 1024px)");
    const mediaXl = window.matchMedia("(min-width: 1280px)");

    const updateColumns = () => {
      if (mediaXl.matches) setColumns(4);
      else if (mediaLg.matches) setColumns(3);
      else if (mediaSm.matches) setColumns(2);
      else setColumns(1);
    };

    updateColumns();

    mediaSm.addEventListener("change", updateColumns);
    mediaLg.addEventListener("change", updateColumns);
    mediaXl.addEventListener("change", updateColumns);

    return () => {
      mediaSm.removeEventListener("change", updateColumns);
      mediaLg.removeEventListener("change", updateColumns);
      mediaXl.removeEventListener("change", updateColumns);
    };
  }, []);

  // Fetch Photos
  useEffect(() => {
    let isMounted = true;
    const loadPhotos = async () => {
      setLoading(true);
      try {
        const offset = page * pageSize;
        const newPhotos = await fetchPhotos(pageSize, offset);

        if (isMounted) {
          setPhotos((prev) => {
            // Basic de-duplication
            if (page === 0) return newPhotos;
            const existingIds = new Set(prev.map((p) => p.id || p.$id));
            const unique = newPhotos.filter(
              (p) => !existingIds.has(p.id || p.$id),
            );
            return [...prev, ...unique];
          });
          setHasMore(newPhotos.length === pageSize);
        }
      } catch (error) {
        console.error("Error loading photos:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadPhotos();
    return () => {
      isMounted = false;
    };
  }, [page, pageSize]);

  // Infinite Scroll Observer
  useEffect(() => {
    if (!enableInfiniteScroll || !hasMore || loading || limit) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setPage((p) => p + 1);
        }
      },
      { threshold: 1.0 },
    );

    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, enableInfiniteScroll, limit]);

  // Distribute photos into columns (Left -> Right, Top -> Bottom)
  const getColumns = () => {
    const cols = Array.from({ length: columns }, () => []);
    photos.forEach((photo, index) => {
      cols[index % columns].push(photo);
    });
    return cols;
  };

  const distributedPhotos = getColumns();

  return (
    <div id="gallery" className="min-h-[20vh] mt-4">
      {loading && photos.length === 0 ? (
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} className="flex-1 space-y-4">
              {Array.from({ length: Math.ceil(pageSize / columns) }).map(
                (_, i) => (
                  <SkeletonCard key={i} />
                ),
              )}
            </div>
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <p className="text-xl">No photos yet.</p>
          <p className="text-sm">Be the first to create one!</p>
        </div>
      ) : (
        <>
          <div
            className={`flex gap-4 items-start ${columns === 1 ? "flex-col" : "flex-row"}`}
          >
            {distributedPhotos.map((columnPhotos, colIndex) => (
              <div key={colIndex} className="flex-1 space-y-4 w-full">
                {columnPhotos.map((p) => (
                  <PhotoCard
                    key={p.id || p.$id}
                    photo={p}
                    onClick={setSelectedPhoto}
                  />
                ))}
              </div>
            ))}
          </div>

          {enableInfiniteScroll && hasMore && (
            <div ref={loaderRef} className="py-12 flex justify-center">
              {loading ? (
                <div className="flex items-center gap-2 text-indigo-400">
                  <Loader2 className="animate-spin" />
                  <span>Loading more...</span>
                </div>
              ) : (
                <div className="h-4" />
              )}
            </div>
          )}
        </>
      )}

      <ImageModal
        photo={selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
      />
    </div>
  );
}
