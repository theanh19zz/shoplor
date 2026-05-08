let productsContainer = [];
let linkName = document.getElementsByClassName("categories_link");
let currentCategory = null;
let minPrice = 0;
let maxPrice = 8000000;
const priceGap = 500000; // Khoảng cách tối thiểu giữa 2 đầu kéo
let currentCollection = null;
let currentColor = 'all';
let currentSize = 'all';

const urlParams = new URLSearchParams(window.location.search);
let urlCollection = urlParams.get('collection');
let urlCategory = urlParams.get('category');

// Nếu có bộ sưu tập trên URL, ưu tiên nó và đặt category về 'all'
currentCollection = urlCollection;
currentCategory = urlCollection ? 'all' : (urlCategory || 'all');

getData();
async function getData(category = undefined) {
    try {
        let response = await fetch('json/products.json');
        if (!response.ok) throw new Error(`Không tìm thấy file (Mã lỗi: ${response.status})`);

        const json = await response.json();
        const shopInventory = JSON.parse(localStorage.getItem('shop_inventory')) || [];

        // Tạo một danh sách sản phẩm "phẳng" từ JSON, mỗi biến thể màu là một sản phẩm riêng
        let flattenedJsonProducts = [];
        json.forEach(p => {
            // Bỏ qua các sản phẩm không có ảnh ngay từ bước nạp dữ liệu JSON
            if (!p.images || !Array.isArray(p.images) || p.images.length === 0 || !p.images[0]) return;

            const pId = p.id || 'sp-' + Math.floor(Math.random() * 1000);
            const colors = (p.colors && p.colors.length > 0) ? p.colors : ["Mặc định"];
            colors.forEach((color, colorIdx) => {
                flattenedJsonProducts.push({
                    ...p,
                    variantId: `${pId}-${color}`,
                    color: color,
                    colorIndex: colorIdx, // Lưu vị trí màu để lấy ảnh chính xác sau khi gộp
                    images: p.images || ['images/default.jpg'], // Đảm bảo luôn có ảnh
                    stock: p.stock || 20 // Stock mặc định từ JSON
                });
            });
        });

        // Merge data: Ưu tiên dữ liệu từ Admin (localStorage) cho từng variantId
        let mergedProducts = flattenedJsonProducts.map(p => {
            const adminData = shopInventory.find(si => si.variantId === p.variantId);
            return adminData ? {
                ...p,
                ...adminData,
                description: adminData.description || p.description // Ưu tiên mô tả từ adminData
            } : p; // Ghi đè stock và các trường khác từ Admin
        });

        // Bổ sung sản phẩm mới từ Admin (nếu có)
        shopInventory.forEach(si => {
            // Nếu variantId này không có trong danh sách từ JSON, thêm vào
            if (!mergedProducts.some(mp => mp.variantId === si.variantId)) {
                mergedProducts.push(si);
            } // Không cần thêm fallback description ở đây vì đã xử lý ở ProductDetails.js
            // và si (sản phẩm ký gửi) nên có trường description.
            // Nếu si không có description, ProductDetails.js sẽ cung cấp fallback.

        });

        window.products = mergedProducts;
        if (category !== undefined) currentCategory = category;

        let filteredProducts = JSON.parse(JSON.stringify(mergedProducts)); // Deep copy để tránh tham chiếu

        // 1. Lọc theo Bộ sưu tập (Collection) - Ưu tiên hàng đầu và Tuyệt đối
        if (currentCollection && currentCollection !== 'null' && currentCollection.trim() !== "") {
            console.log('Tham số Collection từ URL:', currentCollection);

            // Lọc tuyệt đối: Khớp hoàn toàn chuỗi (không dùng includes, không fallback)
            filteredProducts = filteredProducts.filter(product =>
                product.collection &&
                String(product.collection).toLowerCase().trim() === currentCollection.toLowerCase().trim()
            );
            currentCategory = 'all'; // Đảm bảo không bị chồng chéo danh mục
            console.log('Số lượng sản phẩm lọc được theo BST:', filteredProducts.length);
        }
        // 2. Lọc theo danh mục (Chỉ chạy khi KHÔNG có tham số Collection để tránh chồng chéo)
        else if (currentCategory && currentCategory !== 'all') {
            filteredProducts = filteredProducts.filter(product =>
                product.category && String(product.category).toLowerCase().trim() === String(currentCategory).toLowerCase().trim()
            );
        }

        // 2. Lọc theo tìm kiếm
        const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || "";
        if (searchTerm) {
            filteredProducts = filteredProducts.filter(product =>
                product.name.toLowerCase().includes(searchTerm)
            );
        }

        // 3. Lọc theo màu sắc
        if (currentColor && currentColor !== 'all') {
            filteredProducts = filteredProducts.filter(product => // Lọc theo màu của biến thể
                product.color === currentColor
            );
        }

        // 3.5 Lọc theo kích cỡ
        if (currentSize && currentSize !== 'all') {
            filteredProducts = filteredProducts.filter(product => // Lọc theo kích cỡ của biến thể
                product.sizes && product.sizes.includes(currentSize) // Giả định sizes là mảng các size có sẵn cho biến thể đó
            );
        }

        // 4. Lọc theo khoảng giá
        filteredProducts = filteredProducts.filter(product => {
            const price = window.parsePrice(product.price) || 0;
            return price >= minPrice && price <= maxPrice;
        });

        // 5. Sắp xếp
        const sortValue = document.getElementById('sort')?.value;
        if (sortValue === 'PriceLowToHigh') {
            filteredProducts.sort((a, b) => window.parsePrice(a.price) - window.parsePrice(b.price));
        } else if (sortValue === 'PriceHighToLow') {
            filteredProducts.sort((a, b) => window.parsePrice(b.price) - window.parsePrice(a.price));
        } else if (sortValue === 'Alphabetically') {
            filteredProducts.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
        } else if (sortValue === 'Featured') {
            filteredProducts.sort((a, b) => (b.isTrending ? 1 : 0) - (a.isTrending ? 1 : 0));
        } else if (sortValue === 'Newest') {
            filteredProducts.sort((a, b) => b.id - a.id);
        }

        // 6. Nhóm (Group) các sản phẩm trùng ID lại thành một card duy nhất
        const groupProducts = (products) => {
            const groupedMap = new Map();

            products.forEach(p => {
                const key = String(p.id);
                if (!groupedMap.has(key)) {
                    // Tạo đối tượng gốc, khởi tạo lại mảng colors và images để gộp dữ liệu
                    groupedMap.set(key, {
                        ...p,
                        colors: [],
                        images: []
                    });
                }
                const gp = groupedMap.get(key);

                // Nếu variant này có màu và chưa được thêm vào card này
                if (p.color && !gp.colors.includes(p.color)) {
                    gp.colors.push(p.color);

                    // Đồng bộ hình ảnh: Lấy bộ ảnh của màu này đưa vào mảng images của card gộp
                    // Quy ước dự án: mỗi màu có 3 ảnh. 
                    const startIdx = (p.colorIndex !== undefined) ? p.colorIndex * 3 : 0;
                    const variantImages = p.images.slice(startIdx, startIdx + 3);
                    gp.images.push(...variantImages);
                }
            });
            return Array.from(groupedMap.values());
        };

        filteredProducts = groupProducts(filteredProducts);

        console.log('Danh sách sản phẩm lọc được (đã gộp):', filteredProducts);
        productsContainer = filteredProducts;

        updateFilterNotification();
        highlightActiveFilters(); // Highlight active filters based on currentCategory/Collection
        updateCategoryBadges(mergedProducts); // Update badges based on merged data

        displayProducts();
        updateAppliedTags();

    } catch (e) {
        console.error("Lỗi dữ liệu:", e.message);
        let errorMsg = e.name === 'SyntaxError'
            ? "Lỗi cấu trúc file JSON (Thiếu dấu ngoặc hoặc dấu phẩy)."
            : "Lỗi kết nối. Vui lòng chạy website bằng Live Server.";

        document.querySelector('.products .content').innerHTML =
            `<p style="text-align:center; width:100%; color:red; padding: 20px;">${errorMsg}</p>`;
    }
}

