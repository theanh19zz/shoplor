/**
 * Hàm thêm sản phẩm vào giỏ hàng với thông tin Size và Màu sắc
 */
window.addToCart = function(productId, quantity = 1, size = null, color = null, customImage = null) {
    // Lấy giỏ hàng từ LocalStorage
    let cart = JSON.parse(localStorage.getItem('cart')) || [];

    // Tìm sản phẩm trong danh sách tổng (giả định window.products chứa data từ products.json)
    const productInfo = window.products ? window.products.find(p => String(p.id) === String(productId)) : null;

    if (!productInfo) {
        // Try to find in likenew_products if not found in main products
        const likeNewProducts = JSON.parse(localStorage.getItem('likenew_products')) || [];
        const likeNewProductInfo = likeNewProducts.find(p => String(p.id) === String(productId));
        if (likeNewProductInfo) {
            const totalQty = Number(likeNewProductInfo.quantity || 1);
            const soldQty = Number(likeNewProductInfo.soldCount || 0);
            
            if (soldQty >= totalQty) {
                alert("Sản phẩm này đã hết hàng.");
                return;
            }

            return addLikeNewToCart(likeNewProductInfo, quantity, size, color);
        }

        alert("Rất tiếc! Không tìm thấy thông tin sản phẩm này. Vui lòng thử lại hoặc tải lại trang.");
        console.error("Không tìm thấy thông tin sản phẩm cho ID:", productId);
        return;
    }

    // Tìm xem trong giỏ đã có sản phẩm trùng ID, Size và Color chưa
    // Việc so sánh cả size và color giúp tách biệt các phiên bản khác nhau của cùng 1 sản phẩm
    const existingItemIndex = cart.findIndex(item =>
        String(item.id) === String(productId) &&
        item.size === (size || null) &&
        item.color === (color || null)
    );

    // Check stock availability
    // CẬP NHẬT: Kiểm tra tồn kho theo biến thể Màu sắc
    // Đồng bộ với logic Admin: Kiểm tra theo variantId (id-màu)
    const inventory = JSON.parse(localStorage.getItem('shop_inventory')) || [];
    const variantId = `${productId}-${color || 'Mặc định'}`;
    const invItem = inventory.find(i => i.variantId === variantId);

    // Kiểm tra tồn kho theo size trong mảng variants
    let currentStock = 0;
    if (invItem && invItem.variants && invItem.variants.length > 0) {
        const sizeVariant = invItem.variants.find(v => v.size === size);
        // Ưu tiên lấy theo size, nếu không có lấy theo stock tổng của variant
        currentStock = (sizeVariant !== undefined) ? sizeVariant.quantity : (parseInt(invItem.stock) || parseInt(productInfo.stock) || 20);

        // Nếu invItem.stock bị NaN, cộng dồn từ các variants
        if (isNaN(currentStock) || currentStock === 0) {
            currentStock = invItem.variants.reduce((sum, v) => sum + (parseInt(v.quantity) || 0), 0);
        }
    } else {
        currentStock = invItem ? (parseInt(invItem.stock) || 20) : (parseInt(productInfo.stock) || 20);
    }

    let currentQuantityInCart = 0;
    if (existingItemIndex > -1) {
        currentQuantityInCart = cart[existingItemIndex].quantity;
    }

    if (currentQuantityInCart + quantity > currentStock) {
        alert(`Không đủ hàng trong kho! Chỉ còn ${currentStock} sản phẩm.`);
        return;
    }

    if (existingItemIndex > -1) {
        // Nếu đã tồn tại thì tăng số lượng
        cart[existingItemIndex].quantity += quantity;
        cart[existingItemIndex].selected = true; // Đảm bảo sản phẩm được chọn khi nhấn mua lại
    } else {
        // Ensure price is a number for calculation later
        // Nếu chưa có thì thêm mới object vào mảng
        cart.push({
            id: productInfo.id,
            name: productInfo.name,
            price: window.parsePrice(productInfo.price), // Lưu giá dưới dạng số
            image: customImage || productInfo.images[0],
            size: size,
            color: color,
            quantity: quantity,
            selected: true
        });
    }

    // Lưu lại vào LocalStorage
    localStorage.setItem('cart', JSON.stringify(cart));

    // Cập nhật giao diện giỏ hàng (Badge số lượng, danh sách item trong sidebar)
    updateCartUI();
    
    // Tự động mở sidebar giỏ hàng
    document.body.classList.add('showCart');
}

