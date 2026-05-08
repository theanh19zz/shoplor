let currentProductData = null;
let selectedSize = null;
let selectedColor = null;
let availableStock = 0; // To store the current stock for the selected variant
let selectedColorImage = null;
let selectedRating = 0;

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Lấy ID từ URL
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        window.location.href = 'index.html';
        return;
    }

    try {
        // 2. Tải dữ liệu sản phẩm
        const productsFromJson = await fetch('json/products.json').then(res => res.json());
        const shopInventory = JSON.parse(localStorage.getItem('shop_inventory')) || [];

        // Merge/Override product data: Prioritize shop_inventory for editable fields
        let mergedProducts = productsFromJson.map(pJson => {
            // Tìm tất cả các biến thể của sản phẩm này trong shopInventory
            const variants = shopInventory.filter(si => String(si.id) === String(pJson.id));
            const baseVariant = variants.length > 0 ? variants[0] : {};
            if (Object.keys(baseVariant).length > 0) {
                return {
                    ...pJson,
                    ...baseVariant,
                    price: baseVariant.price || pJson.price, // Giữ giá gốc nếu admin chưa nhập
                    variants: variants,
                };
            }
            return { ...pJson, variants: [] }; // Nếu không có biến thể nào trong inventory
        });

        // Add any new products from inventory that might not be in products.json (e.g., from consignment)
        shopInventory.forEach(si => {
            if (!mergedProducts.some(mp => String(mp.id) === String(si.id))) {
                // Nếu là sản phẩm hoàn toàn mới trong inventory (vd: ký gửi), thêm nó vào.
                // Đảm bảo các trường cần thiết như description, price được thêm vào.
                mergedProducts.push({
                    ...si,
                    variants: [si],
                    description: si.description || "Sản phẩm ký gửi chất lượng cao.", // Fallback description
                    price: si.resalePrice || si.price // Sử dụng resalePrice cho giá bán
                });
            }
        });

        window.products = mergedProducts;
        const product = mergedProducts.find(p => p.id == productId);

        if (!product) {
            console.error("Sản phẩm không tồn tại trong mergedProducts");
            return;
        }

        currentProductData = product;
        await renderProductDetails(product);
        setupQuantityButtons();
        updateAddToCartButtonState();
        updateStockDisplay(availableStock);
        setupReviewSystem(productId);
        loadReviews(productId);
        renderSimilarProducts(product);
        setupAddToCartListener();
        setupBuyNowListener();
        initProductZoom();
    } catch (error) {
        console.error("Lỗi khi tải dữ liệu sản phẩm:", error);
    } finally {
        // Ẩn preloader sau khi dữ liệu đã sẵn sàng
        const preloader = document.getElementById('preloader');
        if (preloader) {
            preloader.style.opacity = '0';
            setTimeout(() => preloader.style.visibility = 'hidden', 500);
        }
    }
});

