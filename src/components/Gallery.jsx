import { useEffect, useState } from "react";
import PhotoCard from "./PhotoCard";
import { fetchPhotos } from "../api/photos";

function SkeletonCard() {
  return <div className="w-28 h-28 bg-gray-800 rounded-lg animate-pulse" />;
}

export default function Gallery() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetchPhotos();
        if (mounted) setPhotos(res);
      } catch (err) {
        console.error("Error fetching photos:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, []);

  if (loading) {
    return (
      <div className="mt-8">
        <h2 className="text-white text-2xl font-bold mb-4 ml-2">Gallery</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
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
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
        {photos.map((p) => (
          <PhotoCard key={p.id} photo={p} />
        ))}
      </div>
    </div>
  );
}