function updateCategoryBadges(allProducts) {
    if (!allProducts) return;
    const counts = {};
    allProducts.forEach(p => {
        counts[p.category] = (counts[p.category] || 0) + 1;
    }); // Đếm số lượng sản phẩm gốc, không phải biến thể

    const badges = document.querySelectorAll('.category-badge');
    // Xóa class active cũ
    document.querySelectorAll('.categories_link').forEach(link => link.classList.remove('active'));

    badges.forEach(badge => {
        const cat = badge.getAttribute('data-category');
        badge.innerText = counts[cat] || 0;

        // Highlight danh mục hiện tại
        if (cat === currentCategory) {
            const parentLink = badge.closest('.categories_link');
            if (parentLink) parentLink.classList.add('active');
        }
    });
}

function updateFilterNotification() {
    const notification = document.getElementById('filter-notification');
    if (!notification) return;

    if (currentCollection) {
        notification.innerHTML = `
            <div style="margin-bottom: 20px; font-size: 14px; background: #fff; padding: 12px 20px; border-radius: 8px; border: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; box-shadow: var(--shadow-sm);">
                <span><ion-icon name="funnel-outline" style="vertical-align: middle; margin-right: 5px;"></ion-icon> Đang xem: <strong>Bộ sưu tập ${currentCollection}</strong></span>
                <button onclick="resetAllFilters()" style="background: none; border: none; color: var(--primary-color); cursor: pointer; text-decoration: underline; font-weight: 600; font-size: 13px;">Xóa tất cả bộ lọc</button>
            </div>
        `;
    } else {
        notification.innerHTML = '';
    }
}

