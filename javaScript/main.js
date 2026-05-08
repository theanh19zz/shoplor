window.onscroll = function () {
    scrollFunction();
    updateProgressBar();
};

function updateProgressBar() {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    const progressBar = document.getElementById("scrollBar");
    if (progressBar) {
        progressBar.style.width = scrolled + "%";
    }
}

function scrollFunction() {
    const scrollBtn = document.getElementById("scrollBtn");
    if (!scrollBtn) return;
    if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
        scrollBtn.style.display = "block";
    } else {
        scrollBtn.style.display = "none";
    }
}

const scrollBtn = document.getElementById("scrollBtn");
if (scrollBtn) {
    scrollBtn.addEventListener("click", function () {
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
    });
}

// nav 
var nav = document.getElementById('header');
var scrollUp = "scroll-up";
var scrollDown = "scroll-down";
var lastScroll = 0;

window.addEventListener("scroll", scrollHandler);

function scrollHandler() {
    const currentScroll = window.pageYOffset;
    if (currentScroll === 0) {
        return nav.classList.remove(scrollDown, scrollUp);
    }
    if (currentScroll > lastScroll) {
        nav.classList.replace(scrollUp, scrollDown) || nav.classList.add(scrollDown);
    } else {
        nav.classList.remove(scrollDown);
        nav.classList.add(scrollUp);
    }
    lastScroll = currentScroll;
}

// cart 
const body = document.querySelector('body');
document.querySelectorAll('.icon-cart').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        body.classList.toggle('showCart');
    });
});

// Xử lý nút đóng giỏ hàng
document.addEventListener('click', (e) => {
    if (e.target.closest('#closeCartBtn')) {
        body.classList.remove('showCart');
    }
});

function viewCart() {
    window.location.href = "cartPage.html"
}

function setupUI() {
    let displayLogin = document.getElementById("display_login");
    let login = document.getElementById("login_btn");
    let userNameDisplay = document.getElementById("user_name");
    let token = localStorage.getItem("email");

    if (token && String(token) !== 'null' && String(token) !== 'undefined' && token.trim() !== "") {
        if (displayLogin) displayLogin.style.display = "flex";
        if (login) login.style.display = "none";
        if (userNameDisplay) {
            // Hiển thị tên tài khoản như cũ
            userNameDisplay.innerText = token.split('@')[0];
            userNameDisplay.style.cursor = "pointer";
            userNameDisplay.title = "Đăng xuất";
            userNameDisplay.onclick = () => logout();
        }

        // Thêm mục Hồ sơ cá nhân vào thanh menu chính
        let navUl = document.querySelector('nav ul');
        if (navUl && !document.getElementById('nav-profile-link')) {
            let li = document.createElement('li');
            li.id = 'nav-profile-link';
            li.innerHTML = '<a href="profile.html" style="font-weight: bold; color: #000;">Hồ Sơ Của Tôi</a>';
            navUl.appendChild(li);
        }
    } else {
        if (displayLogin) displayLogin.style.display = "none";
        if (login) login.style.display = "inline-block";

        // Xóa mục Hồ sơ cá nhân nếu chưa đăng nhập
        let profileLink = document.getElementById('nav-profile-link');
        if (profileLink) profileLink.remove();
    }
    updateVoucherBadge();
    setupAdminButton();
}

// Admin Floating Button logic
function setupAdminButton() {
    // Check if button already exists
    if (document.querySelector('.admin-fab')) return;

    // Create the button
    const fab = document.createElement('a');
    fab.href = 'admin_login.html';
    fab.className = 'admin-fab';
    fab.innerHTML = '<ion-icon name="shield-checkmark-outline"></ion-icon>';
    fab.title = 'Quản trị viên';
    
    // Add click event for better UX
    fab.onclick = (e) => {
        // Optional: Add a confirmation if needed, but usually just redirect
    };

    document.body.appendChild(fab);
}

function logout() {
    localStorage.removeItem("email");
    localStorage.removeItem("password");
    window.location.href = "login.html";
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupUI);
} else {
    setupUI();
}


/**
 * Đánh dấu trang hiện tại trên Menu
 */
document.querySelectorAll('nav ul li a').forEach(link => {
    if (link.href === window.location.href) {
        link.style.color = '#000';
        link.style.fontWeight = 'bold';
    }
});

/**
 * Cập nhật số lượng voucher chưa sử dụng trên menu điều hướng
 */
