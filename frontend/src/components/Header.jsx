import React from 'react';

function Header() {
  return (
    <header className="text-center mb-10"> {/* Increased margin bottom */}
      <h1 className="text-5xl font-bold text-purple-400 mb-2 animate-pulse"> {/* Slightly larger text, subtle pulse */}
          Linkly
      </h1>
      <p className="text-xl text-gray-400"> {/* Slightly larger text */}
          Shorten Your Looooong Links :)
      </p>
    </header>
  );
}

export default Header;