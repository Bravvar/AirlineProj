export default function Logo() {
  return (
    <div className="flex items-center gap-2 cursor-pointer transition-transform hover:scale-105">
      <img 
        src="/Coog10Logo.png" 
        alt="Coog10 Logo" 
        className="h-12 md:h-14 w-auto object-contain drop-shadow-lg" 
      />
    </div>
  );
}