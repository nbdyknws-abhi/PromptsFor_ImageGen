import React from "react";

const InstagramIcon = ({ className = "w-5 h-5" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    className={className}
    aria-hidden="true"
  >
    <rect x="3" y="3" width="18" height="18" rx="5" ry="5" strokeWidth="1.5" />
    <path
      d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"
      strokeWidth="1.5"
    />
    <path d="M17.5 6.5h.01" strokeWidth="2" />
  </svg>
);

const MailIcon = ({ className = "w-5 h-5" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M3 8.5v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeWidth="1.5" />
    <polyline points="21 8.5 12 13 3 8.5" strokeWidth="1.5" />
  </svg>
);

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="relative z-10 mt-12 border-t border-gray-800 bg-gray-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-center md:text-left">
          <p className="text-sm text-gray-300">
            Made by{" "}
            <span className="font-medium text-white">Abhishek Verma</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">
            © {year} Abhishek Verma. All rights reserved.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <a
            href="https://instagram.com/nobodyknows_abhishek"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-gray-800/60 hover:bg-gray-800/80 transition-colors text-indigo-300"
            aria-label="Instagram — nobodyknows_abhishek"
          >
            <InstagramIcon />
            <span className="text-sm hidden sm:inline">
              @nobodyknows_abhishek
            </span>
          </a>

          <a
            href="mailto:abhishekverma.dev@yahoo.com"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-gray-800/60 hover:bg-gray-800/80 transition-colors text-indigo-300"
            aria-label="Email — abhishekverma.dev@yahoo.com"
          >
            <MailIcon />
            <span className="text-sm hidden sm:inline">
              abhishekverma.dev@yahoo.com
            </span>
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