function highlightActiveFilters() {
    // Xóa active cũ trước khi highlight mới
    document.querySelectorAll('.categories_link, .sub-filter a').forEach(l => l.classList.remove('active'));

    if (!currentCollection && currentCategory === 'all') return;

    // Tự động tìm các link có chứa tên bộ sưu tập (ví dụ link Mùa hè hoặc link Collection)
    document.querySelectorAll('.categories_link, .sub-filter a').forEach(link => {
        const linkCat = link.getAttribute('productCategory');
        const linkText = link.textContent.toLowerCase();

        if (currentCollection && linkText.includes(currentCollection.toLowerCase())) {
            link.classList.add('active');
        } else if (!currentCollection && linkCat === currentCategory) {
            link.classList.add('active');
        }
    });
}

function displayProducts() {
    const contentContainer = document.querySelector('.products .content');
    if (!contentContainer) return;

    if (productsContainer.length === 0) {
        contentContainer.innerHTML = `
        <div class="no-products">
            <ion-icon name="search-outline"></ion-icon>
            <h3>Không tìm thấy sản phẩm</h3>
            <p>Rất tiếc, không có sản phẩm nào khớp với lựa chọn của bạn. Hãy thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
        </div>`;
        document.getElementById("productCount").innerHTML = `0 Products`;
        return;
    }

    const htmlContent = productsContainer.map(product => {
        return window.createProductCard(product);
    }).join('');

    document.getElementById("productCount").innerHTML = `${productsContainer.length} Products`;
    contentContainer.innerHTML = htmlContent;
}

const searchInput = document.getElementById('searchInput');
const searchBox = searchInput?.parentElement;
let historyDropdown;

if (searchInput) {
    // Tạo container cho dropdown lịch sử
    historyDropdown = document.createElement('div');
    historyDropdown.className = 'search-history-dropdown';
    if (searchBox) searchBox.appendChild(historyDropdown);

    searchInput.addEventListener('input', () => {
        historyDropdown.style.display = 'none';
        getData();
    });

    // Lưu lịch sử tìm kiếm khi người dùng nhấn Enter
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const term = e.target.value.trim();
            if (term) {
                saveSearchHistory(term);
                historyDropdown.style.display = 'none';
            }
        }
    });

    // Hiển thị lịch sử khi click vào ô tìm kiếm
    searchInput.addEventListener('focus', showSearchHistory);

    // Đóng dropdown khi click ra ngoài
    document.addEventListener('click', (e) => {
        if (searchBox && !searchBox.contains(e.target)) {
            historyDropdown.style.display = 'none';
        }
    });
}

