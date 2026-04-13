import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import CustomerFacingRoute from "./components/CustomerFacingRoute";
import ScrollToTop from "./components/ScrollToTop";

// Auth pages
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage";

// Product pages
import HomePage from "./pages/product/HomePage";
import ShopPage from "./pages/product/ShopPage";
import CollectionPage from "./pages/product/CollectionPage";
import FashionNewsPage from "./pages/product/FashionNewsPage";
import SearchPage from "./pages/product/SearchPage";
import ProductDetailPage from "./pages/product/ProductDetailPage";
import AboutUsPage from "./pages/help/AboutUsPage";
import CustomerSupportPage from "./pages/help/CustomerSupportPage";
import CareersPage from "./pages/help/CareersPage";
import PolicyPage from "./pages/help/PolicyPage";

// Cart & Order pages
import CartPage from "./pages/cart/CartPage";
import CheckoutPage from "./pages/order/CheckoutPage";
import OrderHistoryPage from "./pages/order/OrderHistoryPage";
import OrderDetailPage from "./pages/order/OrderDetailPage";
import PaymentResultPage from "./pages/payment/PaymentResultPage";

// User pages
import ProfilePage from "./pages/profile/ProfilePage";
import ChatPage from "./pages/chat/ChatPage";
import StaffDashboardPage from "./pages/staff/StaffDashboardPage";
import UsersManagementPage from "./pages/staff/UsersManagementPage";
import ProductsManagementPage from "./pages/staff/ProductsManagementPage";
import OrdersManagementPage from "./pages/staff/OrdersManagementPage";
import SupportChatPage from "./pages/staff/SupportChatPage";

function App() {
  return (
    <Router>
      <ScrollToTop />
      <AuthProvider>
        <CartProvider>
          <Layout>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route
                path="/verify-email/:token"
                element={<VerifyEmailPage />}
              />

              <Route element={<CustomerFacingRoute />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/home" element={<HomePage />} />
                <Route path="/Home" element={<HomePage />} />

                <Route path="/shop" element={<ShopPage />} />
                <Route path="/danh-muc" element={<ShopPage />} />
                <Route path="/Danh-muc" element={<ShopPage />} />

                <Route path="/bo-suu-tap" element={<CollectionPage />} />
                <Route path="/Bo-suu-tap" element={<CollectionPage />} />

                <Route
                  path="/tin-tuc-thoi-trang"
                  element={<FashionNewsPage />}
                />
                <Route path="/tin-tuc" element={<FashionNewsPage />} />
                <Route path="/Tin-tuc" element={<FashionNewsPage />} />

                <Route
                  path="/khuyen-mai"
                  element={<Navigate to="/search?q=khuyến%20mãi" replace />}
                />
                <Route
                  path="/Khuyen-mai"
                  element={<Navigate to="/khuyen-mai" replace />}
                />

                <Route path="/tro-giup" element={<AboutUsPage />} />
                <Route path="/Tro-giup" element={<AboutUsPage />} />
                <Route path="/ve-chung-toi" element={<AboutUsPage />} />
                <Route
                  path="/cham-soc-khach-hang"
                  element={<CustomerSupportPage />}
                />
                <Route path="/tuyen-dung-viec-lam" element={<CareersPage />} />
                <Route path="/chinh-sach" element={<PolicyPage />} />

                <Route path="/search" element={<SearchPage />} />
                <Route path="/products/:id" element={<ProductDetailPage />} />
                <Route path="/payment/result" element={<PaymentResultPage />} />
              </Route>

              {/* Protected routes */}
              <Route element={<CustomerFacingRoute />}>
                <Route element={<ProtectedRoute />}>
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/orders" element={<OrderHistoryPage />} />
                  <Route
                    path="/order-detail/:id"
                    element={<OrderDetailPage />}
                  />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/chat" element={<ChatPage />} />
                  <Route path="/chat/:id" element={<ChatPage />} />
                </Route>
              </Route>

              {/* Staff routes */}
              <Route
                element={
                  <ProtectedRoute
                    allowedRoles={["admin", "supervisor", "employee"]}
                  />
                }
              >
                <Route path="/staff" element={<StaffDashboardPage />} />
                <Route
                  path="/staff/orders"
                  element={<OrdersManagementPage />}
                />
                <Route path="/staff/support" element={<SupportChatPage />} />
              </Route>

              {/* Supervisor + Admin routes */}
              <Route
                element={
                  <ProtectedRoute allowedRoles={["admin", "supervisor"]} />
                }
              >
                <Route
                  path="/staff/products"
                  element={<ProductsManagementPage />}
                />
              </Route>

              {/* Admin only routes */}
              <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
                <Route path="/admin/users" element={<UsersManagementPage />} />
              </Route>
            </Routes>
          </Layout>
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