function updateVoucherBadge() {
    const claimedVouchers = JSON.parse(localStorage.getItem('claimed_vouchers')) || [];
    const unusedCount = claimedVouchers.filter(v => !v.used).length;

    document.querySelectorAll('nav ul li a').forEach(link => {
        if (link.innerText.includes('Ví Voucher')) {
            let badge = link.querySelector('.voucher-badge');
            if (unusedCount > 0 && link) {
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'voucher-badge';
                    link.appendChild(badge);
                }
                badge.innerText = unusedCount;
            } else if (badge) {
                badge.remove();
            }
        }
    });
}

/**
 * Tự động đếm và hiển thị số lượng sản phẩm cho từng bộ sưu tập
 */
async function updateCollectionCounts() {
    const badges = document.querySelectorAll('.collection-badge');
    if (badges.length === 0) return; // Chỉ chạy nếu đang ở trang có thẻ badge

    try {
        const response = await fetch('json/products.json');
        const products = await response.json();

        // Đếm số lượng sản phẩm theo thuộc tính 'collection'
        const counts = {};
        products.forEach(product => {
            if (product.collection) {
                counts[product.collection] = (counts[product.collection] || 0) + 1;
            }
        });

        // Cập nhật lên giao diện
        badges.forEach(badge => {
            const collectionName = badge.getAttribute('data-collection');
            if (collectionName && counts[collectionName] !== undefined) {
                badge.innerText = `${counts[collectionName]} sản phẩm`;
            }
        });
    } catch (error) {
        console.error("Lỗi khi đếm sản phẩm bộ sưu tập:", error);
    }
}

window.addEventListener('DOMContentLoaded', updateCollectionCounts);

/**
 * Hàm dùng chung để parse giá từ chuỗi (để dùng ở mọi file JS)
 */
window.parsePrice = function (price) {
    if (typeof price === 'number') return price;
    if (!price) return 0;
    // Xử lý cả dấu chấm và dấu phẩy trong định dạng tiền tệ Việt Nam
    const cleanedPrice = String(price).replace(/\./g, '').replace(/,/g, '').replace(/[^0-9]/g, '');
    return parseInt(cleanedPrice) || 0;
};

/**
 * Chuyển đổi tên màu tiếng Việt sang mã Hex để hiển thị trên UI
 */
window.getColorHex = function (colorName) {
    const colors = {
        'Đen': '#000000', 'Trắng': '#ffffff', 'Xám': '#808080',
        'Xanh': '#3498db', 'Đỏ': '#da291c', 'Vàng': '#f1c40f',
        'Cam': '#e67e22', 'Kem': '#f5f5dc', 'Hồng': '#ffc0cb',
        'Nâu': '#8b4513', 'Xanh lá': '#27ae60',
        'Xanh lá cây': '#27ae60'
    };
    return colors[colorName] || colorName;
};

/**
 * Hàm tạo cấu trúc HTML dùng chung cho mọi thẻ sản phẩm trên website
 * @param {Object} product - Đối tượng sản phẩm từ JSON
 */
window.createProductCard = function (product) {
    if (!product) return '';
    let badgeHTML = '';
    if (product.oldPrice) {
        // Ensure oldPrice is a valid string or number before parsing
        const currentPrice = window.parsePrice(product.price);
        const oldPrice = window.parsePrice(product.oldPrice);
        if (oldPrice > currentPrice) {
            const discountPercent = Math.round(((oldPrice - currentPrice) / oldPrice) * 100);
            badgeHTML = `<span class="product-badge badge-discount">Giảm ${discountPercent}%</span>`;
        }
    }
    if (!badgeHTML && product.isTrending) {
        badgeHTML = `<span class="product-badge badge-trending">Bán chạy</span>`;
    }

    const oldPriceHTML = '';

    let swatchesHTML = '';
    if (Array.isArray(product.colors) && product.colors.length > 0) {
        swatchesHTML = `<div class="color-swatches">`;
        product.colors.forEach((color, index) => {
            const imgIndex = index * 3; // Màu 1: Index 0, Màu 2: Index 3, Màu 3: Index 6
            const imgPath = (product.images && product.images[imgIndex]) ? product.images[imgIndex] : (product.images ? product.images[0] : 'images/default.jpg');
            const activeClass = index === 0 ? 'active' : '';
            const hex = window.getColorHex(color);
            swatchesHTML += `<span class="swatch ${activeClass}" style="background-color: ${hex};" data-image="${imgPath}" title="${color}"></span>`;
        });
        swatchesHTML += `</div>`;
    }

    // Define mainImg and hoverImg from product.images
    const mainImg = (product.images && product.images.length > 0) ? product.images[0] : 'images/default.jpg';
    const hoverImg = (product.images && product.images.length > 1) ? product.images[1] : mainImg;

    // Đảm bảo nút "Xem nhanh" gọi đúng hàm toàn cục
    return `
    <div class="product-card" data-id="${product.id}">
        ${badgeHTML}
        <a href="ProductDetails.html?id=${product.id}" class="product-main-link">
            <div class="card-img">
                <img src="${mainImg}" alt="${product.name}" loading="lazy" 
                     data-main-image="${mainImg}" data-hover-image="${hoverImg}">
                <button class="btn-quick-view" onclick="event.preventDefault(); event.stopPropagation(); openQuickView(${product.id})">Xem nhanh</button>
            </div>
        </a>
        <div class="card-info">
             ${swatchesHTML}
             <a href="ProductDetails.html?id=${product.id}" class="product-name-link">
                <h4 class="product-name">${product.name}</h4>
             </a>
             <h5 class="product-price">${product.price}${oldPriceHTML}</h5>
             <a href="#" class="addToCart" title="Thêm vào giỏ">
                <ion-icon name="cart-outline" class="Cart"></ion-icon>
             </a>
        </div>
    </div>`;
};

