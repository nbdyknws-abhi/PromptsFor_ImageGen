import React from "react";
import Gallery from "../components/Gallery";

const FullGallery = () => {
  return (
    <div className="flex flex-col gap-8 pb-12">
      <div className="text-center py-12">
        <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 mb-4 animate-fade-in-up">
          Full Collection
        </h1>
        <p className="text-gray-400 max-w-2xl mx-auto text-lg animate-fade-in-up delay-100">
          Scroll to explore endless AI creativity.
        </p>
      </div>
      <Gallery enableInfiniteScroll={true} />
    </div>
  );
};

export default FullGallery;
