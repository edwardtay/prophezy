import Logo from "./Logo";
import Navigation from "./Navigation";
import { AuthSection } from "./AuthSection";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header - Clean and Simple */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Logo />
            <div className="flex items-center space-x-3">
              <AuthSection />
            </div>
          </div>
        </div>
      </header>

      <Navigation />

      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1">
        {children}
      </div>

      {/* Footer - Sticky at bottom */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-auto sticky bottom-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span>Built on</span>
              <a
                href="https://www.bnbchain.org"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 font-medium text-gray-900 hover:text-black transition"
              >
                <span>BNB Chain</span>
                <span>🔗</span>
              </a>
            </div>
            <div className="hidden sm:block w-px h-4 bg-gray-300"></div>
            <div className="flex items-center gap-2">
              <span>Made by</span>
              <a
                href="https://github.com/edwardtay"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 font-medium text-gray-900 hover:text-black transition"
              >
                <span>Edward</span>
                <span>👨‍💻</span>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}



