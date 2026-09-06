import React from 'react';

export function F1Header({ activeTab, setActiveTab, activeSubTab, setActiveSubTab }) {
  return (
    <header className="w-full shrink-0 flex flex-col z-20 shadow-md">
      {/* Top Red Bar */}
      <div className="h-[44px] bg-[#9e0500] flex items-center px-4 justify-between border-b border-[#780400]">
        {/* F1 Logo & Session Title */}
        <div className="flex items-center gap-3">
          {/* F1 Vector Logo */}
          <div className="flex items-center gap-1">
            <svg className="h-[18px] w-auto fill-white" viewBox="0 0 100 24">
              <path d="M 0 20 L 12 0 L 28 0 L 16 20 Z M 20 20 L 32 0 L 48 0 L 36 20 Z M 52 0 L 38 20 L 52 20 L 60 8 L 84 8 L 82 12 L 68 12 L 64 16 L 80 16 L 76 20 L 96 20 L 100 0 Z" />
            </svg>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-white font-extrabold text-[0.78rem] tracking-wider uppercase font-mono">
              F1 LIVE SESSION
            </span>
            <span className="text-[#ffb3b1] text-[0.62rem] tracking-wide font-medium">
              FP3 & QUALIFYING — SIMULATION
            </span>
          </div>
        </div>

        {/* Center Primary Navigation Tabs */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab('LEADERBOARD')}
            className={`flex items-center gap-2 text-[0.74rem] font-bold tracking-wider uppercase transition-colors ${
              activeTab === 'LEADERBOARD' ? 'text-white' : 'text-[#ffb5b3] hover:text-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" strokeWidth="2" />
              <polyline points="12 6 12 12 16 14" strokeWidth="2" />
            </svg>
            LEADERBOARD
          </button>

          <button
            onClick={() => setActiveTab('DRIVER TRACKER')}
            className={`flex items-center gap-2 text-[0.74rem] font-bold tracking-wider uppercase transition-colors ${
              activeTab === 'DRIVER TRACKER' ? 'text-white' : 'text-[#ffb5b3] hover:text-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            DRIVER TRACKER
          </button>

          <button
            onClick={() => setActiveTab('COMMENTARY')}
            className={`flex items-center gap-2 text-[0.74rem] font-bold tracking-wider uppercase transition-colors ${
              activeTab === 'COMMENTARY' ? 'text-white' : 'text-[#ffb5b3] hover:text-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            COMMENTARY
          </button>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-4 text-white">
          <button className="hover:text-[#ffd6d6] transition-colors" title="Settings">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button className="hover:text-[#ffd6d6] transition-colors" title="Close">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Sub-bar with LIVE indicator and Secondary Tabs */}
      <div className="h-[34px] bg-[#141822] flex items-center px-4 border-b border-[#232838] justify-between text-[0.72rem]">
        <div className="flex items-center gap-6">
          {/* LIVE indicator */}
          <div className="flex items-center gap-1.5 font-bold text-white tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#e10600] animate-pulse"></span>
            <span className="text-[#e10600]">LIVE</span>
          </div>

          {/* Sub tabs */}
          <div className="flex items-center gap-8 text-[#98a1b6] font-semibold">
            {['Laps', 'Sectors', 'Head to Head', 'Telemetry'].map((tab) => {
              const isActive = activeSubTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveSubTab(tab)}
                  className={`h-[34px] flex items-center transition-colors relative ${
                    isActive ? 'text-white font-bold' : 'hover:text-white'
                  }`}
                >
                  {tab}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#e10600]"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Status Pill */}
        <div className="text-[0.65rem] text-[#6e778e] font-mono flex items-center gap-2">
          <span>SIGNAL: CONNECTED</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
        </div>
      </div>
    </header>
  );
}