function renderProductDetails(product) {
    document.querySelector('.product-layout').style.display = 'flex';

    // Cập nhật thông tin chữ
    document.querySelector('.product_name_main').innerText = product.name || "Sản phẩm không tên";
    const finalPrice = window.parsePrice(product.price || 0);
    document.getElementById('display_price').innerText = finalPrice > 0 ? finalPrice.toLocaleString('vi-VN') + 'đ' : 'Liên hệ';
    // document.getElementById('display_old_price').innerText = product.oldPrice || "";
    document.querySelector('.product_des').innerText = product.description || "Mô tả sản phẩm đang được cập nhật...";

    // Update stock status display
    const inventory = JSON.parse(localStorage.getItem('shop_inventory')) || [];
    // Tính tổng tồn kho của tất cả các màu sắc thuộc sản phẩm này để hiển thị ban đầu
    const productVariants = inventory.filter(i => String(i.id) === String(product.id));

    if (productVariants.length > 0) {
        availableStock = productVariants.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0);
    } else {
        // Fallback về số lượng mặc định trong file JSON nếu Admin chưa set kho
        availableStock = parseInt(product.stock) || 20;
    }

    updateStockDisplay(availableStock);
    if (document.querySelector('.category_name')) {
        document.querySelector('.category_name').innerText = product.category;
    }
    document.getElementById('product_sku').innerText = `Mã SP: ${product.sku || 'N/A'}`;

    // Khởi tạo Gallery với màu đầu tiên (Index 0)
    updateGalleryByColor(product, 0);
    updateCurrentStock(); // Cập nhật kho ngay khi load trang

    // 2. Xử lý Màu sắc (Ô tròn)
    const colorContainer = document.getElementById('color-options');
    if (product.colors && product.colors.length > 0) {
        document.getElementById('color-group').style.display = 'block';
        colorContainer.innerHTML = product.colors.map((color, idx) => {
            const hex = getHexColor(color);
            return `<div class="color-circle" onclick="selectColor('${color}', this, ${idx})">
                        <div class="color-inner" style="background-color: ${hex};"></div>
                    </div>`;
        }).join('');
    } else {
        document.getElementById('color-group').style.display = 'none';
    }

    const sizeContainer = document.getElementById('size-options');
    if (product.sizes && product.sizes.length > 0) {
        document.getElementById('size-group').style.display = 'block';
        sizeContainer.innerHTML = product.sizes.map(size =>
            `<div class="size-box" onclick="selectSize('${size}', this)">${size}</div>`
        ).join('');
    } else {
        document.getElementById('size-group').style.display = 'none';
    }
    updateAddToCartButtonState(); // Update button state after rendering variants
}

/**
 * Cập nhật Gallery dựa trên màu được chọn (Mỗi màu 3 ảnh)
 */
window.updateGalleryByColor = (product, colorIndex) => {
    const imagesPerColor = 3;
    const startIndex = colorIndex * imagesPerColor;

    // Lấy tối đa 3 ảnh bắt đầu từ vị trí của màu đó
    let colorImages = [];
    if (product.images && product.images.length > 0) {
        colorImages = product.images.slice(startIndex, startIndex + imagesPerColor); // Lấy ảnh theo màu
        if (colorImages.length === 0 && product.images.length > 0) colorImages = [product.images[0]]; // Fallback về ảnh đầu tiên
    }

    const mainImg = document.getElementById('product_image');
    const thumbContainer = document.getElementById('thumbnails-container');

    if (colorImages.length > 0) {
        mainImg.style.opacity = '0';
        setTimeout(() => {
            mainImg.src = colorImages[0];
            mainImg.style.opacity = '1';
        }, 250);

        thumbContainer.innerHTML = colorImages.map((img, idx) =>
            `<img src="${img}" 
                  alt="${product.name} - ${idx + 1}" 
                  class="thumb-img ${idx === 0 ? 'active' : ''}" 
                  onclick="changeMainImage('${img}', this)">`
        ).join('');
    }
};

/**
 * Khởi tạo hiệu ứng Zoom theo vị trí chuột
 */
function initProductZoom() {
    const mainImg = document.getElementById('product_image');
    if (!mainImg) return;

    // Đảm bảo thẻ cha có class container để CSS overflow hoạt động
    if (mainImg.parentElement) {
        mainImg.parentElement.classList.add('product-image-container');
    }

    mainImg.addEventListener('mousemove', (e) => {
        const rect = mainImg.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        mainImg.style.transformOrigin = `${x}% ${y}%`;
        mainImg.style.transform = "scale(2)"; // Tỷ lệ phóng to x2
    });

    mainImg.addEventListener('mouseleave', () => {
        mainImg.style.transform = "scale(1)";
        mainImg.style.transformOrigin = "center center";
    });
}

window.changeMainImage = (src, el) => {
    const mainImg = document.getElementById('product_image');
    mainImg.style.opacity = '0';
    setTimeout(() => {
        mainImg.src = src;
        mainImg.style.opacity = '1';
    }, 250);
    document.querySelectorAll('.thumb-img').forEach(img => img.classList.remove('active'));
    el.classList.add('active');
};

