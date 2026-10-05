/** Diagramsymbolen: visar att ett klick öppnar diagram och karta */
export default function DiagramIkon({ className = "kt-mer" }: { className?: string }) {
  return (
    <svg className={className} width="15" height="13" viewBox="0 0 15 13" fill="none" stroke="currentColor"
         strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1.5 1v10.5H14" /><path d="M4 8.5l2.8-3.2 2.4 2L13 2.5" />
    </svg>
  );
}
