async function loadMyVouchers() {
    // Ensure window.parsePrice is available
    if (typeof window.parsePrice !== 'function') {
        window.parsePrice = (price) => parseInt(String(price).replace(/[^0-9]/g, '')) || 0;
    }


    const container = document.getElementById('voucher-list');
    const claimedVouchers = JSON.parse(localStorage.getItem('claimed_vouchers')) || [];

    if (claimedVouchers.length === 0) {
        container.innerHTML = `
            <div class="no-vouchers">
                <ion-icon name="ticket-outline" style="font-size: 64px; opacity: 0.2;"></ion-icon>
                <p>Bạn chưa có voucher nào. Hãy quay lại <a href="index.html#featured-offers-grid" style="color: var(--primary-color); text-decoration: underline;">Trang chủ</a> để nhận quà!</p>
            </div>`;
        return;
    }

    try {
        const response = await fetch('json/products.json');
        const products = await response.json();

        let html = '';
        claimedVouchers.forEach(voucher => {
            const product = products.find(p => p.id === voucher.productId);
            if (product) {
                html += `
                <div class="my-voucher-card ${voucher.used ? 'used' : ''}">
                    <div class="v-left">
                        <ion-icon name="gift-outline"></ion-icon>
                    </div>
                    <div class="v-right">
                        <h3>Voucher cho: ${product.name}</h3>
                        <p class="v-discount">-${voucher.discount.toLocaleString('vi-VN')}đ</p>
                        <div class="v-status">
                            ${voucher.used ? 'Đã sử dụng' : 'Chưa sử dụng'}
                        </div>
                        <p style="font-size: 11px; color: #999; margin-top: 10px;">
                            * Áp dụng tự động khi thêm sản phẩm này vào giỏ hàng.
                        </p>
                    </div>
                </div>`;
            }
        });

        container.innerHTML = html;
    } catch (error) {
        console.error("Lỗi khi tải voucher:", error);
        container.innerHTML = "<p>Không thể tải dữ liệu ví voucher.</p>";
    }
}

// Kích hoạt khi trang load
document.addEventListener('DOMContentLoaded', () => {
    loadMyVouchers();
    if (typeof checkCart === 'function') checkCart();
});

// Placeholder for updateVoucherBadge, called from index.js
window.updateVoucherBadge = function () {
    // Implement logic to update a badge if needed, e.g., on the Vouchers menu item
};