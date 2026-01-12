import SearchBar from './SearchBar';

const TopHeader = () => {
  return (
    <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
            <path
              fill="#34A853"
              d="M148.3 43.8l-39.6 68.6H27.5c-8.6 0-16.5 4.6-20.8 12.1l-3.7 6.4C-.8 138.4-.7 145.8 3 152l41.3-71.6H108l40.3-69.8c1.3-2.2 4.6-2.2 5.9 0l-5.9-10.3z"
            />
            <path
              fill="#4285F4"
              d="M244.8 124.5l-3.7-6.4c-4.3-7.5-12.2-12.1-20.8-12.1h-81.2l-39.6-68.6-3.7 6.4c-3.7 6.4-3.7 14.2 0 20.6l36.3 62.9H176l-24.3 42.1H72.1l-13.8 23.9c-1.3 2.2.3 5 2.9 5h114.3c8.6 0 16.5-4.6 20.8-12.1l48.5-84c3.7-6.3 3.7-14.1 0-20.6z"
            />
            <path
              fill="#FBBC05"
              d="M58.1 198.3l39.6-68.6h81.2c8.6 0 16.5-4.6 20.8-12.1l3.7-6.4c3.7-6.4 3.7-14.2 0-20.6l-41.3 71.6H148l-40.3 69.8c-1.3 2.2-4.6 2.2-5.9 0l5.9 10.3c3.7 6.4 10.5 10.3 17.9 10.3H79c-8.6 0-16.5-4.6-20.8-12.1l-.1-.2z"
            />
          </svg>
          <div className="text-lg font-medium text-gray-700">Drive</div>
        </div>
      </div>

      <div className="flex-1 max-w-2xl px-4">
        <SearchBar />
      </div>

      <div className="flex items-center gap-3">
        <div className="ml-1 flex items-center gap-2">
          <div className="h-9 w-9 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-xs font-semibold text-gray-700">
            PS
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopHeader;
