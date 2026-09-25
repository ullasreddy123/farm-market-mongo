import { Routes, Route } from "react-router-dom";
import Welcome from "./pages/Welcome";
import ProtectedRoute from "./components/ProtectedRoute";

// Farmer pages
import FarmerLogin from "./pages/farmer/FarmerLogin";
import FarmerRegister from "./pages/farmer/FarmerRegister";
import FarmerForgotPassword from "./pages/farmer/FarmerForgotPassword";
import FarmerDashboard from "./pages/farmer/FarmerDashboard";
import AddCrop from "./pages/farmer/AddCrop";
import MyList from "./pages/farmer/MyList";
import IncomingOrders from "./pages/farmer/IncomingOrders";

// Trader pages
import TraderLogin from "./pages/trader/TraderLogin";
import TraderRegister from "./pages/trader/TraderRegister";
import TraderForgotPassword from "./pages/trader/TraderForgotPassword";
import TraderDashboard from "./pages/trader/TraderDashboard";
import CropListPage from "./pages/trader/CropListPage";
import CropDetails from "./pages/trader/CropDetails";
import CartPage from "./pages/trader/CartPage";
import OrderSuccess from "./pages/trader/OrderSuccess";
import MyOrders from "./pages/trader/MyOrders";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Welcome />} />

      {/* Farmer routes */}
      <Route path="/farmer/login" element={<FarmerLogin />} />
      <Route path="/farmer/register" element={<FarmerRegister />} />
      <Route path="/farmer/forgot-password" element={<FarmerForgotPassword />} />
      <Route
        path="/farmer/dashboard"
        element={
          <ProtectedRoute role="farmer">
            <FarmerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/farmer/add-crop"
        element={
          <ProtectedRoute role="farmer">
            <AddCrop />
          </ProtectedRoute>
        }
      />
      <Route
        path="/farmer/my-list"
        element={
          <ProtectedRoute role="farmer">
            <MyList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/farmer/orders"
        element={
          <ProtectedRoute role="farmer">
            <IncomingOrders />
          </ProtectedRoute>
        }
      />

      {/* Trader routes */}
      <Route path="/trader/login" element={<TraderLogin />} />
      <Route path="/trader/register" element={<TraderRegister />} />
      <Route path="/trader/forgot-password" element={<TraderForgotPassword />} />
      <Route
        path="/trader/dashboard"
        element={
          <ProtectedRoute role="trader">
            <TraderDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/trader/category/:categoryId"
        element={
          <ProtectedRoute role="trader">
            <CropListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/trader/crop/:cropId"
        element={
          <ProtectedRoute role="trader">
            <CropDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/trader/cart"
        element={
          <ProtectedRoute role="trader">
            <CartPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/trader/order-success"
        element={
          <ProtectedRoute role="trader">
            <OrderSuccess />
          </ProtectedRoute>
        }
      />
      <Route
        path="/trader/orders"
        element={
          <ProtectedRoute role="trader">
            <MyOrders />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
