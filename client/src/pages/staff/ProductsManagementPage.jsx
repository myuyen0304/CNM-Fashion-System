import { useEffect, useMemo, useState } from "react";
import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../contexts/AuthContext";
import LoadingSpinner from "../../components/LoadingSpinner";
import StaffLayout from "../../components/StaffLayout";

const emptyForm = {
  name: "",
  category: "",
  price: "",
  stock: "",
  status: "active",
  sizes: "",
  images: "",
  description: "",
};

const toCommaText = (value) => (Array.isArray(value) ? value.join(", ") : "");

const toList = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const buildProductPayload = (form) => ({
  name: form.name.trim(),
  category: form.category.trim(),
  price: Number(form.price),
  stock: Number(form.stock),
  status: form.status,
  sizes: toList(form.sizes),
  images: toList(form.images),
  description: form.description.trim(),
});

const PencilIcon = () => (
  <svg
    aria-hidden="true"
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.862 4.487 19.5 7.125m-1.319-3.957a1.875 1.875 0 0 1 2.651 2.651L7.5 19.151 3.75 20.25l1.099-3.75L18.181 3.168Z"
    />
  </svg>
);

const TrashIcon = () => (
  <svg
    aria-hidden="true"
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 7h12m-9 0V5.75A1.75 1.75 0 0 1 10.75 4h2.5A1.75 1.75 0 0 1 15 5.75V7m-7 0 .75 12A2 2 0 0 0 10.75 21h2.5a2 2 0 0 0 2-1.875L16 7M10 11v6m4-6v6"
    />
  </svg>
);