// Helper function for adding Like-New products to cart with stock validation
function addLikeNewToCart(productInfo, quantity = 1, size = null, color = null) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    const availableStock = Number(productInfo.quantity || 1) - Number(productInfo.soldCount || 0);

    // CHẶN: Không cho phép người bán tự mua đồ của mình
    const currentUserEmail = localStorage.getItem('email');
    let sellerEmail = productInfo.sellerEmail;
    
    // Fallback cho dữ liệu cũ (nếu sellerEmail chưa có trong likenew_products)
    if (!sellerEmail && currentUserEmail) {
        const resellRequests = JSON.parse(localStorage.getItem('resell_requests')) || [];
        const originalId = String(productInfo.id).replace('LN', '');
        const originalReq = resellRequests.find(r => String(r.id) === originalId);
        if (originalReq) {
            sellerEmail = originalReq.customerEmail;
        }
    }

    if (currentUserEmail && sellerEmail && currentUserEmail === sellerEmail) {
        alert("Bạn không thể mua sản phẩm do chính mình ký gửi!");
        return;
    }

    // Find if item is already in cart
    const existingItemIndex = cart.findIndex(item => String(item.id) === String(productInfo.id));
    
    let currentInCart = 0;
    if (existingItemIndex > -1) {
        currentInCart = cart[existingItemIndex].quantity;
    }

    if (currentInCart + quantity > availableStock) {
        alert(`Rất tiếc! Sản phẩm này chỉ còn ${availableStock} cái.`);
        return;
    }

    if (existingItemIndex > -1) {
        cart[existingItemIndex].quantity += quantity;
        cart[existingItemIndex].selected = true; // Đảm bảo sản phẩm được chọn khi nhấn mua lại
    } else {
        cart.push({
            id: productInfo.id,
            name: productInfo.name,
            price: window.parsePrice(productInfo.resalePrice),
            image: productInfo.image,
            size: productInfo.size,
            color: color,
            quantity: quantity,
            isLikeNew: true, // Đánh dấu là hàng ký gửi
            selected: true
        });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
    document.body.classList.add('showCart');
}


function updateCartUI() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];

    // Cập nhật Badge đếm số lượng trên icon giỏ hàng
    const cartCounters = document.querySelectorAll('#cart-counter');
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0);

    cartCounters.forEach(counter => {
        counter.innerText = totalItems;
        counter.style.display = totalItems > 0 ? 'block' : 'none';
    });

    // Render danh sách sản phẩm vào các vùng chứa giỏ hàng (Sidebar hoặc Trang giỏ hàng)
    renderCartItems();
}

/**
 * Render danh sách sản phẩm ra HTML
 */
