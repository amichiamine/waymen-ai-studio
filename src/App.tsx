import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, useLocation, Navigate, Outlet } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Ticker } from "@/components/Ticker";
import { FloatingWhatsApp } from "@/components/FloatingWhatsApp";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { PromoBanner } from "@/components/PromoBanner";
import { MaintenanceScreen } from "@/components/MaintenanceGate";
import { PageTransition } from "@/components/PageTransition";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useAdminState } from "@/lib/admin-store";
import { useAdminRoles } from "@/lib/admin-auth";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Home } from "lucide-react";

// Seule page conservée en import statique : NotFound est la route de repli
// universelle, la charger paresseusement ajouterait un aller-retour réseau
// précisément quand la navigation a déjà échoué.
import NotFound from "@/pages/NotFound";

// Toutes les autres pages sont chargées à la demande (`React.lazy`) : chacune
// devient un chunk séparé, ce qui sort notamment les 33 écrans d'administration
// et leurs graphiques du bundle servi au premier visiteur.

// Pages publiques
const Index = lazy(() => import("@/pages/Index"));
const About = lazy(() => import("@/pages/About"));
const Contact = lazy(() => import("@/pages/Contact"));
const Auth = lazy(() => import("@/pages/Auth"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const Search = lazy(() => import("@/pages/Search"));
const Builder = lazy(() => import("@/pages/Builder"));
const Blog = lazy(() => import("@/pages/Blog"));
const BlogArticle = lazy(() => import("@/pages/BlogArticle"));
const CategoryIndex = lazy(() => import("@/pages/CategoryIndex"));
const CategoryDetail = lazy(() => import("@/pages/CategoryDetail"));
const Product = lazy(() => import("@/pages/Product"));

// Pages authentifiées
const Account = lazy(() => import("@/pages/Account"));
const Cart = lazy(() => import("@/pages/Cart"));
const Favorites = lazy(() => import("@/pages/Favorites"));
const Checkout = lazy(() => import("@/pages/Checkout"));
const CheckoutSuccess = lazy(() => import("@/pages/CheckoutSuccess"));

// Cadre du back-office (barre latérale, en-tête admin) : chargé à la demande au
// même titre que les pages, pour que le visiteur de la boutique ne télécharge
// pas `ui/sidebar` ni les primitives Radix qui n'existent que côté admin.
const AdminShell = lazy(() => import("@/components/admin/AdminShell"));

// Pages admin
const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard"));
const AdminAnalytics = lazy(() => import("@/pages/admin/Analytics"));
const AdminAudit = lazy(() => import("@/pages/admin/Audit"));
const AdminBlogList = lazy(() => import("@/pages/admin/BlogList"));
const AdminBlogNew = lazy(() => import("@/pages/admin/BlogNew"));
const AdminBlogEdit = lazy(() => import("@/pages/admin/BlogEdit"));
const AdminBrands = lazy(() => import("@/pages/admin/Brands"));
const AdminCategories = lazy(() => import("@/pages/admin/Categories"));
const AdminCoupons = lazy(() => import("@/pages/admin/Coupons"));
const AdminCustomers = lazy(() => import("@/pages/admin/Customers"));
const AdminInventory = lazy(() => import("@/pages/admin/Inventory"));
const AdminMedia = lazy(() => import("@/pages/admin/Media"));
const AdminNotifications = lazy(() => import("@/pages/admin/Notifications"));
const AdminOrders = lazy(() => import("@/pages/admin/Orders"));
const AdminOrderDetail = lazy(() => import("@/pages/admin/OrderDetail"));
const AdminPayments = lazy(() => import("@/pages/admin/Payments"));
const AdminProducts = lazy(() => import("@/pages/admin/Products"));
const AdminProductNew = lazy(() => import("@/pages/admin/ProductNew"));
const AdminProductEdit = lazy(() => import("@/pages/admin/ProductEdit"));
const AdminReports = lazy(() => import("@/pages/admin/Reports"));
const AdminReviews = lazy(() => import("@/pages/admin/Reviews"));
const AdminSettings = lazy(() => import("@/pages/admin/Settings"));
const AdminShipping = lazy(() => import("@/pages/admin/Shipping"));
const AdminUsers = lazy(() => import("@/pages/admin/Users"));
const AdminCategoryForm = lazy(() => import("@/pages/admin/CategoryForm"));
const AdminBrandForm = lazy(() => import("@/pages/admin/BrandForm"));
const AdminProductDetail = lazy(() => import("@/pages/admin/ProductDetail"));
const AdminCategoryDetail = lazy(() => import("@/pages/admin/CategoryDetail"));
const AdminBrandDetail = lazy(() => import("@/pages/admin/BrandDetail"));
const AdminReset = lazy(() => import("@/pages/admin/Reset"));
const AdminContent = lazy(() => import("@/pages/admin/Content"));
const AdminMessages = lazy(() => import("@/pages/admin/Messages"));
const AdminSubscribers = lazy(() => import("@/pages/admin/Subscribers"));

/**
 * Indicateur d'attente unique : gardes d'authentification et repli de `Suspense`
 * partagent le même visuel pour qu'un chargement de chunk soit indiscernable
 * d'une vérification de session. `className` permet d'ajuster la hauteur selon
 * le conteneur (pleine page en admin, zone de contenu ailleurs).
 */
function RouteLoader({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground",
        className,
      )}
    >
      Chargement…
    </div>
  );
}

function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return <RouteLoader />;
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
    return <RouteLoader className="min-h-screen" />;
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
            <Link to="/">
              <Button variant="outline">
                <Home className="mr-2 h-4 w-4" /> Accueil
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }
  // Garde franchie : seulement maintenant on demande le chunk du cadre admin.
  return (
    <Suspense fallback={<RouteLoader className="min-h-screen" />}>
      <AdminShell pageFallback={<RouteLoader />} />
    </Suspense>
  );
}

export default function App() {
  const pathname = useLocation().pathname;
  const isAdmin = pathname.startsWith("/admin");
  const isAuthRoute = pathname === "/auth" || pathname === "/reset-password";
  const { siteSettings } = useAdminState();

  // Maintenance gate: full-screen for public visitors; admins & auth routes stay accessible.
  if (siteSettings.maintenance && !isAdmin && !isAuthRoute) {
    return (
      <>
        <MaintenanceScreen />
        <Toaster />
      </>
    );
  }

  return (
    <>
      {!isAdmin && <PromoBanner />}
      {!isAdmin && <Ticker />}
      {!isAdmin && <Header />}
      <main className="pb-16 md:pb-0">
        <PageTransition>
          {/* `key={pathname}` : une navigation réinitialise le filet, sinon une
              page en erreur figerait le repli sur toutes les routes suivantes. */}
          <ErrorBoundary key={pathname}>
            <Suspense fallback={<RouteLoader />}>
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
                  <Route path="content" element={<AdminContent />} />
                  <Route path="messages" element={<AdminMessages />} />
                  <Route path="subscribers" element={<AdminSubscribers />} />
                  <Route path="shipping" element={<AdminShipping />} />
                  <Route path="users" element={<AdminUsers />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </PageTransition>
      </main>
      {!isAdmin && <Footer />}
      {!isAdmin && <FloatingWhatsApp />}
      {!isAdmin && <MobileBottomBar />}
      <Toaster />
    </>
  );
}
