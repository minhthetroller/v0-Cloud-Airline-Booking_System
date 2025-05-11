export default function ResultsLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="h-8 w-64 animate-pulse bg-gray-200 mb-4"></div>
        <div className="flex flex-wrap gap-4">
          <div className="h-6 w-32 animate-pulse bg-gray-200"></div>
          <div className="h-6 w-32 animate-pulse bg-gray-200"></div>
        </div>
      </div>

      <div className="grid gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg bg-white p-6 shadow-md animate-pulse">
            <div className="h-24 bg-gray-200 mb-4"></div>
            <div className="h-12 bg-gray-200"></div>
          </div>
        ))}
      </div>
    </div>
  )
}