function renderCartItems() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cartContainers = document.querySelectorAll('.cart_products');
    const sidebarContainer = document.querySelector('.cart_products_sidebar');

    if (cartContainers.length === 0 && !sidebarContainer) return;

    let htmlContent = '';
    let subtotal = 0;
    let totalQuantity = 0;
    if (cart.length === 0) {
        htmlContent = '<div class="empty-cart-msg">Giỏ hàng của bạn đang trống.</div>';
    } else {
        cart.forEach((item, index) => {
            // Đảm bảo thuộc tính selected tồn tại (mặc định là true)
            if (item.selected === undefined) item.selected = true;

            const priceValue = window.parsePrice(item.price);
            const qty = parseInt(item.quantity || item.soLuong || 1);
            const lineTotal = priceValue * qty;

            if (item.selected) {
                subtotal += lineTotal;
                totalQuantity += qty;
            }

            htmlContent += `
                <div class="cart_product ${item.selected ? '' : 'unselected'}" data-index="${index}" style="display: flex; align-items: center; gap: 15px;">
                    <div class="item-checkbox">
                        <input type="checkbox" ${item.selected ? 'checked' : ''} onchange="toggleItemSelection(${index})" style="width: 18px; height: 18px; cursor: pointer;">
                    </div>
                    <div class="cart_product_img">
                        <img src="${item.image}" alt="${item.name}">
                    </div>
                    <div class="cart_product_info" style="flex: 1;">
                        <div class="top_card">
                            <div class="left_card">
                                <h4 class="product_name">${item.name}</h4>
                                <span class="product_price">${item.price}</span>
                                <div class="variant_info">
                                    ${item.size ? `<span class="variant-tag">Size: ${item.size}</span>` : ''} 
                                    ${item.color ? `<span>Màu sắc: ${item.color}</span>` : ''}
                                </div>
                            </div>
                            <div class="remove_product" onclick="changeQuantity(${index}, -${item.quantity})">
                                <ion-icon name="trash-outline"></ion-icon>
                            </div>
                        </div>
                        <div class="buttom_card">
                            <div class="counts">
                                <button class="counts_btns minus" onclick="changeQuantity(${index}, -1)">-</button>
                                <input type="number" class="product_count" value="${item.quantity}" min="1" onchange="updateQuantity(${index}, this.value)">
                                <button class="counts_btns plus" onclick="changeQuantity(${index}, 1)">+</button>
                            </div>
                            <span class="total_price">${lineTotal.toLocaleString('vi-VN')}đ</span>
                        </div>
                    </div>
                </div>`;
        });
    }

    cartContainers.forEach(container => {
        container.innerHTML = htmlContent;
    });

    // --- Render danh sách sản phẩm vào Sidebar giỏ hàng (nếu tồn tại) ---
    if (sidebarContainer) {
        let sidebarHtml = '';
        let sidebarSubtotal = 0;
        
        if (cart.length > 0) {
            const allSelected = cart.every(item => item.selected);
            sidebarHtml += `
                <div class="sidebar_select_all" style="padding: 15px 0; border-bottom: 1px solid #f0f0f0; display: flex; align-items: center; gap: 10px;">
                    <input type="checkbox" ${allSelected ? 'checked' : ''} onchange="toggleSelectAll(this)" style="width: 16px; height: 16px; cursor: pointer;">
                    <span style="font-size: 13px; font-weight: 500; color: #333;">Chọn tất cả (${cart.length})</span>
                </div>
            `;
        }

        cart.forEach((item, index) => {
            const priceValue = window.parsePrice(item.price);
            const qty = parseInt(item.quantity || 1);
            const lineTotal = priceValue * qty;
            
            if (item.selected !== false) {
                sidebarSubtotal += lineTotal;
            }
            
            sidebarHtml += `
                <div class="sidebar_item ${item.selected === false ? 'unselected' : ''}" style="display: flex; gap: 12px; padding: 20px 0; border-bottom: 1px solid #f0f0f0; align-items: center;">
                    <div class="sidebar_item_checkbox">
                        <input type="checkbox" ${item.selected !== false ? 'checked' : ''} onchange="toggleItemSelection(${index})" style="width: 16px; height: 16px; cursor: pointer;">
                    </div>
                    <div class="sidebar_item_img" style="width: 70px; height: 90px; flex-shrink: 0;">
                        <img src="${item.image}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;">
                    </div>
                    <div class="sidebar_item_info" style="flex: 1;">
                        <div class="sidebar_item_header" style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <h4 class="sidebar_item_name" style="font-size: 13px; font-weight: 500; margin: 0; line-height: 1.4;">${item.name}</h4>
                            <ion-icon name="trash-outline" class="sidebar_remove_icon" onclick="changeQuantity(${index}, -${item.quantity})" style="cursor: pointer; color: #999;"></ion-icon>
                        </div>
                        <span class="sidebar_item_price" style="font-size: 12px; color: #666; display: block; margin-top: 4px;">${priceValue.toLocaleString('vi-VN')}đ</span>
                        <div class="sidebar_variant_tags" style="margin-top: 5px; display: flex; gap: 5px;">
                            ${item.size ? `<span style="font-size: 10px; background: #f5f5f5; padding: 2px 6px; border-radius: 2px;">Size: ${item.size}</span>` : ''}
                            ${item.color ? `<span style="font-size: 10px; background: #f5f5f5; padding: 2px 6px; border-radius: 2px;">Màu: ${item.color}</span>` : ''}
                        </div>
                        <div class="sidebar_item_controls" style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                            <div class="sidebar_qty_control" style="display: flex; align-items: center; border: 1px solid #eee; border-radius: 2px;">
                                <button onclick="changeQuantity(${index}, -1)" style="border: none; background: none; width: 24px; height: 24px; cursor: pointer;">-</button>
                                <input type="number" value="${item.quantity}" min="1" onchange="updateQuantity(${index}, this.value)" style="width: 35px; text-align: center; font-size: 12px; border: none; background: none; outline: none;">
                                <button onclick="changeQuantity(${index}, 1)" style="border: none; background: none; width: 24px; height: 24px; cursor: pointer;">+</button>
                            </div>
                            <span class="sidebar_item_total" style="font-weight: 600; font-size: 13px;">${lineTotal.toLocaleString('vi-VN')}đ</span>
                        </div>
                    </div>
                </div>`;
        });
        sidebarContainer.innerHTML = sidebarHtml || '<div style="padding: 40px 20px; text-align: center; color: #999;">Giỏ hàng của bạn đang trống.</div>';
        
        const sidebarTotalPriceEl = document.getElementById('sidebar_total_price');
        if (sidebarTotalPriceEl) {
            sidebarTotalPriceEl.innerText = sidebarSubtotal.toLocaleString('vi-VN') + 'đ';
        }
    }

    // Cập nhật trạng thái nút "Chọn tất cả"
    const selectAllBtn = document.getElementById('selectAll');
    if (selectAllBtn) {
        const allSelected = cart.length > 0 && cart.every(item => item.selected);
        selectAllBtn.checked = allSelected;
    }

    // Cập nhật số lượng sản phẩm đang chọn
    const cartCountsEl = document.getElementById('cart_counts');
    if (cartCountsEl) {
        const selectedCount = cart.filter(i => i.selected).length;
        cartCountsEl.innerText = `(${selectedCount} sản phẩm chọn)`;
    }

    // Cập nhật tổng tiền hiển thị (nếu có các element tương ứng)
    const subtotalEl = document.getElementById('Subtotal');
    if (subtotalEl) subtotalEl.innerText = subtotal.toLocaleString('vi-VN') + 'đ';

    // Cập nhật tổng đơn hàng trên trang cartPage.html (bao gồm phí ship 30k mặc định)
    const totalOrderEl = document.getElementById('total_order');
    if (totalOrderEl) {
        const deliveryFee = subtotal > 0 ? 30000 : 0; // Nếu không chọn món nào thì ship = 0
        totalOrderEl.innerText = (subtotal + deliveryFee).toLocaleString('vi-VN') + 'đ';
        
        // Cập nhật phí ship hiển thị
        const deliveryEl = document.getElementById('Delivery');
        if (deliveryEl) deliveryEl.innerText = deliveryFee.toLocaleString('vi-VN') + 'đ';
    }

    const sidebarTotalQty = document.getElementById('sidebar-cart-quantity');
    if (sidebarTotalQty) sidebarTotalQty.innerText = totalQuantity;
}