function updateCurrentStock() {
    if (!currentProductData) return;

    const inventory = JSON.parse(localStorage.getItem('shop_inventory')) || [];
    const variantId = `${currentProductData.id}-${selectedColor || 'Mặc định'}`;
    const variant = inventory.find(v => v.variantId === variantId);

    if (variant && variant.variants && selectedSize) {
        // Nếu đã chọn cả Màu và Size, lấy đúng số lượng của cặp đó
        const sizeInfo = variant.variants.find(v => v.size === selectedSize);
        availableStock = sizeInfo ? sizeInfo.quantity : 0;
    } else if (variant) {
        // Nếu chỉ chọn Màu, lấy tổng tồn kho của màu đó
        availableStock = parseInt(variant.stock) || 0;
    } else {
        // Fallback về dữ liệu mặc định của sản phẩm
        availableStock = parseInt(currentProductData.stock) || 0;
    }

    updateStockDisplay(availableStock);
    updateAddToCartButtonState();
}

window.selectColor = (color, el, index) => {
    document.querySelectorAll('.color-circle').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    document.getElementById('color-name-label').innerText = color;
    selectedColor = color;
    updateCurrentStock();

    // Gọi hàm cập nhật bộ ảnh tương ứng với màu
    updateGalleryByColor(currentProductData, index);
};

window.selectSize = (size, el) => {
    document.querySelectorAll('.size-box').forEach(s => s.classList.remove('selected'));
    el.classList.add('selected');
    document.getElementById('size-name-label').innerText = size;
    selectedSize = size;
    document.getElementById('size-error').style.display = 'none';
    updateCurrentStock();
};

function getHexColor(colorName) {
    const colors = {
        'Đen': '#000', 'Trắng': '#fff', 'Xám': '#888', 'Kem': '#f5f5dc',
        'Đỏ': '#d63031', 'Xanh': '#0984e3', 'Vàng': '#f1c40f',
        'Hồng': '#ffc0cb', 'Nâu': '#8b4513', 'Xanh lá': '#27ae60',
        'Xanh lá cây': '#27ae60'
    };
    return colors[colorName] || colorName;
}

function setupReviewSystem(productId) {
    const stars = document.querySelectorAll('#star-selector ion-icon');
    const submitBtn = document.getElementById('submit-review');

    // Logic chọn sao
    stars.forEach(star => {
        star.addEventListener('click', () => {
            selectedRating = parseInt(star.getAttribute('data-value'));
            stars.forEach((s, idx) => {
                if (idx < selectedRating) {
                    s.setAttribute('name', 'star');
                    s.classList.add('active');
                } else {
                    s.setAttribute('name', 'star-outline');
                    s.classList.remove('active');
                }
            });
        });
    });

    // Gửi bình luận
    submitBtn.onclick = () => {
        const content = document.getElementById('review-content').value.trim();
        if (selectedRating === 0) return alert("Vui lòng chọn số sao!");
        if (!content) return alert("Vui lòng nhập nội dung đánh giá!");

        const newReview = {
            userName: localStorage.getItem('email')?.split('@')[0] || "Khách hàng",
            rating: selectedRating,
            content: content,
            date: new Date().toLocaleDateString('vi-VN')
        };

        let reviews = JSON.parse(localStorage.getItem(`reviews_${productId}`)) || [];
        reviews.unshift(newReview);
        localStorage.setItem(`reviews_${productId}`, JSON.stringify(reviews));

        // Reset form & render lại
        document.getElementById('review-content').value = '';
        selectedRating = 0;
        stars.forEach(s => { s.setAttribute('name', 'star-outline'); s.classList.remove('active'); });
        renderReviews(reviews);
    };
}

function loadReviews(productId) {
    const reviews = JSON.parse(localStorage.getItem(`reviews_${productId}`)) || [];
    renderReviews(reviews);
}

