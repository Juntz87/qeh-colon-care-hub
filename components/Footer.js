export default function Footer(){
  return (
    <footer className="mt-12 border-t border-gray-200 dark:border-gray-700">
      <div className="max-w-6xl mx-auto px-4 py-8 text-sm text-gray-600 dark:text-gray-300">
        <div className="flex flex-col md:flex-row md:justify-between gap-4">
          <div>© {new Date().getFullYear()} QEH Colorectal Hub — For clinic use only</div>
          <div>Built for QEH by Da Jun• <a href="https://corum.com.my/" target="_blank" rel="noreferrer" className="underline">CORUM</a></div>
        </div>
      </div>
    </footer>
  )
}
