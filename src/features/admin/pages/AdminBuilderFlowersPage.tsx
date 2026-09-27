import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { createAdminBuilderRepository } from "../data/adminBuilderRepository";
import type { AdminFlowerListItem } from "../types";

const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

export function AdminBuilderFlowersPage() {
  const repository = useMemo(() => createAdminBuilderRepository(), []);
  const [flowers, setFlowers] = useState<AdminFlowerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    repository.listFlowers().then((data) => { if (active) setFlowers(data); }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Không thể tải danh sách hoa.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [repository]);
  return (
    <section className="admin-page">
      <header className="admin-page-heading admin-page-heading--row">
        <div><span className="admin-kicker">BOUQUET BUILDER</span><h1>Hoa theo cành</h1><p>Giá, tình trạng và hình ảnh hiển thị trực tiếp trong Builder.</p></div>
        <Link className="admin-button admin-button--primary" to="/admin/builder/flowers/new">+ Thêm loại hoa</Link>
      </header>
      {error && <p className="admin-alert admin-alert--error" role="alert">{error}</p>}
      {loading ? <p className="admin-empty" aria-busy="true">Đang tải bàn hoa…</p> : flowers.length === 0 ? (
        <div className="admin-empty"><h2>Chưa có loại hoa.</h2><p>Tạo bản nháp đầu tiên để bắt đầu.</p></div>
      ) : (
        <div className="admin-product-table-wrap"><table className="admin-product-table"><thead><tr><th>Loại hoa</th><th>Trạng thái</th><th>Giá / cành</th><th>Cập nhật</th><th><span className="sr-only">Thao tác</span></th></tr></thead><tbody>{flowers.map((flower) => (
          <tr key={flower.id}>
            <td><div className="admin-product-cell">{flower.thumbnailUrl ? <img src={flower.thumbnailUrl} alt="" /> : <span className="admin-product-placeholder" aria-hidden="true">L</span>}<div><strong>{flower.name}</strong><small>{flower.stableCode}</small></div></div></td>
            <td><span className={`admin-status admin-status--${flower.visibility.toLowerCase()}`}>{flower.visibility}</span><small className="admin-table-secondary">{flower.availability}</small></td>
            <td className="admin-price">{money.format(flower.pricePerStem)}</td>
            <td><time dateTime={flower.updatedAt}>{new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(flower.updatedAt))}</time></td>
            <td><Link className="admin-row-link" to={`/admin/builder/flowers/${flower.id}`}>Sửa →</Link></td>
          </tr>
        ))}</tbody></table></div>
      )}
    </section>
  );
}
