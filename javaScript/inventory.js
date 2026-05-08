document.addEventListener('DOMContentLoaded', () => {
    // KIỂM TRA BẢO MẬT: Chỉ cho phép Admin truy cập
    const isAdmin = localStorage.getItem("isAdmin") === "true";
    if (!isAdmin) {
        alert("Truy cập bị từ chối! Bạn cần đăng nhập bằng tài khoản Quản lý.");
        window.location.href = "login.html";
        return;
    }

    loadInventoryData();

    document.getElementById('inventorySearch').addEventListener('input', (e) => {
        filterInventory(e.target.value.toLowerCase());
    });
});

let allProducts = [];

async function loadInventoryData() {
    try {
        const response = await fetch('json/products.json');
        allProducts = await response.json();

        // Lấy dữ liệu tồn kho từ localStorage (do cart.js khởi tạo)
        let inventory = JSON.parse(localStorage.getItem('shop_inventory')) || [];

        renderTable(allProducts, inventory);
    } catch (error) {
        console.error("Lỗi khi tải dữ liệu:", error);
    }
}

function renderTable(products, inventory) {
    const tbody = document.getElementById('inventoryList');
    tbody.innerHTML = '';

    products.forEach(product => {
        const invItem = inventory.find(i => i.id == product.id);
        const currentStock = invItem ? invItem.stock : 0;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${product.id}</td>
            <td><img src="${product.images[0]}" width="50" style="border-radius:5px"></td>
            <td><strong>${product.name}</strong></td>
            <td>${product.category}</td>
            <td>
                <input type="number" class="stock-input" id="stock-${product.id}" value="${currentStock}" min="0">
            </td>
            <td>
                <button class="btn-update" onclick="updateStock(${product.id})">Cập nhật</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.updateStock = function (productId) {
    const newStock = parseInt(document.getElementById(`stock-${productId}`).value);
    if (isNaN(newStock) || newStock < 0) {
        alert("Vui lòng nhập số lượng hợp lệ!");
        return;
    }

    let inventory = JSON.parse(localStorage.getItem('shop_inventory')) || [];
    const index = inventory.findIndex(i => String(i.id) === String(productId));

    if (index !== -1) {
        inventory[index].stock = newStock;
    } else {
        inventory.push({ id: productId, stock: newStock });
    }

    localStorage.setItem('shop_inventory', JSON.stringify(inventory));
    alert(`Đã cập nhật tồn kho cho sản phẩm ID: ${productId}`);
};

function filterInventory(term) {
    const filtered = allProducts.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term)
    );
    const inventory = JSON.parse(localStorage.getItem('shop_inventory')) || [];
    renderTable(filtered, inventory);
}