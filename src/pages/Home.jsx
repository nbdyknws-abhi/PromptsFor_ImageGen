import React from "react";
import Gallery from "../components/Gallery";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const Home = () => {
  return (
    <div className="flex flex-col gap-8 pb-12">
      <div className="text-center py-12">
        <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 mb-4 animate-fade-in-up">
          See It. Copy It. Recreate It.
        </h1>
        <p className="text-gray-400 max-w-3xl mx-auto text-lg animate-fade-in-up delay-100">
         See how each image was made.
Copy the prompt. Use your own photo. Recreate the look.
        </p>
      </div>

      <Gallery limit={8} enableInfiniteScroll={false} />

      <div className="flex justify-center mt-8">
        <Link
          to="/gallery"
          className="group flex items-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white font-semibold transition-all hover:scale-105"
        >
          View Full Gallery
          <ArrowRight
            size={20}
            className="group-hover:translate-x-1 transition-transform"
          />
        </Link>
      </div>
    </div>
  );
};

export default Home;
