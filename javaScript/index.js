var currentSlide = 1;

window.addEventListener("load", function () {
    // slider not run in small window
    renderFeaturedOffers(); // Kích hoạt hiển thị Voucher
    if (window.innerWidth > 767) {
        if (document.querySelectorAll(".slider .slide-content").length > 0) {
            theChecker();
            playSlider();
        }
    }
    getTrendingProducts();
    getCollections(); // Gọi hàm tải bộ sưu tập Đông và Collab
    initParallax();
    initReveal(); // QUAN TRỌNG: Phải gọi hàm này để các phần tử .reveal hiện lên
    setupHomeEventDelegation(); // Thiết lập Event Delegation cho trang chủ
});

function nextSlider() {
    const btnNext = document.querySelector(".next");
    if (!btnNext.classList.contains('disabled')) { currentSlide++; theChecker(); }
}

function prevSlider() {
    const btnPrev = document.querySelector(".prev");
    if (!btnPrev.classList.contains('disabled')) { currentSlide--; theChecker(); }
}

function theChecker() {
    var imgSlider = document.querySelectorAll(".slide-content");
    var btnNext = document.getElementsByClassName("next")[0];
    var btnPrev = document.getElementsByClassName("prev")[0];

    // Xóa active của tất cả các slide
    for (let i = 0; i < imgSlider.length; i++) {
        imgSlider[i].classList.remove('active');
    }

    // Kích hoạt slide hiện tại
    imgSlider[currentSlide - 1].classList.add('active');

    btnPrev.classList.toggle('disabled', currentSlide === 1);
    btnNext.classList.toggle('disabled', currentSlide === imgSlider.length);
}
function playSlider() {
    var imgSlider = document.querySelectorAll(".slide-content");
    setInterval(function () {
        if (currentSlide < imgSlider.length) {
            currentSlide++;
        } else {
            currentSlide = 1;
        }
        theChecker();
    }, 3000);
}

async function getTrendingProducts() {
    // Hiện skeleton cho 4 sản phẩm trending
    showSkeletons(".top_products .products", 4);

    try {
        let response = await fetch('json/products.json');
        if (!response.ok) throw new Error("Không thể tải dữ liệu sản phẩm");

        const data = await response.json();
        window.products = data; // Gán vào window để các file JS khác (như cart.js) truy cập được
        let trendingProducts = data.filter(product => product.isTrending);

        setTimeout(() => {
            displayTrendingProducts(trendingProducts);
        }, 500);
    } catch (error) {
        console.error("Lỗi khi tải sản phẩm trending:", error);
    }
}

async function getCollections() {
    // Hiện skeleton cho các khung grid của bộ sưu tập
    showSkeletons("#summer-grid", 4);
    showSkeletons("#winter-grid", 4);
    showSkeletons("#collab-grid", 4);

    try {
        let response = await fetch('json/products.json');
        if (!response.ok) throw new Error("Không thể tải dữ liệu sản phẩm");

        const data = await response.json();
        if (!window.products) window.products = data; // Populated shared window.products if not yet set

        const summerGrid = document.getElementById('summer-grid');
        const winterGrid = document.getElementById('winter-grid');
        const collabGrid = document.getElementById('collab-grid');

        const renderCollection = (grid, collectionName) => {
            if (!grid) return;
            const products = data.filter(p => p.collection === collectionName);
            grid.innerHTML = products.map(product => {
                return window.createProductCard(product);
            }).join('');
        };

        setTimeout(() => {
            renderCollection(summerGrid, 'Summer');
            renderCollection(winterGrid, 'Winter');
            renderCollection(collabGrid, 'Collab');
        }, 600);
    } catch (error) {
        console.error("Lỗi khi tải bộ sưu tập:", error);
    }
}

function showSkeletons(selector, count) {
    let skeletonHTML = '';
    for (let i = 0; i < count; i++) {
        skeletonHTML += `
        <div class="skeleton-card">
            <div class="skeleton-img shimmer"></div>
            <div class="skeleton-text shimmer"></div>
            <div class="skeleton-price shimmer"></div>
        </div>`;
    }
    document.querySelector(selector).innerHTML = skeletonHTML;
}

function displayTrendingProducts(trendingProducts) {
    const container = document.querySelector(".top_products .products");
    if (!container) return;

    container.innerHTML = trendingProducts.map(product => {
        return window.createProductCard(product);
    }).join('');
}

function setupHomeEventDelegation() {
    // Mở rộng phạm vi lắng nghe cho toàn bộ main để bao phủ tất cả sản phẩm
    document.addEventListener('click', function (event) {
        const cartBtn = event.target.closest('.addToCart, .add-to-cart-overlay');
        const swatch = event.target.closest('.swatch');
        const quickView = event.target.closest('.btn-quick-view');
        // Hỗ trợ cả thẻ voucher-card mới
        const productCard = event.target.closest('.product-card, .fashion-card, .voucher-card');

        if (cartBtn) {
            event.preventDefault();
            event.stopPropagation();
            if (productCard && productCard.dataset.id) {
                addToCart(String(productCard.dataset.id)); // Ensure ID is string for consistency
                showCart();
            }
        } else if (swatch || quickView) {
            // Các hàm initColorSwatches và openQuickView sẽ tự xử lý
        } else if (productCard && productCard.dataset.id) {
            // Chuyển đến trang chi tiết
            displayDetails(productCard.dataset.id);
        }
    });
}

/**
 * Hiển thị các sản phẩm có Voucher ưu đãi trên trang chủ
 */