/**
 * Thay đổi trạng thái chọn của một sản phẩm
 */
window.toggleItemSelection = function (index) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart[index]) {
        cart[index].selected = !cart[index].selected;
        localStorage.setItem('cart', JSON.stringify(cart));
        renderCartItems();
    }
}

/**
 * Chọn hoặc bỏ chọn tất cả sản phẩm
 */
window.toggleSelectAll = function (checkbox) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const isChecked = checkbox.checked;
    cart.forEach(item => item.selected = isChecked);
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCartItems();
}

function changeQuantity(index, delta) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    let item = cart[index];
    // Get stock for regular products (like-new items are 1-off, no stock check here)
    const inventory = JSON.parse(localStorage.getItem('shop_inventory')) || [];
    const variantId = `${item.id}-${item.color || 'Mặc định'}`;
    const invItem = inventory.find(i => i.variantId === variantId);

    // Lấy tồn kho thực tế theo Size
    let currentStock = 0;
    if (invItem) {
        if (invItem.variants) {
            const sizeVariant = invItem.variants.find(v => v.size === item.size);
            currentStock = sizeVariant ? sizeVariant.quantity : (parseInt(invItem.stock) || 0);
        } else {
            currentStock = parseInt(invItem.stock) || 0;
        }
    }

    // Prevent increasing beyond stock
    if (delta > 0) {
        const newQty = parseInt(item.quantity) + delta;
        
        // CẬP NHẬT: Kiểm tra tồn kho cho cả hàng thường và hàng Like-New
        if (item.id.startsWith('LN')) {
            const likeNewProducts = JSON.parse(localStorage.getItem('likenew_products')) || [];
            const lnInfo = likeNewProducts.find(p => String(p.id) === String(item.id));
            if (lnInfo) {
                const available = Number(lnInfo.quantity || 1) - Number(lnInfo.soldCount || 0);
                if (newQty > available) {
                    alert(`Rất tiếc! Hàng ký gửi này chỉ còn ${available} cái.`);
                    return;
                }
            }
        } else {
            // Hàng thường
            if (newQty > currentStock) {
                alert(`Rất tiếc! Chỉ còn ${currentStock} sản phẩm trong kho.`);
                return;
            }
        }
    }

    item.quantity += delta;
    if (item.quantity <= 0) cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
}

