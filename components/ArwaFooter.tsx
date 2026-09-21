'use client'
export default function ArwaFooter() {
  return (
    <footer className="mt-10 pb-6 text-center">
      <a
        href="https://arwatravel.com"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-gray-300 hover:text-gray-500 transition-colors select-none"
        title="ARWA Travel & Tours"
      >
        <span className="opacity-40">✦</span>
        <span className="opacity-50 tracking-widest uppercase font-light">Crafted by</span>
        <span className="opacity-60 font-semibold tracking-wider">ARWA Travel</span>
        <span className="opacity-40">✦</span>
      </a>
    </footer>
  )
}
