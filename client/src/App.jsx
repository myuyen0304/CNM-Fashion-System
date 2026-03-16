import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

// Auth pages
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";

// Product pages
import HomePage from "./pages/product/HomePage";
import SearchPage from "./pages/product/SearchPage";
import ProductDetailPage from "./pages/product/ProductDetailPage";

// Cart & Order pages
import CartPage from "./pages/cart/CartPage";
import CheckoutPage from "./pages/order/CheckoutPage";
import OrderHistoryPage from "./pages/order/OrderHistoryPage";
import OrderDetailPage from "./pages/order/OrderDetailPage";
import PaymentResultPage from "./pages/payment/PaymentResultPage";

// User pages
import ProfilePage from "./pages/profile/ProfilePage";
import ChatPage from "./pages/chat/ChatPage";

function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <Layout>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/products/:id" element={<ProductDetailPage />} />
              <Route path="/payment/result" element={<PaymentResultPage />} />

              {/* Protected routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/orders" element={<OrderHistoryPage />} />
                <Route path="/order-detail/:id" element={<OrderDetailPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/chat/:id" element={<ChatPage />} />
              </Route>
            </Routes>
          </Layout>
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
