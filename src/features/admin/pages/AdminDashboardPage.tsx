import { Link } from "react-router-dom";
import { useAdminAuth } from "../auth/AdminAuthContext";

export function AdminDashboardPage() {
  const auth = useAdminAuth();
  return (
    <section className="admin-page admin-dashboard">
      <header className="admin-page-heading">
        <div><span className="admin-kicker">ATELIER DESK</span><h1>Chào {auth.profile?.displayName || "bạn"}.</h1></div>
        <p>Quản lý Homepage, Product và Builder bằng dữ liệu thật trong Supabase.</p>
      </header>
      <div className="admin-action-panel">
        <div><span>01</span><h2>Sản phẩm & hình ảnh</h2><p>Tạo bản nháp, nhập nội dung VI/KO, quản lý giá, taxonomy và gallery.</p></div>
        <Link className="admin-button admin-button--primary" to="/admin/products">Mở danh sách sản phẩm</Link>
      </div>
      <div className="admin-action-panel">
        <div><span>02</span><h2>Nội dung Homepage</h2><p>Chỉnh copy VI/KO, ảnh, Best Sellers và Gallery trong các slot cố định.</p></div>
        <Link className="admin-button admin-button--primary" to="/admin/homepage">Mở Homepage Admin</Link>
      </div>
    </section>
  );
}
