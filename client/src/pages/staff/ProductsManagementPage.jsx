import { useEffect, useState } from "react";
import axiosClient from "../../api/axiosClient";
import LoadingSpinner from "../../components/LoadingSpinner";
import StaffLayout from "../../components/StaffLayout";

export default function ProductsManagementPage() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [renameFrom, setRenameFrom] = useState("");
  const [renameTo, setRenameTo] = useState("");
  const [deleteName, setDeleteName] = useState("");
  const [moveTo, setMoveTo] = useState("");
  const [keyword, setKeyword] = useState("");

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
      alert(err.response?.data?.message || "Cannot load products");
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await axiosClient.get("/products/admin/categories");
      setCategories(res.data?.data || []);
    } catch (err) {
      alert(err.response?.data?.message || "Cannot load categories");
    }
  };

  useEffect(() => {
    loadProducts(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    loadCategories();
  }, []);

  const updateStock = async (productId, stock) => {
    try {
      await axiosClient.patch(`/products/${productId}/stock`, { stock });
      loadProducts(page);
    } catch (err) {
      alert(err.response?.data?.message || "Cannot update stock");
    }
  };

  const handleRenameCategory = async () => {
    if (!renameFrom || !renameTo) return;
    if (!window.confirm(`Rename category "${renameFrom}" to "${renameTo}"?`))
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
      alert(err.response?.data?.message || "Cannot rename category");
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteName) return;
    if (
      !window.confirm(
        `Delete category "${deleteName}" and move products to "${
          moveTo || "Khac"
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
      alert(err.response?.data?.message || "Cannot delete category");
    }
  };

  if (loading) return <LoadingSpinner />;

  const filteredProducts = keyword
    ? products.filter((item) => {
        const haystack = `${item.name} ${item.category}`.toLowerCase();
        return haystack.includes(keyword.toLowerCase());
      })
    : products;

  return (
    <StaffLayout
      title="Supervisor - Products & Inventory"
      subtitle="Quản lý tồn kho và danh mục sản phẩm"
    >
      <div className="card p-4 mb-4">
        <div className="flex gap-2">
          <input
            className="input-field"
            placeholder="Search in current page by product/category"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <button className="btn-secondary" onClick={() => setKeyword("")}>
            Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="card p-4">
          <h2 className="font-semibold mb-3">Rename category</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              className="input-field"
              placeholder="From category"
              value={renameFrom}
              onChange={(e) => setRenameFrom(e.target.value)}
            />
            <input
              className="input-field"
              placeholder="To category"
              value={renameTo}
              onChange={(e) => setRenameTo(e.target.value)}
            />
            <button className="btn-primary" onClick={handleRenameCategory}>
              Rename
            </button>
          </div>
        </div>

        <div className="card p-4">
          <h2 className="font-semibold mb-3">Delete category (optional move)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              className="input-field"
              placeholder="Delete category"
              value={deleteName}
              onChange={(e) => setDeleteName(e.target.value)}
            />
            <input
              className="input-field"
              placeholder="Move products to (optional)"
              value={moveTo}
              onChange={(e) => setMoveTo(e.target.value)}
            />
            <button className="btn-danger" onClick={handleDeleteCategory}>
              Delete
            </button>
          </div>
        </div>
      </div>

      <div className="card p-4 mb-6">
        <h2 className="font-semibold mb-3">Current categories</h2>
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
        <table className="w-full min-w-[940px]">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4">Product</th>
              <th className="text-left py-3 px-4">Category</th>
              <th className="text-left py-3 px-4">Price</th>
              <th className="text-left py-3 px-4">Stock</th>
              <th className="text-left py-3 px-4">Status</th>
              <th className="text-left py-3 px-4">Update stock</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => (
              <tr key={product._id} className="border-b">
                <td className="py-3 px-4">
                  <div className="font-medium">{product.name}</div>
                  <div className="text-xs text-gray-500">{product._id}</div>
                </td>
                <td className="py-3 px-4">{product.category}</td>
                <td className="py-3 px-4">
                  {Number(product.price || 0).toLocaleString("vi-VN")}₫
                </td>
                <td className="py-3 px-4">{product.stock}</td>
                <td className="py-3 px-4">{product.status}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      className="border rounded px-2 py-1 w-24"
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
            Prev
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            className="btn-secondary px-4 py-2 disabled:opacity-50"
            disabled={page >= totalPages}
            onClick={() => setPage((prev) => prev + 1)}
          >
            Next
          </button>
        </div>
      )}
    </StaffLayout>
  );
}