function showSearchHistory() {
    const email = localStorage.getItem('email') || 'guest';
    const storageKey = `search_history_${email}`;
    const history = JSON.parse(localStorage.getItem(storageKey)) || [];

    if (history.length === 0) {
        historyDropdown.style.display = 'none';
        return;
    }

    historyDropdown.innerHTML = history.map(term => `
        <div class="search-history-item" data-term="${term}">
            <span class="term-text"><ion-icon name="time-outline" style="margin-right:8px; vertical-align:middle;"></ion-icon>${term}</span>
            <span class="delete-history-btn" title="Xóa">
                <ion-icon name="close-circle-outline"></ion-icon>
            </span>
        </div>
    `).join('');

    historyDropdown.style.display = 'block';

    // Sự kiện click vào item hoặc nút xóa
    historyDropdown.querySelectorAll('.search-history-item').forEach(item => {
        const term = item.dataset.term;

        // Click vào chữ để tìm kiếm
        item.onclick = () => {
            searchInput.value = term;
            historyDropdown.style.display = 'none';
            getData();
        };

        // Click vào nút X để xóa
        item.querySelector('.delete-history-btn').onclick = (e) => {
            e.stopPropagation(); // Ngăn sự kiện tìm kiếm
            removeHistoryItem(term);
        };
    });
}

function removeHistoryItem(term) {
    const email = localStorage.getItem('email') || 'guest';
    const storageKey = `search_history_${email}`;
    let history = JSON.parse(localStorage.getItem(storageKey)) || [];
    history = history.filter(h => h !== term);
    localStorage.setItem(storageKey, JSON.stringify(history));
    showSearchHistory(); // Cập nhật lại danh sách hiển thị
}

function saveSearchHistory(term) {
    const email = localStorage.getItem('email') || 'guest';
    const storageKey = `search_history_${email}`;

    let history = JSON.parse(localStorage.getItem(storageKey)) || [];

    // Xóa từ khóa cũ nếu trùng để đưa từ khóa mới nhất lên đầu danh sách
    history = history.filter(h => h.toLowerCase() !== term.toLowerCase());
    history.unshift(term);

    // Giới hạn lưu trữ 10 từ khóa gần nhất để tiết kiệm bộ nhớ
    localStorage.setItem(storageKey, JSON.stringify(history.slice(0, 10)));
}

document.getElementById('sort')?.addEventListener('change', () => {
    getData();
});

function getCategory(e) {
    let category = e.currentTarget.getAttribute('productCategory');
    currentCollection = null; // Xóa lọc bộ sưu tập khi chọn danh mục thủ công
    setActiveLink(e.currentTarget);
    try {
        getData(category);
    } catch (e) {
        console.log("not found")
    }
    if (window.innerWidth <= 768) {
        // to close when use select category
        toggleSidebar();
    }
}
function setActiveLink(activeLink) {
    Array.from(linkName).forEach(link => {
        link.classList.remove('active');
    });
    activeLink.classList.add('active');
}

window.initFilters = function () {
    // Lắng nghe click danh mục
    Array.from(linkName).forEach(element => {
        element.addEventListener('click', getCategory);
    });

    // Lắng nghe click Màu sắc
    document.querySelectorAll('.color-circle').forEach(circle => {
        circle.addEventListener('click', (e) => {
            currentColor = e.currentTarget.getAttribute('data-color');
            document.querySelectorAll('.color-circle').forEach(c => c.classList.remove('active'));
            e.currentTarget.classList.add('active');
            getData();
        });
    });

    // Lắng nghe click Kích cỡ
    document.querySelectorAll('.size-box').forEach(box => {
        box.addEventListener('click', (e) => {
            currentSize = e.currentTarget.getAttribute('data-size');
            document.querySelectorAll('.size-box').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            getData();
        });
    });

    // Lắng nghe click nút Xóa tất cả
    document.querySelector('.clear-all')?.addEventListener('click', resetAllFilters);
}

