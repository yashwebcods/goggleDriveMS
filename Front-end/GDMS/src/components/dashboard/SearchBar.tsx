const SearchBar = () => {
  return (
    <div className="h-10 rounded-full bg-[#F1F3F4] flex items-center px-4 gap-3">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M10.5 18C14.6421 18 18 14.6421 18 10.5C18 6.35786 14.6421 3 10.5 3C6.35786 3 3 6.35786 3 10.5C3 14.6421 6.35786 18 10.5 18Z"
          stroke="#6B7280"
          strokeWidth="1.7"
        />
        <path d="M16.5 16.5L21 21" stroke="#6B7280" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
      <div className="text-sm text-gray-500">Press Ctrl + S to search Drive</div>
    </div>
  );
};

export default SearchBar;