document.addEventListener('DOMContentLoaded', () => {
    // Event delegation for product card image hover
    document.body.addEventListener('mouseover', function (e) {
        // Kiểm tra nếu đang di chuột vào ô màu sắc
        if (e.target.classList.contains('swatch')) {
            handleGlobalSwatchClick(e.target);
            return;
        }

        const productCard = e.target.closest('.product-card');
        if (productCard) {
            const imgElement = productCard.querySelector('.card-img img');
            // Chỉ hiện ảnh hover nếu không phải đang di chuột trong khu vực chọn màu
            if (imgElement && imgElement.dataset.hoverImage && !e.target.closest('.color-swatches')) {
                imgElement.src = imgElement.dataset.hoverImage;
            }
        }
    });

    document.body.addEventListener('mouseout', function (e) {
        const productCard = e.target.closest('.product-card');
        if (productCard) {
            const imgElement = productCard.querySelector('.card-img img');
            if (imgElement && imgElement.dataset.mainImage) {
                imgElement.src = imgElement.dataset.mainImage;
            }
        }
    });

    // Event delegation for color swatch click
    document.body.addEventListener('click', function (e) {
        if (e.target.classList.contains('swatch')) {
            handleGlobalSwatchClick(e.target);
        }
    });
});

window.openQuickView = function (productId) {
    const product = (window.products || []).find(p => p.id == productId);
    if (!product) return;

    const modal = document.getElementById('quickview-modal');
    if (!modal) return;

    document.getElementById('qv-img').src = product.images[0];
    document.getElementById('qv-name').innerText = product.name;
    document.getElementById('qv-price').innerText = product.price;
    document.getElementById('qv-desc').innerText = product.description || "Mô tả sản phẩm đang được cập nhật...";

    const addBtn = document.getElementById('qv-add-btn');
    addBtn.onclick = function () {
        if (typeof addToCart === 'function') {
            addToCart(product.id);
            if (typeof showCart === 'function') showCart();
            closeQuickView();
        }
    };

    modal.style.display = 'flex';
};

window.closeQuickView = function () {
    const modal = document.getElementById('quickview-modal');
    if (modal) modal.style.display = 'none';
};

// Đóng modal khi click ra ngoài
window.addEventListener('click', function (event) {
    const modal = document.getElementById('quickview-modal');
    if (event.target == modal) {
        closeQuickView();
    }
});

function handleGlobalSwatchClick(swatch) {
    const card = swatch.closest('.product-card'); // Only target product-card for now
    if (!card) return; // Ensure we are inside a product card
    const mainImg = card.querySelector('.card-img img');
    const newSrc = swatch.getAttribute('data-image');
    if (mainImg && newSrc && mainImg.src !== newSrc) {
        // Cập nhật lại thuộc tính ảnh chính ngay lập tức để đồng bộ với sự kiện mouseout
        mainImg.dataset.mainImage = newSrc;

        mainImg.style.opacity = '0';
        setTimeout(() => {
            mainImg.src = newSrc;
            mainImg.style.opacity = '1';
        }, 200);
        card.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
    }
}