/**
 * Cập nhật các thẻ tag hiển thị bộ lọc đang áp dụng
 */
function updateAppliedTags() {
    const tagContainer = document.querySelector('.applied-tags');
    if (!tagContainer) return;

    const clearBtn = tagContainer.querySelector('.clear-all');
    const tags = [];

    // Tag cho Danh mục
    if (currentCategory && currentCategory !== 'all') {
        tags.push(`<div class="filter-tag" data-type="category">${currentCategory} <ion-icon name="close-outline"></ion-icon></div>`);
    } // Tag cho Bộ sưu tập

    // Tag cho Bộ sưu tập
    if (currentCollection) {
        tags.push(`<div class="filter-tag" data-type="collection">BST: ${currentCollection} <ion-icon name="close-outline"></ion-icon></div>`);
    }

    if (currentColor !== 'all') tags.push(`<div class="filter-tag" data-type="color">Màu: ${currentColor} <ion-icon name="close-outline"></ion-icon></div>`);
    if (currentSize !== 'all') tags.push(`<div class="filter-tag" data-type="size">Size: ${currentSize} <ion-icon name="close-outline"></ion-icon></div>`);

    // Tag cho Khoảng giá (chỉ hiện khi khác mặc định)
    if (minPrice > 0 || maxPrice < 8000000) {
        tags.push(`<div class="filter-tag" data-type="price">${minPrice.toLocaleString()}đ - ${maxPrice.toLocaleString()}đ <ion-icon name="close-outline"></ion-icon></div>`);
    }

    // Render tags
    tagContainer.querySelectorAll('.filter-tag').forEach(el => el.remove());
    tags.forEach(tagHTML => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = tagHTML;
        const tagEl = tempDiv.firstChild;

        // Thêm sự kiện xóa tag
        tagEl.querySelector('ion-icon').addEventListener('click', function (e) {
            const type = tagEl.dataset.type;
            if (type === 'category') {
                currentCategory = 'all';
                document.querySelectorAll('.categories_link').forEach(l => l.classList.remove('active'));
                document.querySelector('.categories_link[productCategory="all"]')?.classList.add('active');
            } else if (type === 'collection') {
                currentCollection = null;
            } else if (type === 'price') {
                minPrice = 0;
                maxPrice = 8000000;
                resetPriceSliderUI();
            } else if (type === 'color') {
                currentColor = 'all';
                document.querySelectorAll('.color-circle').forEach(c => c.classList.remove('active'));
            } else if (type === 'size') {
                currentSize = 'all';
                document.querySelectorAll('.size-box').forEach(b => b.classList.remove('active'));
            }
            getData();
        });

        tagContainer.insertBefore(tagEl, clearBtn);
    });
}

/**
 * Đưa toàn bộ bộ lọc về trạng thái mặc định
 */
function resetAllFilters() {
    // 1. Reset các biến logic
    currentCategory = 'all';
    currentCollection = null;
    minPrice = 0;
    maxPrice = 8000000;
    currentColor = 'all';
    currentSize = 'all';
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = "";

    // 2. Cập nhật UI - Xóa trạng thái active của tất cả các nút
    document.querySelectorAll('.categories_link, .color-circle, .size-box').forEach(el => el.classList.remove('active'));
    document.querySelector('.categories_link[productCategory="all"]')?.classList.add('active');

    // 5. Cập nhật UI - Thanh trượt giá
    resetPriceSliderUI();

    // 7. Tải lại dữ liệu
    getData();
}

function resetPriceSliderUI() {
    const rangeInput = document.querySelectorAll(".range-input input");
    const priceInput = document.querySelectorAll(".price-input input");
    const progress = document.querySelector(".slider .progress");

    if (rangeInput.length && priceInput.length && progress) {
        rangeInput[0].value = 0;
        rangeInput[1].value = 8000000;
        priceInput[0].value = 0;
        priceInput[1].value = 8000000;
        progress.style.left = "0%";
        progress.style.right = "0%";
    }
}

initFilters();