function renderReviews(reviews) {
    const list = document.getElementById('reviews-list');
    if (reviews.length === 0) {
        list.innerHTML = '<p style="font-size:14px; color:#999;">Chưa có đánh giá nào cho sản phẩm này.</p>';
        return;
    }

    list.innerHTML = reviews.map(rev => `
        <div class="review-item">
            <div class="review-meta">
                <span class="review-user">${rev.userName}</span>
                <span class="review-date">${rev.date}</span>
            </div>
            <div class="review-stars">
                ${'<ion-icon name="star"></ion-icon>'.repeat(rev.rating)}
                ${'<ion-icon name="star-outline"></ion-icon>'.repeat(5 - rev.rating)}
            </div>
            <p class="review-text">${rev.content}</p>
        </div>
    `).join('');
    document.querySelector('.review-count').innerText = `(${reviews.length} đánh giá)`;
}

function setupQuantityButtons() {
    document.getElementById('plus').onclick = () => {
        const input = document.getElementById('productCount');
        input.value = parseInt(input.value) + 1;
    };
    document.getElementById('minus').onclick = () => {
        const input = document.getElementById('productCount');
        let val = parseInt(input.value);
        if (val > 1) input.value = val - 1;
    };

    // Cho phép nhập số trực tiếp và validate
    const qtyInput = document.getElementById('productCount');
    if (qtyInput) {
        qtyInput.onchange = () => {
            let val = parseInt(qtyInput.value);
            if (isNaN(val) || val < 1) {
                qtyInput.value = 1;
            } else if (availableStock > 0 && val > availableStock) {
                alert(`Rất tiếc! Chỉ còn ${availableStock} sản phẩm trong kho.`);
                qtyInput.value = availableStock;
            }
        };
    }
}

function setupAddToCartListener() {
    document.getElementById('btn_add').addEventListener('click', function () {
        if (!currentProductData) return;

        let hasError = false;
        if (currentProductData.sizes && currentProductData.sizes.length > 0 && !selectedSize) {
            document.getElementById('size-error').style.display = 'block';
            hasError = true;
        }
        // Bạn có thể thêm lỗi màu sắc tương tự nếu muốn

        // Kiểm tra xem đã chọn màu sắc chưa nếu sản phẩm có màu
        if (currentProductData.colors && currentProductData.colors.length > 0 && !selectedColor) {
            alert("Vui lòng chọn màu sắc!");
            hasError = true;
        }

        // Cập nhật tồn kho dựa trên màu sắc và kích cỡ đã chọn
        const variantId = `${currentProductData.id}-${selectedColor || 'Mặc định'}`;
        updateCurrentStock();

        if (hasError) return;

        const quantity = parseInt(document.getElementById('productCount').value);

        if (typeof addToCart === 'function') {
            addToCart(currentProductData.id, quantity, selectedSize, selectedColor, selectedColorImage);

            // Hiển thị thông báo thành công
            const toast = document.getElementById('toast-overlay');
            if (toast) {
                toast.classList.add('show');
                setTimeout(() => toast.classList.remove('show'), 2000);
            }
            // Cập nhật lại trạng thái nút sau khi thêm vào giỏ
            if (typeof showCart === 'function') showCart();
        }
    });
}

function setupBuyNowListener() {
    const buyNowBtn = document.getElementById('btn_buy_now');
    if (!buyNowBtn) return;

    buyNowBtn.addEventListener('click', function () {
        if (!currentProductData) return;

        let hasError = false;
        if (currentProductData.sizes && currentProductData.sizes.length > 0 && !selectedSize) {
            document.getElementById('size-error').style.display = 'block';
            hasError = true;
        }

        if (currentProductData.colors && currentProductData.colors.length > 0 && !selectedColor) {
            alert("Vui lòng chọn màu sắc!");
            hasError = true;
        }

        updateCurrentStock();
        if (hasError) return;

        const quantity = parseInt(document.getElementById('productCount').value);

        if (typeof addToCart === 'function') {
            addToCart(currentProductData.id, quantity, selectedSize, selectedColor, selectedColorImage);
            
            // Lấy lại giỏ hàng sau khi đã thêm item mới
            const cart = JSON.parse(localStorage.getItem('cart')) || [];
            // Chỉ lấy những món đang được chọn (mặc định item mới thêm sẽ được chọn)
            const selectedItems = cart.filter(item => item.selected !== false);
            localStorage.setItem('checkout_items', JSON.stringify(selectedItems));
            
            window.location.href = 'thanh-toan.html'; 
        }
    });
}

