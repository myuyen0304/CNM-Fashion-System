import Navbar from "./Navbar";
import Footer from "./Footer";
import BreadcrumbBar from "./BreadcrumbBar";
import { useAuth } from "../contexts/AuthContext";

export default function Layout({ children }) {
  const { user } = useAuth();
  const showFooter = user?.role !== "admin";
  const hideBreadcrumb = user?.role === "admin";

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <BreadcrumbBar hidden={hideBreadcrumb} />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  );
}
