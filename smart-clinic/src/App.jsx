import { useEffect } from "react";
import { Outlet, useLocation } from "react-router";
import Footer from "./components/shared/Footer";
import Navbar from "./components/shared/Navbar";

function App() {
  const location = useLocation();
  const isDashboardRoute = location.pathname.startsWith("/dashboard");

  useEffect(() => {
    const handleBeforePrint = () => {
      if (document.querySelector(".print-document")) {
        document.body.classList.add("print-document-active");
      }
    };
    const handleAfterPrint = () => {
      document.body.classList.remove("print-document-active");
    };

    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-base-100">
      {!isDashboardRoute && <Navbar />}
      <div className="flex-1 min-h-0">
        <Outlet />
      </div>
      {isDashboardRoute ? (
        <footer className="py-3 px-6 border-t border-slate-200/80 bg-white text-center text-[11px] text-slate-400">
          <span>© {new Date().getFullYear()} Smart Clinic • Connected Healthcare Operations Bangladesh</span>
        </footer>
      ) : (
        <Footer />
      )}
    </div>
  );
}

export default App;