function updateStockDisplay(stock) {
    const el = document.getElementById('product_stock_status');
    if (!el) return;
    
    // Thêm hiệu ứng nháy nhẹ khi cập nhật
    el.style.opacity = '0';
    setTimeout(() => {
        const isLowStock = stock > 0 && stock <= 5;
        
        if (!selectedSize && currentProductData.sizes && currentProductData.sizes.length > 0) {
            el.innerHTML = `
                <ion-icon name="information-circle-outline" style="color:#888"></ion-icon>
                <span style="color:#666">Vui lòng chọn kích thước để xem kho hàng</span>
            `;
        } else if (stock <= 0) {
            el.innerHTML = `<ion-icon name="close-circle" style="color:#d63031"></ion-icon> <span style="color:#d63031">Hết hàng</span>`;
        } else {
            el.innerHTML = `
                <ion-icon name="cube-outline" style="font-size: 18px; color: #27ae60;"></ion-icon>
                <span>Kho hàng: <strong style="color: ${isLowStock ? '#d63031' : '#27ae60'}">${stock}</strong> sản phẩm còn lại</span>
            `;
        }
        el.style.transition = 'opacity 0.3s';
        el.style.opacity = '1';
    }, 100);
}

function updateAddToCartButtonState() {
    const btnAdd = document.getElementById('btn_add');
    const btnBuy = document.getElementById('btn_buy_now');
    if (!btnAdd) return;

    if (availableStock <= 0) {
        btnAdd.innerText = "HẾT HÀNG";
        btnAdd.disabled = true;
        btnAdd.style.opacity = "0.5";
        if (btnBuy) {
            btnBuy.innerText = "HẾT HÀNG";
            btnBuy.disabled = true;
            btnBuy.style.opacity = "0.5";
        }
    } else {
        btnAdd.innerText = "THÊM VÀO GIỎ";
        btnAdd.disabled = false;
        btnAdd.style.opacity = "1";
        if (btnBuy) {
            btnBuy.innerText = "MUA NGAY";
            btnBuy.disabled = false;
            btnBuy.style.opacity = "1";
        }
    }
}

function renderSimilarProducts(currentProduct) {
    const grid = document.getElementById('similar-products-grid');
    if (!grid || !window.products) return;
    
    // Lấy 6 sản phẩm tương tự cùng danh mục
    const similar = window.products
        .filter(p => p.id != currentProduct.id && p.category === currentProduct.category)
        .slice(0, 6);

    grid.innerHTML = similar.map(product => {
        const mainImg = (product.images && product.images.length > 0) ? product.images[0] : 'images/default.jpg';
        const soldCount = Math.floor(Math.random() * 1000) + 100; // Giả lập số lượng đã bán
        
        return `
            <a href="ProductDetails.html?id=${product.id}" class="shopee-product-card">
                <div class="shopee-card-img">
                    <div class="shopee-badge-mall">Mall</div>
                    <img src="${mainImg}" alt="${product.name}">
                </div>
                <div class="shopee-card-info">
                    <div class="shopee-product-name">${product.name}</div>
                    <div class="shopee-card-footer">
                        <div class="shopee-rating">
                            <ion-icon name="star"></ion-icon>
                            <ion-icon name="star"></ion-icon>
                            <ion-icon name="star"></ion-icon>
                            <ion-icon name="star"></ion-icon>
                            <ion-icon name="star"></ion-icon>
                        </div>
                        <div class="shopee-price-row">
                            <span class="shopee-price">${product.price}</span>
                            <span class="shopee-sold">Đã bán ${soldCount}</span>
                        </div>
                    </div>
                </div>
            </a>
        `;
    }).join('');
}