/**
 * Cập nhật số lượng sản phẩm bằng cách nhập trực tiếp
 */
window.updateQuantity = function(index, newValue) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    let item = cart[index];
    if (!item) return;

    let newQty = parseInt(newValue);
    if (isNaN(newQty) || newQty < 1) newQty = 1;

    // Kiểm tra tồn kho
    const inventory = JSON.parse(localStorage.getItem('shop_inventory')) || [];
    const variantId = `${item.id}-${item.color || 'Mặc định'}`;
    const invItem = inventory.find(i => i.variantId === variantId);

    let currentStock = 0;
    if (item.id.startsWith('LN')) {
        const likeNewProducts = JSON.parse(localStorage.getItem('likenew_products')) || [];
        const lnInfo = likeNewProducts.find(p => String(p.id) === String(item.id));
        currentStock = lnInfo ? (Number(lnInfo.quantity || 1) - Number(lnInfo.soldCount || 0)) : 1;
    } else if (invItem) {
        if (invItem.variants) {
            const sizeVariant = invItem.variants.find(v => v.size === item.size);
            currentStock = sizeVariant ? sizeVariant.quantity : (parseInt(invItem.stock) || 0);
        } else {
            currentStock = parseInt(invItem.stock) || 0;
        }
    } else {
        currentStock = 20; // Default fallback
    }

    if (newQty > currentStock) {
        alert(`Rất tiếc! Chỉ còn ${currentStock} sản phẩm trong kho.`);
        newQty = currentStock;
    }

    item.quantity = newQty;
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
}

/**
 * Hàm hiển thị Sidebar giỏ hàng
 */
window.showCart = function () {
    const cartSidebar = document.querySelector('.cart-section');
    if (cartSidebar) {
        cartSidebar.classList.add('active');
        // Nếu có class showCart trên body ở CSS cũ thì giữ để đồng bộ
        document.body.classList.add('showCart');
    }
}

/**
 * Hàm ẩn Sidebar giỏ hàng
 */
window.closeCart = function () {
    const cartSidebar = document.querySelector('.cart-section');
    if (cartSidebar) {
        cartSidebar.classList.remove('active');
        document.body.classList.remove('showCart');
    }
}

// Khởi tạo giỏ hàng khi trang web tải xong
document.addEventListener('DOMContentLoaded', () => {
    updateCartUI();

    // Gán sự kiện cho nút đóng giỏ hàng
    const closeBtn = document.getElementById('closeCart');
    if (closeBtn) {
        closeBtn.addEventListener('click', window.closeCart);
    }
});

/**
 * Hàm xử lý khi nhấn nút Thanh Toán
 */
window.checkOut = function () {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const selectedItems = cart.filter(item => item.selected !== false);

    if (selectedItems.length === 0) {
        alert("Vui lòng chọn ít nhất một sản phẩm để thanh toán!");
        return;
    }

    // Lưu danh sách sản phẩm được chọn vào một key riêng để trang thanh toán sử dụng
    localStorage.setItem("checkout_items", JSON.stringify(selectedItems));

    // Kiểm tra đăng nhập
    const userEmail = localStorage.getItem('email');
    if (!userEmail || userEmail === 'null' || userEmail === 'undefined') {
        alert("Vui lòng đăng nhập để tiếp tục thanh toán!");
        window.location.href = "login.html";
        return;
    }

    console.log("Hệ thống: Đang chuyển hướng sang trang thanh toán...");
    window.location.href = "thanh-toan.html";
}