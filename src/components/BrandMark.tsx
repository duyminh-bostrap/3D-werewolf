import React from 'react';

export function BrandMark() {
  return (
    <div className="flex flex-col items-center gap-1 py-2 text-center">
      <img src="/assets/huyet-nguyet-logo.png" alt="" className="h-20 w-20 object-contain drop-shadow-[0_4px_14px_rgba(206,49,34,0.35)]" />
      <h1 className="brand-wordmark brand-title" lang="en">
        <span>Bloodmoon</span>
        <span className="brand-subtitle">Village</span>
      </h1>
      <div aria-hidden="true" className="flex w-40 items-center gap-2"><span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#c79b50]" /><span className="h-1.5 w-1.5 rotate-45 bg-[#efc77a]" /><span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#c79b50]" /></div>
    </div>
  );
}
