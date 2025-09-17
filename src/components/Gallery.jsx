import { useEffect, useState, useRef } from "react";
import PhotoCard from "./PhotoCard";
import { fetchPhotos } from "../api/photos";

function SkeletonCard() {
  return <div className="w-28 h-28 bg-gray-800 rounded-lg animate-pulse" />;
}

const PAGE_SIZE = 25;

export default function Gallery() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef(null);

  useEffect(() => {
    const loadPhotos = async () => {
      setLoading(true);
      const offset = page * PAGE_SIZE;
      const newPhotos = await fetchPhotos(PAGE_SIZE, offset);

      // ✅ prevent duplicates by filtering on $id
      setPhotos((prev) => {
        const existingIds = new Set(prev.map((p) => p.id || p.$id));
        const unique = newPhotos.filter((p) => !existingIds.has(p.id || p.$id));
        return [...prev, ...unique];
      });

      // stop if we got less than a full page
      setHasMore(newPhotos.length === PAGE_SIZE);
      setLoading(false);
    };
    loadPhotos();
  }, [page]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setPage((p) => p + 1);
        }
      },
      { threshold: 1.0 }
    );

    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading]);

  if (!photos.length && loading) {
    return (
      <div className="mt-8">
        <h2 className="text-white text-2xl font-bold mb-4 ml-2">Gallery</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!photos.length) {
    return (
      <div className="text-center mt-10 text-gray-400">
        No photos yet. Be the first to upload!
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h2 className="text-white text-2xl font-bold mb-4 ml-2">Gallery</h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
        {photos.map((p) => (
          <PhotoCard key={p.id || p.$id} photo={p} />
        ))}
      </div>

      {hasMore && (
        <div ref={loaderRef} className="text-center py-4 text-gray-400">
          {loading ? "Loading more..." : "Scroll to load more"}
        </div>
      )}
    </div>
  );
}
