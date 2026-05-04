import Link from "next/link";

export default function PublicHeader({ logo, name, rightLogo, rightName }) {
  // If no logos are provided, we might want to hide the header entirely on some pages
  // but for now we'll just hide the image elements.
  if (!logo && !rightLogo) {
    return (
      <header className="w-full py-2 px-6 shadow bg-white/80 backdrop-blur-md sticky top-0 z-50 min-h-[4rem] flex items-center">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <Link href="/" className="text-emerald-800 font-bold hover:text-emerald-600 transition-colors">
            {name || "Home"}
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header className="w-full py-2 px-6 shadow bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        {/* Institution Logo (Left) */}
        <div className="flex items-center">
          {logo ? (
            <Link href="/" className="flex items-center">
              <img
                src={logo}
                alt={`${name} Logo`}
                className="object-contain h-12 md:h-16 w-auto drop-shadow-sm transition-transform hover:scale-105"
              />
            </Link>
          ) : (
             <Link href="/" className="text-emerald-800 font-bold hover:text-emerald-600 transition-colors">
               {name}
             </Link>
          )}
        </div>

        {/* Organisation Logo (Right) - Optional */}
        {rightLogo && (
          <div className="flex items-center">
            <img
              src={rightLogo}
              alt={rightName || "Organisation Logo"}
              className="object-contain h-12 md:h-16 w-auto drop-shadow-sm"
            />
          </div>
        )}
      </div>
    </header>
  );
}