async function renderFeaturedOffers() {
    const grid = document.getElementById('featured-offers-grid');
    if (!grid) return;

    try {
        let response = await fetch('json/products.json');
        const allProducts = await response.json();
        const claimedVouchers = JSON.parse(localStorage.getItem('claimed_vouchers')) || [];

        // Lấy 3 sản phẩm đầu tiên làm ví dụ cho chương trình ưu đãi
        const offerProducts = allProducts.slice(0, 3);
        const discountValues = [100000, 200000, 150000]; // Các mức giảm tương ứng

        let html = '';
        offerProducts.forEach((product, index) => {
            const discount = discountValues[index];
            // Kiểm tra xem voucher này đã được nhận chưa
            const isClaimed = claimedVouchers.some(v => v.productId == product.id && !v.used);
            const btnText = isClaimed ? 'Đã nhận' : 'Nhận mã ngay';
            const btnClass = isClaimed ? 'btn-claim-voucher claimed' : 'btn-claim-voucher';

            html += `
                <div class="voucher-card reveal fade-up" data-delay="${index * 200}" data-id="${product.id}" style="cursor:pointer">
                    <img src="${product.images[0]}" alt="${product.name}" class="voucher-img">
                    <div class="voucher-info">
                        <h4>Ưu đãi ${product.name}</h4>
                        <p class="voucher-discount">Giảm ngay ${discount.toLocaleString('vi-VN')}đ</p>
                        <button class="${btnClass}" onclick="claimHomeVoucher(${product.id}, ${discount}, '${product.name}', this)">${btnText}</button>
                    </div>
                </div>`;
        });
        grid.innerHTML = html;

        // Khởi tạo lại hiệu ứng reveal cho các phần tử mới thêm vào
        if (typeof initReveal === 'function') initReveal();
    } catch (error) {
        console.error("Lỗi khi tải ưu đãi:", error);
    }
}

window.claimHomeVoucher = function (productId, discount, productName, btn) {
    let claimed = JSON.parse(localStorage.getItem('claimed_vouchers')) || [];

    if (claimed.some(v => v.productId == productId && !v.used)) {
        alert(`Bạn đã sở hữu voucher của "${productName}" trong ví rồi!`); // Changed alert message for clarity
        if (btn) {
            btn.innerText = "Đã nhận";
            btn.classList.add("claimed");
        }
        return;
    }

    claimed.push({ productId, discount, used: false });
    localStorage.setItem('claimed_vouchers', JSON.stringify(claimed));

    alert(`Chúc mừng! Bạn đã nhận voucher giảm ${discount.toLocaleString('vi-VN')}đ cho sản phẩm "${productName}".`);

    // Đổi trạng thái nút ngay lập tức
    if (btn) {
        btn.innerText = "Đã nhận";
        btn.classList.add("claimed");
    }
    if (typeof updateVoucherBadge === 'function') updateVoucherBadge();
};
function displayDetails(productId) {
    window.location.href = `ProductDetails.html?id=${productId}`;
}

window.openQuickView = function (productId) {
    const product = window.products.find(p => p.id == productId);
    if (!product) return;
    // Ensure window.parsePrice is available for cart.js
    document.getElementById('qv-img').src = product.images[0];
    document.getElementById('qv-name').innerText = product.name;
    document.getElementById('qv-price').innerText = product.price;
    document.getElementById('qv-desc').innerText = product.description || "Mô tả sản phẩm đang được cập nhật...";

    const addBtn = document.getElementById('qv-add-btn');
    addBtn.onclick = function () {
        addToCart(product.id);
        showCart();
        closeQuickView();
    };

    document.getElementById('quickview-modal').style.display = 'flex';
};

window.closeQuickView = function () {
    document.getElementById('quickview-modal').style.display = 'none';
};

// Đóng modal khi click ra ngoài vùng modal-content
window.onclick = function (event) {
    const modal = document.getElementById('quickview-modal');
    if (event.target == modal) {
        closeQuickView();
    }
};

function initReveal() {
    const reveals = document.querySelectorAll(".reveal");

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;

                // Thiết lập delay thủ công từ thuộc tính data-delay nếu có
                if (el.dataset.delay) {
                    el.style.transitionDelay = el.dataset.delay + "ms";
                }

                el.classList.add("active");

                // Tự động tạo hiệu ứng hiện lần lượt cho các phần tử con .reveal-item
                const items = el.querySelectorAll('.reveal-item');
                items.forEach((item, index) => {
                    item.style.transitionDelay = `${(index + 1) * 150}ms`;
                });

                // Sau khi hiện xong thì ngừng theo dõi phần tử này để tăng hiệu năng
                observer.unobserve(el);
            }
        });
    }, {
        threshold: 0.15 // Kích hoạt khi 15% phần tử xuất hiện
    });

    reveals.forEach(reveal => revealObserver.observe(reveal));
}

function initParallax() {
    window.addEventListener('scroll', function () {
        const parallaxImgs = document.querySelectorAll('.parallax-img');
        const viewportHeight = window.innerHeight;

        parallaxImgs.forEach(img => {
            const speed = parseFloat(img.dataset.speed) || 0.5;
            const container = img.parentElement;
            const rect = container.getBoundingClientRect();

            if (rect.top < viewportHeight && rect.bottom > 0) {
                // Tính toán vị trí dựa trên phần trăm hiển thị của container trong viewport
                const scrollProgress = (viewportHeight - rect.top) / (viewportHeight + rect.height);
                const yOffset = (scrollProgress - 0.5) * (rect.height * speed);
                img.style.transform = `translateY(${yOffset}px)`;
            }
        });
    });
}