export default function ProductsManagementPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [renameFrom, setRenameFrom] = useState("");
  const [renameTo, setRenameTo] = useState("");
  const [deleteName, setDeleteName] = useState("");
  const [moveTo, setMoveTo] = useState("");
  const [keyword, setKeyword] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingProductId, setEditingProductId] = useState(null);
  const canManageCategories = user?.role === "supervisor";

  const loadProducts = async (targetPage = page) => {
    try {
      setLoading(true);
      const res = await axiosClient.get("/products", {
        params: { page: targetPage },
      });
      const data = res.data?.data || {};
      setProducts(data.products || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      alert(err.response?.data?.message || "Không thể tải sản phẩm");
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await axiosClient.get("/products/admin/categories");
      setCategories(res.data?.data || []);
    } catch (err) {
      alert(err.response?.data?.message || "Không thể tải danh mục");
    }
  };

  useEffect(() => {
    loadProducts(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    loadCategories();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingProductId(null);
  };

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validateProductForm = () => {
    if (!form.name.trim() || !form.category.trim()) {
      alert("Vui lòng nhập tên sản phẩm và danh mục.");
      return false;
    }

    const price = Number(form.price);
    const stock = Number(form.stock);
    if (!Number.isFinite(price) || price < 0) {
      alert("Giá sản phẩm không hợp lệ.");
      return false;
    }
    if (!Number.isFinite(stock) || stock < 0) {
      alert("Tồn kho không hợp lệ.");
      return false;
    }

    return true;
  };

  const handleSubmitProduct = async (event) => {
    event.preventDefault();
    if (!validateProductForm()) return;

    const payload = buildProductPayload(form);

    try {
      setSaving(true);
      if (editingProductId) {
        await axiosClient.put(`/products/${editingProductId}`, payload);
      } else {
        await axiosClient.post("/products", payload);
      }
      resetForm();
      await Promise.all([loadProducts(page), loadCategories()]);
    } catch (err) {
      alert(
        err.response?.data?.message ||
          (editingProductId ? "Không thể cập nhật sản phẩm" : "Không thể thêm sản phẩm"),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEditProduct = (product) => {
    setEditingProductId(product._id);
    setForm({
      name: product.name || "",
      category: product.category || "",
      price: product.price ?? "",
      stock: product.stock ?? "",
      status: product.status || "active",
      sizes: toCommaText(product.sizes),
      images: toCommaText(product.images),
      description: product.description || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteProduct = async (product) => {
    if (!window.confirm(`Xóa sản phẩm "${product.name}"?`)) return;

    try {
      await axiosClient.delete(`/products/${product._id}`);
      if (editingProductId === product._id) resetForm();
      await Promise.all([loadProducts(page), loadCategories()]);
    } catch (err) {
      alert(err.response?.data?.message || "Không thể xóa sản phẩm");
    }
  };

  const updateStock = async (productId, stock) => {
    try {
      await axiosClient.patch(`/products/${productId}/stock`, { stock });
      loadProducts(page);
    } catch (err) {
      alert(err.response?.data?.message || "Không thể cập nhật tồn kho");
    }
  };

  const handleRenameCategory = async () => {
    if (!renameFrom || !renameTo) return;
    if (!window.confirm(`Đổi tên danh mục "${renameFrom}" thành "${renameTo}"?`))
      return;
    try {
      await axiosClient.patch("/products/admin/categories/rename", {
        fromName: renameFrom,
        toName: renameTo,
      });
      setRenameFrom("");
      setRenameTo("");
      loadProducts(page);
      loadCategories();
    } catch (err) {
      alert(err.response?.data?.message || "Không thể đổi tên danh mục");
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteName) return;
    if (
      !window.confirm(
        `Chuyển toàn bộ sản phẩm từ danh mục "${deleteName}" sang "${
          moveTo || "Khác"
        }"?`,
      )
    )
      return;
    try {
      await axiosClient.delete(`/products/admin/categories/${encodeURIComponent(deleteName)}`, {
        data: { moveTo: moveTo || undefined },
      });
      setDeleteName("");
      setMoveTo("");
      loadProducts(page);
      loadCategories();
    } catch (err) {
      alert(err.response?.data?.message || "Không thể chuyển danh mục");
    }
  };

  const filteredProducts = useMemo(
    () =>
      keyword
        ? products.filter((item) => {
            const haystack = `${item.name} ${item.category}`.toLowerCase();
            return haystack.includes(keyword.toLowerCase());
          })
        : products,
    [keyword, products],
  );

  if (loading) return <LoadingSpinner />;

  return (
    <StaffLayout
      title="Quản Lý Sản Phẩm & Hàng Tồn Kho"
      subtitle="Quản lý tồn kho và danh mục sản phẩm"
    >
      <form className="card p-4 mb-4" onSubmit={handleSubmitProduct}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="font-semibold">
            {editingProductId ? "Sửa Sản Phẩm" : "Thêm Sản Phẩm"}
          </h2>
          {editingProductId && (
            <button type="button" className="btn-secondary" onClick={resetForm}>
              Hủy Sửa
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <input
            className="input-field"
            placeholder="Tên sản phẩm"
            value={form.name}
            onChange={(e) => updateForm("name", e.target.value)}
          />
          <input
            className="input-field"
            placeholder="Danh mục"
            value={form.category}
            onChange={(e) => updateForm("category", e.target.value)}
          />
          <input
            type="number"
            min={0}
            className="input-field"
            placeholder="Giá"
            value={form.price}
            onChange={(e) => updateForm("price", e.target.value)}
          />
          <input
            type="number"
            min={0}
            className="input-field"
            placeholder="Tồn kho"
            value={form.stock}
            onChange={(e) => updateForm("stock", e.target.value)}
          />
          <select
            className="input-field"
            value={form.status}
            onChange={(e) => updateForm("status", e.target.value)}
          >
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </select>
          <input
            className="input-field"
            placeholder="Size, ví dụ: S, M, L"
            value={form.sizes}
            onChange={(e) => updateForm("sizes", e.target.value)}
          />
          <input
            className="input-field xl:col-span-2"
            placeholder="URL ảnh, cách nhau bằng dấu phẩy"
            value={form.images}
            onChange={(e) => updateForm("images", e.target.value)}
          />
          <textarea
            className="input-field md:col-span-2 xl:col-span-4 min-h-24"
            placeholder="Mô tả sản phẩm"
            value={form.description}
            onChange={(e) => updateForm("description", e.target.value)}
          />
        </div>

        <div className="mt-4 flex justify-end">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving
              ? "Đang lưu..."
              : editingProductId
                ? "Cập Nhật Sản Phẩm"
                : "Thêm Sản Phẩm"}
          </button>
        </div>
      </form>

      <div className="card p-4 mb-4">
        <div className="flex gap-2">
          <input
            className="input-field"
            placeholder="Tìm kiếm theo tên sản phẩm/danh mục"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <button className="btn-secondary" onClick={() => setKeyword("")}>
            Xóa
          </button>
        </div>
      </div>

      {canManageCategories && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="card p-4">
            <h2 className="font-semibold mb-3">Đổi Tên Danh Mục</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                className="input-field"
                placeholder="Từ danh mục"
                value={renameFrom}
                onChange={(e) => setRenameFrom(e.target.value)}
              />
              <input
                className="input-field"
                placeholder="Sang danh mục"
                value={renameTo}
                onChange={(e) => setRenameTo(e.target.value)}
              />
              <button className="btn-primary" onClick={handleRenameCategory}>
                Đổi Tên
              </button>
            </div>
          </div>

          <div className="card p-4">
            <h2 className="font-semibold mb-3">Chuyển Danh Mục</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                className="input-field"
                placeholder="Từ danh mục"
                value={deleteName}
                onChange={(e) => setDeleteName(e.target.value)}
              />
              <input
                className="input-field"
                placeholder="Sang danh mục (mặc định: Khác)"
                value={moveTo}
                onChange={(e) => setMoveTo(e.target.value)}
              />
              <button className="btn-primary" onClick={handleDeleteCategory}>
                Chuyển
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card p-4 mb-6">
        <h2 className="font-semibold mb-3">Danh Mục Hiện Tại</h2>
        <div className="flex flex-wrap gap-2">
          {categories.map((item) => (
            <span
              key={item.name}
              className="px-3 py-1 bg-gray-100 border rounded text-sm"
            >
              {item.name} ({item.productCount})
            </span>
          ))}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full table-fixed">
          <colgroup>
            <col className="w-[38%]" />
            <col className="w-[11%]" />
            <col className="w-[10%]" />
            <col className="w-[9%]" />
            <col className="w-[10%]" />
            <col className="w-[13%]" />
            <col className="w-[9%]" />
          </colgroup>
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4">Sản Phẩm</th>
              <th className="text-left py-3 px-3">Danh Mục</th>
              <th className="text-left py-3 px-3">Giá</th>
              <th className="text-left py-3 px-3">Tồn Kho</th>
              <th className="text-left py-3 px-3">Trạng Thái</th>
              <th className="text-left py-3 px-3">Cập Nhật Tồn Kho</th>
              <th className="text-left py-3 px-3">Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => (
              <tr key={product._id} className="border-b">
                <td className="py-3 px-4">
                  <div className="font-medium break-words">{product.name}</div>
                  <div className="text-xs text-gray-500 break-all">{product._id}</div>
                </td>
                <td className="py-3 px-3 break-words">{product.category}</td>
                <td className="py-3 px-3">
                  {Number(product.price || 0).toLocaleString("vi-VN")}₫
                </td>
                <td className="py-3 px-3">{product.stock}</td>
                <td className="py-3 px-3">{product.status}</td>
                <td className="py-3 px-3">
                  <input
                    type="number"
                    min={0}
                    className="border rounded px-2 py-1 w-full max-w-24"
                    defaultValue={product.stock}
                    onBlur={(e) => {
                      const nextValue = Number(e.target.value);
                      if (Number.isFinite(nextValue) && nextValue >= 0) {
                        updateStock(product._id, nextValue);
                      } else {
                        e.target.value = product.stock;
                      }
                    }}
                  />
                </td>
                <td className="py-3 px-3">
                  <div className="flex min-w-[80px] items-center gap-2">
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-white transition-colors hover:bg-yellow-600"
                      onClick={() => handleEditProduct(product)}
                      title="Sửa sản phẩm"
                      aria-label={`Sửa sản phẩm ${product.name}`}
                    >
                      <PencilIcon />
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-danger text-white transition-colors hover:bg-red-600"
                      onClick={() => handleDeleteProduct(product)}
                      title="Xóa sản phẩm"
                      aria-label={`Xóa sản phẩm ${product.name}`}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            className="btn-secondary px-4 py-2 disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage((prev) => prev - 1)}
          >
            Trước
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            className="btn-secondary px-4 py-2 disabled:opacity-50"
            disabled={page >= totalPages}
            onClick={() => setPage((prev) => prev + 1)}
          >
            Tiếp Theo
          </button>
        </div>
      )}
    </StaffLayout>
  );
}
