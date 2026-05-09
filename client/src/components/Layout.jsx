import { useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import BreadcrumbBar from "./BreadcrumbBar";
import ChatWidget from "./ChatWidget";
import { useAuth } from "../contexts/AuthContext";

export default function Layout({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const showFooter = user?.role !== "admin";
  const hideBreadcrumb = user?.role === "admin";
  const isCustomer = user?.role === "customer";
  const isOnChatPage = location.pathname.startsWith("/chat");

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <BreadcrumbBar hidden={hideBreadcrumb} />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {children}
      </main>
      {showFooter && <Footer />}
      {isCustomer && !isOnChatPage && <ChatWidget />}
    </div>
  );
}
