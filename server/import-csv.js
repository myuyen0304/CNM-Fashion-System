require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const csv = require("csv-parser");
const Product = require("./src/modules/product/product.model");

const parseSizes = (rawSize) => {
  if (!rawSize) return [];

  return [
    ...new Set(
      String(rawSize)
        .split("|")
        .map((size) => size.trim().toUpperCase())
        .filter(Boolean),
    ),
  ];
};

const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGO_URI || "mongodb://localhost:27017/ecommerce",
    );
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }
};

const importCSV = async () => {
  try {
    // Xóa sản phẩm cũ
    await Product.deleteMany({});
    console.log("🗑️  Cleared old products");

    const products = [];
    const csvFile = "./lazada_products_clean_20260227_141300.csv";

    // Parse CSV
    fs.createReadStream(csvFile)
      .pipe(csv())
      .on("data", (row) => {
        // Parse rating: rating_count > 10000 = 5 stars, < 100 = 2 stars, etc.
        let rating = Math.min(
          Math.max(Math.round(row.rating_count / 2000), 2),
          5,
        );

        // Parse soldCount
        let soldCount = parseInt(row.sold, 10) || 0;

        // Estimate stock based on sold
        let stock = Math.max(
          Math.ceil(soldCount * 0.3) + Math.floor(Math.random() * 50),
          10,
        );

        const product = {
          name: row.name || "Unnamed Product",
          description: `${row.category} - Giá gốc: ${row.original_price}, Giảm: ${row.discount_percent}%`,
          price: parseInt(row.price, 10) || 0,
          stock: stock,
          category: row.category || "Khác",
          sizes: parseSizes(row.size),
          images: [row.image],
          imageVector: [],
          status: "active",
          viewCount: Math.floor(Math.random() * 500),
          soldCount: soldCount,
          avgRating: rating,
        };

        products.push(product);
      })
      .on("end", async () => {
        try {
          // Lưu vào DB
          const result = await Product.insertMany(products);
          console.log(`✅ Import thành công ${result.length} sản phẩm!`);
          console.log(
            `   - Danh mục: ${[...new Set(products.map((p) => p.category))].join(", ")}`,
          );
          console.log(
            `   - Giá từ ${Math.min(...products.map((p) => p.price)).toLocaleString()} đến ${Math.max(...products.map((p) => p.price)).toLocaleString()} VND`,
          );
        } catch (err) {
          console.error("❌ Insert error:", err.message);
        } finally {
          mongoose.connection.close();
          console.log("🔌 Database connection closed");
        }
      })
      .on("error", (err) => {
        console.error("❌ CSV parse error:", err.message);
        mongoose.connection.close();
        process.exit(1);
      });
  } catch (err) {
    console.error("❌ Import error:", err.message);
    mongoose.connection.close();
  }
};

connectDB().then(importCSV);
