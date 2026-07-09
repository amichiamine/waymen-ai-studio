import { useEffect } from "react";
import { Routes, Route, useLocation, Navigate, Outlet } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Ticker } from "@/components/Ticker";
import { FloatingWhatsApp } from "@/components/FloatingWhatsApp";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "@/lib/auth";
import { useAdminRoles } from "@/lib/admin-auth";
import { AdminSidebar, AdminMobileNav, AdminBreadcrumbs, AdminRoleSwitcher, AdminNotificationBell } from "@/components/admin/AdminLayout";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Home } from "lucide-react";

// Pages publiques
import Index from "@/pages/Index";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Auth from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";
import Search from "@/pages/Search";
import Builder from "@/pages/Builder";
import Blog from "@/pages/Blog";
import BlogArticle from "@/pages/BlogArticle";
import CategoryIndex from "@/pages/CategoryIndex";
import CategoryDetail from "@/pages/CategoryDetail";
import Product from "@/pages/Product";
import NotFound from "@/pages/NotFound";

// Pages authentifiées
import Account from "@/pages/Account";
import Cart from "@/pages/Cart";
import Favorites from "@/pages/Favorites";
import Checkout from "@/pages/Checkout";
import CheckoutSuccess from "@/pages/CheckoutSuccess";

// Pages admin
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminAnalytics from "@/pages/admin/Analytics";
import AdminAudit from "@/pages/admin/Audit";
import AdminBlogList from "@/pages/admin/BlogList";
import AdminBlogNew from "@/pages/admin/BlogNew";
import AdminBlogEdit from "@/pages/admin/BlogEdit";
import AdminBrands from "@/pages/admin/Brands";
import AdminCategories from "@/pages/admin/Categories";
import AdminCoupons from "@/pages/admin/Coupons";
import AdminCustomers from "@/pages/admin/Customers";
import AdminInventory from "@/pages/admin/Inventory";
import AdminMedia from "@/pages/admin/Media";
import AdminNotifications from "@/pages/admin/Notifications";
import AdminOrders from "@/pages/admin/Orders";
import AdminOrderDetail from "@/pages/admin/OrderDetail";
import AdminPayments from "@/pages/admin/Payments";
import AdminProducts from "@/pages/admin/Products";
import AdminProductNew from "@/pages/admin/ProductNew";
import AdminProductEdit from "@/pages/admin/ProductEdit";
import AdminReports from "@/pages/admin/Reports";
import AdminReviews from "@/pages/admin/Reviews";
import AdminSettings from "@/pages/admin/Settings";
import AdminShipping from "@/pages/admin/Shipping";
import AdminUsers from "@/pages/admin/Users";
import AdminCategoryForm from "@/pages/admin/CategoryForm";
import AdminBrandForm from "@/pages/admin/BrandForm";
import AdminProductDetail from "@/pages/admin/ProductDetail";
import AdminCategoryDetail from "@/pages/admin/CategoryDetail";
import AdminBrandDetail from "@/pages/admin/BrandDetail";
import AdminReset from "@/pages/admin/Reset";
import AdminContent from "@/pages/admin/Content";


function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        Chargement…
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace state={{ from: location }} />;
  return <Outlet />;
}

function AdminLayout() {
  const { isAdmin, loading, user } = useAdminRoles();
  const location = useLocation();
  useEffect(() => {
    document.title = "Admin — KA Tech";
  }, []);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Chargement…</div>;
  }
  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-xl font-bold">Zone réservée à l'équipe admin</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Vous devez être connecté avec un compte administrateur pour accéder au back-office.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link to="/"><Button variant="outline"><Home className="mr-2 h-4 w-4" /> Accueil</Button></Link>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-border/60 bg-card/50 px-3 lg:px-8">
          <AdminMobileNav />
          <AdminBreadcrumbs />
          <div className="ml-auto flex items-center gap-2">
            <AdminRoleSwitcher />
            <AdminNotificationBell />
            <Link to="/" className="text-sm text-primary hover:underline">← Boutique</Link>
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const pathname = useLocation().pathname;
  const isAdmin = pathname.startsWith("/admin");

  return (
    <>
      {!isAdmin && <Ticker />}
      {!isAdmin && <Header />}
      <main className="pb-16 md:pb-0">
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/search" element={<Search />} />
          <Route path="/builder" element={<Builder />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogArticle />} />
          <Route path="/category" element={<CategoryIndex />} />
          <Route path="/category/:slug" element={<CategoryDetail />} />
          <Route path="/product/:id" element={<Product />} />

          <Route element={<RequireAuth />}>
            <Route path="/account" element={<Account />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/checkout/success" element={<CheckoutSuccess />} />
          </Route>

          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="audit" element={<AdminAudit />} />
            <Route path="blog" element={<AdminBlogList />} />
            <Route path="blog/new" element={<AdminBlogNew />} />
            <Route path="blog/:id" element={<AdminBlogEdit />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="categories/new" element={<AdminCategoryForm mode="new" />} />
            <Route path="categories/:slug/view" element={<AdminCategoryDetail />} />
            <Route path="categories/:slug" element={<AdminCategoryForm mode="edit" />} />
            <Route path="brands" element={<AdminBrands />} />
            <Route path="brands/new" element={<AdminBrandForm mode="new" />} />
            <Route path="brands/:id/view" element={<AdminBrandDetail />} />
            <Route path="brands/:id" element={<AdminBrandForm mode="edit" />} />
            <Route path="reset" element={<AdminReset />} />
            <Route path="coupons" element={<AdminCoupons />} />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="inventory" element={<AdminInventory />} />
            <Route path="media" element={<AdminMedia />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="orders/:id" element={<AdminOrderDetail />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="products/new" element={<AdminProductNew />} />
            <Route path="products/:id/view" element={<AdminProductDetail />} />
            <Route path="products/:id" element={<AdminProductEdit />} />

            <Route path="reports" element={<AdminReports />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="shipping" element={<AdminShipping />} />
            <Route path="users" element={<AdminUsers />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!isAdmin && <Footer />}
      {!isAdmin && <FloatingWhatsApp />}
      {!isAdmin && <MobileBottomBar />}
      <Toaster />
    </>
  );
}
