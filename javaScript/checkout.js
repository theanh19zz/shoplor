window.addEventListener("load", function () {
    addDate();
    if (typeof initMap === 'function') initMap();
})

function showCheckAnimation() {
    const checkIconContainer = document.getElementById('checkoutIcon');
    checkIconContainer.innerHTML = '';
    const newCheckIcon = document.createElement('div');
    newCheckIcon.style.width = '200px';
    newCheckIcon.style.height = '200px';
    checkIconContainer.appendChild(newCheckIcon);

    lottie.loadAnimation({
        container: newCheckIcon,
        renderer: 'svg',
        loop: false,
        autoplay: true,
        path: 'json/AnimationCheckoutPage.json'
    });
}

function addDate() {
    let date = document.getElementById("order_date");
    if (!date) return;
    const now = new Date();
    // Sử dụng định dạng VN cho đồng bộ
    date.innerHTML = now.toLocaleDateString('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' });
}
function clearCart() {
    localStorage.removeItem('cart');
    // Xóa các trạng thái giảm giá đã áp dụng để làm mới phiên mua hàng tiếp theo
    localStorage.removeItem('discountAmount');
    localStorage.removeItem('appliedCode');
    localStorage.removeItem('voucherDiscount');
}
function backHome() {
    window.location.href = "index.html";
}