/**
 * Khởi tạo logic cho thanh trượt giá (Price Range Slider)
 * Xử lý kéo thả và cập nhật ô nhập số
 */
window.initPriceSlider = function () {
    const rangeInput = document.querySelectorAll(".range-input input");
    const priceInput = document.querySelectorAll(".price-input input");
    const progress = document.querySelector(".slider .progress");

    if (!rangeInput[0] || !rangeInput[1] || !progress) return;

    // Thiết lập vị trí ban đầu của thanh tiến trình (progress bar)
    const updateUI = () => {
        progress.style.left = (rangeInput[0].value / rangeInput[0].max) * 100 + "%";
        progress.style.right = 100 - (rangeInput[1].value / rangeInput[1].max) * 100 + "%";
        priceInput[0].value = rangeInput[0].value;
        priceInput[1].value = rangeInput[1].value;
    };

    updateUI();

    rangeInput.forEach(input => {
        input.addEventListener("input", e => {
            let minVal = parseInt(rangeInput[0].value),
                maxVal = parseInt(rangeInput[1].value);

            if (maxVal - minVal < priceGap) {
                if (e.target.className === "range-min") {
                    rangeInput[0].value = maxVal - priceGap;
                } else {
                    rangeInput[1].value = minVal + priceGap;
                }
            }
            priceInput[0].value = rangeInput[0].value;
            priceInput[1].value = rangeInput[1].value;
            progress.style.left = (rangeInput[0].value / rangeInput[0].max) * 100 + "%";
            progress.style.right = 100 - (rangeInput[1].value / rangeInput[1].max) * 100 + "%";
            minPrice = parseInt(rangeInput[0].value);
            maxPrice = parseInt(rangeInput[1].value);
            getData();
        });
    });

    priceInput.forEach(input => {
        input.addEventListener("input", e => {
            let minVal = parseInt(priceInput[0].value),
                maxVal = parseInt(priceInput[1].value);

            if ((maxVal - minVal >= priceGap) && maxVal <= parseInt(rangeInput[1].max)) {
                if (e.target.className === "input-min") {
                    rangeInput[0].value = minVal;
                    progress.style.left = (minVal / 8000000) * 100 + "%";
                } else {
                    rangeInput[1].value = maxVal;
                    progress.style.right = 100 - (maxVal / 8000000) * 100 + "%";
                }
                minPrice = minVal;
                maxPrice = maxVal;
                getData();
            }
        });
    });
}

initPriceSlider();

// Bổ sung bộ lắng nghe cho lọc màu sắc
function getColor(e) {
    e.preventDefault();
    currentColor = e.currentTarget.getAttribute('data-color');

    // Cập nhật class active cho UI
    const colorLinks = document.getElementsByClassName("color_link");
    Array.from(colorLinks).forEach(link => link.classList.remove('active'));
    e.currentTarget.classList.add('active');

    getData();
}

// Tối ưu: Sử dụng Event Delegation cho nút thêm vào giỏ hàng
function toggleSidebar() {
    var sidebar = document.querySelector(".filter-sidebar");
    sidebar.classList.toggle("open");
}

function displayDetails(productId) {
    window.location.href = `ProductDetails.html?id=${productId}`;
}

// Xử lý Event Delegation cho danh sách sản phẩm
document.querySelector('.products .content')?.addEventListener('click', function (event) {
    const cartBtn = event.target.closest('.addToCart');
    const swatch = event.target.closest('.swatch');
    const productCard = event.target.closest('.product-card');

    if (cartBtn) {
        event.preventDefault();
        event.stopPropagation(); // Ngăn không cho sự kiện click vào Card được kích hoạt
        const id_product = productCard ? productCard.dataset.id : null;
        if (id_product) {
            addToCart(id_product);
            // Đảm bảo gọi hàm showCart được định nghĩa trong cart.js
            if (typeof window.showCart === 'function') window.showCart();
        }
    } else if (swatch) {
        event.stopPropagation(); // Click vào chọn màu không chuyển trang
    } else if (productCard) {
        const id_product = productCard.dataset.id;
        if (id_product) displayDetails(id_product);
    }
});
