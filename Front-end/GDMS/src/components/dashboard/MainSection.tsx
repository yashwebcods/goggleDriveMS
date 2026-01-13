import type { FileRow, QuickAccessItem, SuggestedCard } from './types';

type MainSectionProps = {
  quickAccess: QuickAccessItem[];
  suggested: SuggestedCard[];
  files: FileRow[];
};

const MainSection = ({ quickAccess, suggested, files }: MainSectionProps) => {
  return (
    <main className="flex-1 min-w-0 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-lg font-medium text-gray-800">My Drive</div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M7 10L12 15L17 10"
                stroke="#6B7280"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="flex items-center gap-2 text-gray-500">
            <div className="h-9 w-9 rounded-full hover:bg-white/70 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 7H20" stroke="#6B7280" strokeWidth="1.7" strokeLinecap="round" />
                <path d="M4 12H20" stroke="#6B7280" strokeWidth="1.7" strokeLinecap="round" />
                <path d="M4 17H20" stroke="#6B7280" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </div>
            <div className="h-9 w-9 rounded-full hover:bg-white/70 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 4H10V10H4V4Z" stroke="#6B7280" strokeWidth="1.7" />
                <path d="M14 4H20V10H14V4Z" stroke="#6B7280" strokeWidth="1.7" />
                <path d="M4 14H10V20H4V14Z" stroke="#6B7280" strokeWidth="1.7" />
                <path d="M14 14H20V20H14V14Z" stroke="#6B7280" strokeWidth="1.7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="text-xs font-semibold text-gray-500">Quick access</div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-3">
              {quickAccess.map((item) => (
                <div
                  key={item.title}
                  className="h-12 rounded-lg bg-white shadow-sm border border-gray-100 flex items-center gap-3 px-3"
                >
                  <div className="h-7 w-7 rounded bg-gray-100 flex items-center justify-center">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 7H10L12 9H20V19H4V7Z" stroke="#94A3B8" strokeWidth="1.7" />
                    </svg>
                  </div>
                  <div className="text-xs text-gray-700 font-medium truncate">{item.title}</div>
                </div>
              ))}
            </div>

            {suggested.map((card) => (
              <div key={card.title} className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-sm ${card.badge}`} />
                      <div className="text-[11px] font-medium text-gray-700 whitespace-pre-line leading-4">
                        {card.title}
                      </div>
                    </div>
                    <div className="h-7 w-7 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-semibold text-gray-700">
                      PS
                    </div>
                  </div>
                </div>
                <div className="h-28 bg-gray-50 border-t border-gray-100 flex items-center justify-center">
                  <div className="h-20 w-28 rounded bg-white border border-gray-200 shadow-sm" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-gray-500">Files</div>
            <div className="text-xs text-gray-400">Last opened by you</div>
          </div>

          <div className="mt-3 bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
            <div className="grid grid-cols-12 px-4 py-3 text-[11px] text-gray-500">
              <div className="col-span-6">Name</div>
              <div className="col-span-2">Location</div>
              <div className="col-span-2">Owner</div>
              <div className="col-span-2">Last modified</div>
            </div>
            <div className="h-px bg-gray-100" />
            {files.map((f, idx) => (
              <div
                key={f.id || `${f.name}-${idx}`}
                className={`grid grid-cols-12 px-4 py-3 text-sm items-center border-t border-gray-50 ${
                  f.selected ? 'bg-[#E8F0FE]' : 'bg-white'
                }`}
              >
                <div className="col-span-6 flex items-center gap-3 min-w-0">
                  <div className={`truncate ${f.selected ? 'text-blue-700 font-medium' : 'text-gray-800'}`}>{f.name}</div>
                </div>
                <div className="col-span-2 text-xs text-gray-600">{f.location}</div>
                <div className="col-span-2 flex items-center gap-2 text-xs text-gray-600">
                  <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-semibold text-gray-700">
                    PS
                  </div>
                  {f.owner}
                </div>
                <div className="col-span-2 text-xs text-gray-600">{f.modified}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
};

export default MainSection;
