// Global Variables
let currentUser = null;
let allOrders = [];
let allProducts = [];
let allCategories = [];
let currentOrderFilter = 'all';
let currentEditingProduct = null;
let currentEditingCategory = null;
let currentOrderForStatus = null;
let orderSubscription = null;

// DOM Elements
const loginContainer = document.getElementById('loginContainer');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const ordersGrid = document.getElementById('ordersGrid');
const productsGrid = document.getElementById('adminProductsGrid');
const categoriesGrid = document.getElementById('adminCategoriesGrid');
const productModal = document.getElementById('productModal');
const categoryModal = document.getElementById('categoryModal');
const orderStatusModal = document.getElementById('orderStatusModal');
const notificationBell = document.getElementById('notificationBell');
const notificationCount = document.getElementById('notificationCount');
const pendingCount = document.getElementById('pendingCount');
const notificationSound = document.getElementById('notificationSound');

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin app initialized');
    checkAuthState();
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    // Login form
    loginForm.addEventListener('submit', handleLogin);
    
    // Product form
    document.getElementById('productForm').addEventListener('submit', handleProductSubmit);
    
    // Category form
    document.getElementById('categoryForm').addEventListener('submit', handleCategorySubmit);
    
    // Close modals when clicking outside
    productModal.addEventListener('click', function(e) {
        if (e.target === productModal) {
            closeProductModal();
        }
    });
    
    categoryModal.addEventListener('click', function(e) {
        if (e.target === categoryModal) {
            closeCategoryModal();
        }
    });
    
    orderStatusModal.addEventListener('click', function(e) {
        if (e.target === orderStatusModal) {
            closeOrderStatusModal();
        }
    });
}

// Check Authentication State
async function checkAuthState() {
    try {
        const { data: { session } } = await window.supabaseConfig.supabase.auth.getSession();
        
        if (session) {
            currentUser = session.user;
            showDashboard();
        } else {
            showLogin();
        }
    } catch (error) {
        console.error('Error checking auth state:', error);
        showLogin();
    }
}

// Show Login Screen
function showLogin() {
    loginContainer.style.display = 'flex';
    dashboard.style.display = 'none';
}

// Show Dashboard
function showDashboard() {
    loginContainer.style.display = 'none';
    dashboard.style.display = 'flex';
    
    // Load initial data
    loadOrders();
    loadProducts();
    loadCategories();
    
    // Setup realtime subscription
    setupRealtimeSubscription();
}

// Handle Login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> লগইন হচ্ছে...';
        hideLoginError();
        
        const { data, error } = await window.supabaseConfig.supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            throw error;
        }
        
        currentUser = data.user;
        showDashboard();
        
    } catch (error) {
        console.error('Login error:', error);
        showLoginError(getErrorMessage(error.message));
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> লগইন করুন';
    }
}

// Logout
async function logout() {
    try {
        // Cleanup subscription
        if (orderSubscription) {
            orderSubscription.unsubscribe();
        }
        
        await window.supabaseConfig.supabase.auth.signOut();
        currentUser = null;
        showLogin();
        
        // Clear form
        loginForm.reset();
        
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Show Login Error
function showLoginError(message) {
    loginError.textContent = message;
    loginError.classList.add('show');
}

// Hide Login Error
function hideLoginError() {
    loginError.classList.remove('show');
}

// Get Error Message in Bengali
function getErrorMessage(error) {
    const errorMessages = {
        'Invalid login credentials': 'ভুল ইমেইল বা পাসওয়ার্ড',
        'Email not confirmed': 'ইমেইল নিশ্চিত করুন',
        'Too many requests': 'অনেক বেশি চেষ্টা। পরে আবার চেষ্টা করুন',
        'Network error': 'ইন্টারনেট সংযোগ চেক করুন'
    };
    
    return errorMessages[error] || 'লগইন করতে সমস্যা হয়েছে। পরে আবার চেষ্টা করুন।';
}

// Switch Tabs
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');
    
    // Load data if needed
    if (tabName === 'orders') {
        loadOrders();
    } else if (tabName === 'products') {
        loadProducts();
    }
}

// Setup Realtime Subscription
function setupRealtimeSubscription() {
    orderSubscription = window.supabaseConfig.supabase
        .channel('orders')
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: window.supabaseConfig.TABLES.ORDERS 
        }, (payload) => {
            console.log('New order received:', payload);
            handleNewOrder(payload.new);
        })
        .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: window.supabaseConfig.TABLES.ORDERS 
        }, (payload) => {
            console.log('Order updated:', payload);
            handleOrderUpdate(payload.new);
        })
        .subscribe();
}

// Handle New Order
function handleNewOrder(order) {
    // Add to orders list
    allOrders.unshift(order);
    
    // Show notification
    showNewOrderNotification(order);
    
    // Play sound
    playNotificationSound();
    
    // Update display
    displayOrders();
    updateNotificationCount();
}

// Handle Order Update
function handleOrderUpdate(order) {
    // Update in orders list
    const index = allOrders.findIndex(o => o.id === order.id);
    if (index !== -1) {
        allOrders[index] = order;
        displayOrders();
        updateNotificationCount();
    }
}

// Show New Order Notification
function showNewOrderNotification(order) {
    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('নতুন অর্ডার!', {
            body: `অর্ডার #${order.id} - ৳${order.total_price}`,
            icon: '/favicon.ico'
        });
    }
    
    // Visual notification
    notificationBell.classList.add('has-notification');
    
    // Show toast
    showToast('নতুন অর্ডার এসেছে!', 'success');
}

// Play Notification Sound
function playNotificationSound() {
    try {
        notificationSound.currentTime = 0;
        notificationSound.play().catch(e => console.log('Could not play sound:', e));
    } catch (error) {
        console.log('Sound play error:', error);
    }
}

// Update Notification Count
function updateNotificationCount() {
    const pendingOrders = allOrders.filter(order => 
        order.status === window.supabaseConfig.ORDER_STATUS.PENDING
    ).length;
    
    pendingCount.textContent = pendingOrders;
    notificationCount.textContent = pendingOrders;
    
    if (pendingOrders > 0) {
        notificationCount.style.display = 'flex';
        pendingCount.style.display = 'inline-block';
    } else {
        notificationCount.style.display = 'none';
        pendingCount.style.display = 'none';
        notificationBell.classList.remove('has-notification');
    }
}

// Load Orders
async function loadOrders() {
    try {
        const { data, error } = await window.supabaseConfig.supabase
            .from(window.supabaseConfig.TABLES.ORDERS)
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            throw error;
        }
        
        allOrders = data || [];
        displayOrders();
        updateNotificationCount();
        
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
        
    } catch (error) {
        console.error('Error loading orders:', error);
        showToast('অর্ডার লোড করতে সমস্যা হয়েছে', 'error');
    }
}

// Display Orders
function displayOrders() {
    let filteredOrders = allOrders;
    
    if (currentOrderFilter !== 'all') {
        filteredOrders = allOrders.filter(order => order.status === currentOrderFilter);
    }
    
    if (filteredOrders.length === 0) {
        ordersGrid.style.display = 'none';
        document.getElementById('emptyOrders').style.display = 'block';
        return;
    }
    
    ordersGrid.style.display = 'grid';
    document.getElementById('emptyOrders').style.display = 'none';
    
    ordersGrid.innerHTML = filteredOrders.map(order => `
        <div class="order-card ${order.status}" data-id="${order.id}">
            <div class="order-header">
                <div>
                    <div class="order-id">অর্ডার #${order.id}</div>
                    <div class="order-time">${formatDateTime(order.created_at)}</div>
                </div>
                <div class="order-status ${order.status}">
                    ${window.supabaseConfig.STATUS_NAMES[order.status] || order.status}
                </div>
            </div>
            
            ${order.table_number || order.customer_name ? `
                <div class="order-info">
                    ${order.table_number ? `<span><i class="fas fa-table"></i> টেবিল: ${order.table_number}</span>` : ''}
                    ${order.table_number && order.customer_name ? ' | ' : ''}
                    ${order.customer_name ? `<span><i class="fas fa-user"></i> গ্রাহক: ${order.customer_name}</span>` : ''}
                </div>
            ` : ''}
            
            <div class="order-items">
                ${order.products.map(item => `
                    <div class="order-item">
                        <div>
                            <div class="item-name">${item.name}</div>
                            <div class="item-quantity">পরিমাণ: ${item.quantity}</div>
                        </div>
                        <div class="item-price">৳${item.price * item.quantity}</div>
                    </div>
                `).join('')}
            </div>
            
            <div class="order-total">
                <div class="total-label">মোট:</div>
                <div class="total-price">৳${order.total_price}</div>
            </div>
            
            <div class="order-actions">
                <button class="action-btn view" onclick="viewOrderDetails(${order.id})">
                    <i class="fas fa-eye"></i>
                    বিস্তারিত
                </button>
                ${order.status !== 'completed' ? `
                    <button class="action-btn update" onclick="showOrderStatusModal(${order.id})">
                        <i class="fas fa-edit"></i>
                        আপডেট
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Filter Orders
function filterOrders(status) {
    currentOrderFilter = status;
    
    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-status="${status}"]`).classList.add('active');
    
    displayOrders();
}

// View Order Details
function viewOrderDetails(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;
    
    showToast(`অর্ডার #${order.id} এর বিস্তারিত দেখানো হচ্ছে`, 'info');
}

// Show Order Status Modal
function showOrderStatusModal(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order || !order.id) {
        showToast('অর্ডার পাওয়া যায়নি', 'error');
        return;
    }
    
    currentOrderForStatus = order;
    
    const orderDetails = document.getElementById('orderDetails');
    orderDetails.innerHTML = `
        <div class="order-summary">
            <h3>অর্ডার #${order.id}</h3>
            <p><strong>সময়:</strong> ${formatDateTime(order.created_at)}</p>
            ${order.table_number ? `<p><strong>টেবিল:</strong> ${order.table_number}</p>` : ''}
            ${order.customer_name ? `<p><strong>গ্রাহক:</strong> ${order.customer_name}</p>` : ''}
            <p><strong>বর্তমান স্ট্যাটাস:</strong> ${window.supabaseConfig.STATUS_NAMES[order.status]}</p>
            <p><strong>মোট:</strong> ৳${order.total_price}</p>
        </div>
    `;
    
    orderStatusModal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

// Close Order Status Modal
function closeOrderStatusModal() {
    orderStatusModal.classList.remove('show');
    document.body.style.overflow = 'auto';
    currentOrderForStatus = null;
}

// Safe wrapper for updating order status
function safeUpdateOrderStatus(newStatus) {
    console.log('safeUpdateOrderStatus called with:', newStatus);
    
    // Double check that we have a valid order
    if (!currentOrderForStatus) {
        console.error('No order selected for status update');
        showToast('কোন অর্ডার নির্বাচিত নেই', 'error');
        return;
    }
    
    // Call the actual update function
    updateOrderStatus(newStatus);
}

// Update Order Status
async function updateOrderStatus(newStatus) {
    console.log('updateOrderStatus called with:', newStatus);
    console.log('currentOrderForStatus:', currentOrderForStatus);
    
    if (!currentOrderForStatus) {
        console.error('currentOrderForStatus is null');
        showToast('অর্ডার তথ্য পাওয়া যায়নি', 'error');
        closeOrderStatusModal();
        return;
    }
    
    if (!currentOrderForStatus.id) {
        console.error('currentOrderForStatus.id is null');
        showToast('অর্ডার ID পাওয়া যায়নি', 'error');
        closeOrderStatusModal();
        return;
    }
    
    try {
        const { data, error } = await window.supabaseConfig.supabase
            .from(window.supabaseConfig.TABLES.ORDERS)
            .update({ status: newStatus })
            .eq('id', currentOrderForStatus.id)
            .select();
        
        if (error) {
            throw error;
        }
        
        // Store order ID before closing modal
        const orderId = currentOrderForStatus.id;
        
        // Update local data
        const index = allOrders.findIndex(o => o.id === orderId);
        if (index !== -1) {
            allOrders[index].status = newStatus;
        }
        
        displayOrders();
        updateNotificationCount();
        closeOrderStatusModal();
        
        showToast(`অর্ডার #${orderId} এর স্ট্যাটাস আপডেট হয়েছে`, 'success');
        
    } catch (error) {
        console.error('Error updating order status:', error);
        showToast('স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে', 'error');
    }
}

// Load Products
async function loadProducts() {
    try {
        const { data, error } = await window.supabaseConfig.supabase
            .from(window.supabaseConfig.TABLES.PRODUCTS)
            .select('*');
        
        if (error) {
            throw error;
        }
        
        allProducts = data || [];
        
        // Sort products by priority
        allProducts.sort((a, b) => {
            const priorityOrder = {
                'most_selling': 1,
                'high': 2, 
                'medium': 3,
                'low': 4
            };
            
            const aPriority = priorityOrder[a.priority] || 4;
            const bPriority = priorityOrder[b.priority] || 4;
            
            if (aPriority !== bPriority) {
                return aPriority - bPriority;
            }
            
            // If same priority, sort by created_at (newest first)
            return new Date(b.created_at) - new Date(a.created_at);
        });
        
        displayProducts();
        
    } catch (error) {
        console.error('Error loading products:', error);
        showToast('পণ্য লোড করতে সমস্যা হয়েছে', 'error');
    }
}

// Display Products
function displayProducts() {
    if (allProducts.length === 0) {
        productsGrid.innerHTML = `
            <div class="empty-products">
                <i class="fas fa-utensils"></i>
                <h3>কোন পণ্য নেই</h3>
                <p>নতুন পণ্য যোগ করুন</p>
            </div>
        `;
        return;
    }
    
    productsGrid.innerHTML = allProducts.map(product => `
        <div class="admin-product-card ${product.priority || 'low'}">
            ${getPriorityBadge(product.priority)}
            <img src="${product.image_url || getPlaceholderImage()}" 
                 alt="${product.name}" 
                 class="admin-product-image"
                 onerror="handleImageError(this)">
            <div class="admin-product-info">
                <h3 class="admin-product-name">${product.name}</h3>
                <div class="admin-product-price">৳${product.price}</div>
                <span class="admin-product-category">
                    ${window.supabaseConfig.CATEGORY_NAMES[product.category] || product.category}
                </span>
                <div class="product-priority-display">
                    ${getPriorityText(product.priority)}
                </div>
                <div class="admin-product-actions">
                    <button class="edit-btn" onclick="editProduct(${product.id})">
                        <i class="fas fa-edit"></i>
                        সম্পাদনা
                    </button>
                    <button class="delete-btn" onclick="deleteProduct(${product.id})">
                        <i class="fas fa-trash"></i>
                        মুছুন
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Show Add Product Modal
function showAddProductModal() {
    currentEditingProduct = null;
    document.getElementById('productModalTitle').textContent = 'নতুন পণ্য যোগ করুন';
    document.getElementById('productForm').reset();
    productModal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

// Edit Product
function editProduct(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    
    currentEditingProduct = product;
    document.getElementById('productModalTitle').textContent = 'পণ্য সম্পাদনা করুন';
    
    // Fill form
    document.getElementById('productName').value = product.name;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productCategory').value = product.category;
    document.getElementById('productPriority').value = product.priority || 'low';
    document.getElementById('productImage').value = product.image_url || '';
    
    productModal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

// Close Product Modal
function closeProductModal() {
    productModal.classList.remove('show');
    document.body.style.overflow = 'auto';
    currentEditingProduct = null;
}

// Handle Product Submit
async function handleProductSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('productName').value;
    const price = parseFloat(document.getElementById('productPrice').value);
    const category = document.getElementById('productCategory').value;
    const priority = document.getElementById('productPriority').value;
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> সেভ হচ্ছে...';
        
        let image_url = null;
        
        // Check if user uploaded a file or provided URL
        const imageFile = document.getElementById('productImageFile').files[0];
        const imageUrlInput = document.getElementById('productImage').value;
        
        if (imageFile) {
            // Upload image to Supabase Storage
            image_url = await uploadImageToStorage(imageFile);
        } else if (imageUrlInput) {
            // Use provided URL
            image_url = imageUrlInput;
        }
        
        let result;
        
        if (currentEditingProduct) {
            // Update existing product
            result = await window.supabaseConfig.supabase
                .from(window.supabaseConfig.TABLES.PRODUCTS)
                .update({ name, price, category, priority, image_url })
                .eq('id', currentEditingProduct.id)
                .select();
        } else {
            // Add new product
            result = await window.supabaseConfig.supabase
                .from(window.supabaseConfig.TABLES.PRODUCTS)
                .insert([{ name, price, category, priority, image_url }])
                .select();
        }
        
        if (result.error) {
            throw result.error;
        }
        
        loadProducts();
        closeProductModal();
        
        const message = currentEditingProduct ? 'পণ্য আপডেট হয়েছে' : 'নতুন পণ্য যোগ হয়েছে';
        showToast(message, 'success');
        
    } catch (error) {
        console.error('Error saving product:', error);
        
        // More detailed error message
        let errorMessage = 'পণ্য সেভ করতে সমস্যা হয়েছে';
        if (error.message) {
            if (error.message.includes('permission')) {
                errorMessage = 'পারমিশন সমস্যা। অনুগ্রহ করে fix-admin-permissions.sql ফাইলটি রান করুন';
            } else if (error.message.includes('RLS')) {
                errorMessage = 'ডাটাবেস পারমিশন সমস্যা। RLS policy চেক করুন';
            } else if (error.message.includes('duplicate')) {
                errorMessage = 'এই নামের পণ্য আগে থেকেই আছে';
            }
        }
        
        showToast(errorMessage, 'error');
        console.log('Detailed error:', error);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save"></i> সেভ করুন';
    }
}

// Delete Product
async function deleteProduct(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    
    if (!confirm(`আপনি কি নিশ্চিত যে "${product.name}" পণ্যটি মুছে দিতে চান?`)) {
        return;
    }
    
    try {
        const { error } = await window.supabaseConfig.supabase
            .from(window.supabaseConfig.TABLES.PRODUCTS)
            .delete()
            .eq('id', productId);
        
        if (error) {
            throw error;
        }
        
        loadProducts();
        showToast('পণ্য মুছে দেওয়া হয়েছে', 'success');
        
    } catch (error) {
        console.error('Error deleting product:', error);
        showToast('পণ্য মুছতে সমস্যা হয়েছে', 'error');
    }
}

// Format Date Time
function formatDateTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'এইমাত্র';
    if (minutes < 60) return `${minutes} মিনিট আগে`;
    if (hours < 24) return `${hours} ঘন্টা আগে`;
    if (days < 7) return `${days} দিন আগে`;
    
    return date.toLocaleDateString('bn-BD', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Show Toast Notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideInRight 0.3s ease;
    `;
    
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    
    toast.style.background = colors[type] || colors.info;
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <i class="${icons[type] || icons.info}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 4000);
}

// Image Upload Functions
// ছবি আপলোড ফাংশন

// Switch between URL and Upload tabs
// URL এবং আপলোড ট্যাবের মধ্যে পরিবর্তন
function switchImageTab(tabType) {
    const urlSection = document.getElementById('urlSection');
    const uploadSection = document.getElementById('uploadSection');
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    // Remove active class from all tabs
    tabBtns.forEach(btn => btn.classList.remove('active'));
    
    if (tabType === 'url') {
        urlSection.style.display = 'block';
        uploadSection.style.display = 'none';
        document.querySelector('[onclick="switchImageTab(\'url\')"]').classList.add('active');
    } else {
        urlSection.style.display = 'none';
        uploadSection.style.display = 'block';
        document.querySelector('[onclick="switchImageTab(\'upload\')"]').classList.add('active');
    }
}

// Preview uploaded image
// আপলোড করা ছবি প্রিভিউ
function previewImage(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        
        // Check file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            showToast('ছবির সাইজ ৫MB এর কম হতে হবে', 'error');
            input.value = '';
            return;
        }
        
        // Check file type
        if (!file.type.startsWith('image/')) {
            showToast('শুধুমাত্র ছবি ফাইল আপলোড করুন', 'error');
            input.value = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('imagePreview');
            const img = document.getElementById('previewImg');
            
            img.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

// Remove image preview
// ছবি প্রিভিউ মুছে ফেলা
function removeImagePreview() {
    document.getElementById('productImageFile').value = '';
    document.getElementById('imagePreview').style.display = 'none';
}

// Upload image to Supabase Storage
// Supabase Storage এ ছবি আপলোড
async function uploadImageToStorage(file) {
    try {
        showToast('ছবি আপলোড হচ্ছে...', 'info');
        
        // Create unique filename
        const fileExt = file.name.split('.').pop().toLowerCase();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `products/${fileName}`;
        
        console.log('Uploading file:', filePath);
        
        // Upload to Supabase Storage
        const { data, error } = await window.supabaseConfig.supabase.storage
            .from('foods')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });
        
        if (error) {
            console.error('Storage upload error:', error);
            throw error;
        }
        
        console.log('Upload successful:', data);
        
        // Get public URL
        const { data: { publicUrl } } = window.supabaseConfig.supabase.storage
            .from('foods')
            .getPublicUrl(filePath);
        
        console.log('Public URL:', publicUrl);
        showToast('ছবি সফলভাবে আপলোড হয়েছে', 'success');
        
        return publicUrl;
        
    } catch (error) {
        console.error('Image upload error:', error);
        
        // Check if it's a bucket not found error
        if (error.message && error.message.includes('not found')) {
            showToast('foods bucket পাওয়া যায়নি। Supabase Storage এ foods bucket আছে কিনা চেক করুন', 'warning');
        } else {
            showToast('ছবি আপলোড করতে সমস্যা হয়েছে। Base64 ব্যবহার করা হচ্ছে', 'warning');
        }
        
        // Fallback: convert to base64 data URL
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                console.log('Using base64 fallback');
                resolve(e.target.result);
            };
            reader.readAsDataURL(file);
        });
    }
}

// Reset product form
// পণ্য ফর্ম রিসেট
function resetProductForm() {
    document.getElementById('productForm').reset();
    document.getElementById('imagePreview').style.display = 'none';
    switchImageTab('url'); // Default to URL tab
}

// Enhanced close product modal
// উন্নত পণ্য মডাল বন্ধ করা
function closeProductModal() {
    productModal.classList.remove('show');
    document.body.style.overflow = 'auto';
    currentEditingProduct = null;
    resetProductForm();
}

// Priority Helper Functions
// প্রাধিকার সহায়ক ফাংশন

// Get priority badge HTML
function getPriorityBadge(priority) {
    const badges = {
        'most_selling': '<div class="priority-badge most-selling"><i class="fas fa-fire"></i> Top Selling</div>',
        'high': '<div class="priority-badge high"><i class="fas fa-star"></i> Popular</div>',
        'medium': '<div class="priority-badge medium"><i class="fas fa-thumbs-up"></i> Medium</div>',
        'low': ''
    };
    
    return badges[priority] || '';
}

// Get priority display text
function getPriorityText(priority) {
    const texts = {
        'most_selling': '<span class="priority-text most-selling">সবচেয়ে বিক্রিত</span>',
        'high': '<span class="priority-text high">বিশেষ পণ্য</span>',
        'medium': '<span class="priority-text medium">জনপ্রিয় পণ্য</span>',
        'low': '<span class="priority-text low">সাধারণ পণ্য</span>'
    };
    
    return texts[priority] || texts['low'];
}

// Image Helper Functions
// ছবি সহায়ক ফাংশন

// Generate placeholder image as base64 SVG
// প্লেসহোল্ডার ছবি তৈরি করা
function getPlaceholderImage() {
    // Simple SVG placeholder as base64
    const svg = `
        <svg width="300" height="200" viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="300" height="200" fill="#F3F4F6"/>
            <rect x="125" y="75" width="50" height="50" fill="#9B9B9B" rx="4"/>
            <rect x="140" y="90" width="20" height="20" fill="white" rx="2"/>
            <text x="150" y="145" text-anchor="middle" fill="#6B7280" font-family="Arial" font-size="14">No Image</text>
        </svg>
    `;
    return 'data:image/svg+xml;base64,' + btoa(svg);
}

// Handle image loading errors
// ছবি লোডিং error হ্যান্ডল করা
function handleImageError(img) {
    // Prevent infinite loop
    if (img.dataset.errorHandled) return;
    img.dataset.errorHandled = 'true';
    
    // Set placeholder
    img.src = getPlaceholderImage();
    
    // Remove onerror to prevent further calls
    img.onerror = null;
}

// ==================== CATEGORY MANAGEMENT FUNCTIONS ====================

// Load Categories
async function loadCategories() {
    try {
        const { data, error } = await window.supabaseConfig.supabase
            .from(window.supabaseConfig.TABLES.CATEGORIES)
            .select('*')
            .order('sort_order', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: true });

        if (error) {
            throw error;
        }

        allCategories = data || [];
        displayCategories();
        updateCategoryDropdowns();
    } catch (error) {
        console.error('Error loading categories:', error);
        showToast('ক্যাটেগরি লোড করতে সমস্যা হয়েছে', 'error');
    }
}

// Display Categories
function displayCategories() {
    if (allCategories.length === 0) {
        categoriesGrid.innerHTML = `
            <div class="empty-categories">
                <i class="fas fa-tags"></i>
                <h3>কোন ক্যাটেগরি নেই</h3>
                <p>নতুন ক্যাটেগরি যোগ করুন</p>
            </div>
        `;
        return;
    }
    
    categoriesGrid.innerHTML = allCategories.map((category, index) => `
        <div class="admin-category-card" data-category-key="${category.key}">
            <div class="category-number">
                <span class="position-number">${index + 1}</span>
                <select onchange="updateCategoryPosition('${category.key}', this.value)" class="position-select" style="display: none;">
                    ${Array.from({length: allCategories.length}, (_, i) => 
                        `<option value="${i + 1}" ${(index + 1) === (i + 1) ? 'selected' : ''}>${i + 1}</option>`
                    ).join('')}
                </select>
            </div>
            <div class="category-icon">
                ${(category.icon_type === 'image' || (category.icon && category.icon.startsWith('http'))) 
                    ? `<img src="${category.icon}" alt="${category.name}" 
                         style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px; filter: brightness(0.9) contrast(1.1) saturate(1.2);"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                         onload="this.style.filter='brightness(0.9) contrast(1.1) saturate(1.2)';">
                       <i class="fas fa-tag" style="display: none;"></i>`
                    : `<i class="${category.icon || 'fas fa-tag'}"></i>`
                }
            </div>
            <div class="category-info">
                <h3 class="category-name">${category.name}</h3>
                <span class="category-key">${category.key}</span>
            </div>
            <div class="category-actions">
                <button class="sort-btn" onclick="toggleCategorySort('${category.key}')" title="সাজান">
                    <i class="fas fa-sort"></i>
                </button>
                <button class="edit-btn" onclick="editCategory('${category.key}')" title="সম্পাদনা">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="delete-btn" onclick="deleteCategory('${category.key}')" title="মুছুন">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Show Add Category Modal
function showAddCategoryModal() {
    currentEditingCategory = null;
    document.getElementById('categoryModalTitle').textContent = 'নতুন ক্যাটেগরি যোগ করুন';
    document.getElementById('categoryForm').reset();
    categoryModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Show Edit Category Modal
function editCategory(categoryKey) {
    const category = allCategories.find(cat => cat.key === categoryKey);
    if (!category) return;

    currentEditingCategory = category;
    document.getElementById('categoryModalTitle').textContent = 'ক্যাটেগরি সম্পাদনা করুন';
    document.getElementById('categoryKey').value = category.key;
    document.getElementById('categoryName').value = category.name;
    
    // Check if it's an image or fontawesome icon
    if ((category.icon_type === 'image') || (category.icon && category.icon.startsWith('http'))) {
        // It's an image URL
        document.getElementById('categoryIconUrl').value = category.icon;
        document.getElementById('categoryIcon').value = 'fas fa-glass-martini';
        document.getElementById('categoryIconFile').value = '';
        
        // Switch to image tab and URL section
        switchIconTab('image');
        switchUploadTab('url');
    } else {
        // It's a fontawesome icon
        document.getElementById('categoryIcon').value = category.icon || 'fas fa-tag';
        document.getElementById('categoryIconUrl').value = '';
        document.getElementById('categoryIconFile').value = '';
        
        // Switch to fontawesome tab
        switchIconTab('fontawesome');
    }
    
    // Update icon preview
    updateIconPreview();
    
    // Disable key editing for existing categories
    document.getElementById('categoryKey').disabled = true;
    
    categoryModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Close Category Modal
function closeCategoryModal() {
    categoryModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    currentEditingCategory = null;
    document.getElementById('categoryKey').disabled = false;
    
    // Reset upload progress
    document.getElementById('uploadProgress').style.display = 'none';
    
    // Reset to default tabs
    switchIconTab('fontawesome');
    switchUploadTab('url');
}

// Handle Category Submit
async function handleCategorySubmit(e) {
    e.preventDefault();
    
    const key = document.getElementById('categoryKey').value.trim();
    const name = document.getElementById('categoryName').value.trim();
    const iconSelect = document.getElementById('categoryIcon').value;
    const iconUrl = document.getElementById('categoryIconUrl').value.trim();
    
    // Determine which icon to use
    let icon = iconSelect;
    let iconType = 'fontawesome';
    
    if (iconUrl) {
        icon = iconUrl;
        iconType = 'image';
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> সেভ হচ্ছে...';
        
        let result;
        
        if (currentEditingCategory) {
            // Update existing category
            const updateData = { name, icon };
            // Only add icon_type if the column exists
            if (iconType) {
                updateData.icon_type = iconType;
            }
            
            result = await window.supabaseConfig.supabase
                .from(window.supabaseConfig.TABLES.CATEGORIES)
                .update(updateData)
                .eq('key', currentEditingCategory.key)
                .select();
        } else {
            // Check if key already exists
            const existingCategory = allCategories.find(cat => cat.key === key);
            if (existingCategory) {
                throw new Error('এই ক্যাটেগরি কী ইতিমধ্যে বিদ্যমান');
            }
            
            // Add new category
            const insertData = { key, name, icon };
            // Only add icon_type if the column exists
            if (iconType) {
                insertData.icon_type = iconType;
            }
            
            result = await window.supabaseConfig.supabase
                .from(window.supabaseConfig.TABLES.CATEGORIES)
                .insert([insertData])
                .select();
        }
        
        if (result.error) {
            throw result.error;
        }
        
        // Update local category data
        if (currentEditingCategory) {
            const categoryIndex = allCategories.findIndex(cat => cat.key === currentEditingCategory.key);
            if (categoryIndex !== -1) {
                allCategories[categoryIndex] = { ...allCategories[categoryIndex], name, icon, icon_type: iconType };
            }
            // Update global category names and icons
            window.supabaseConfig.CATEGORY_NAMES[key] = name;
            window.supabaseConfig.CATEGORY_ICONS[key] = icon;
        } else {
            allCategories.push(result.data[0]);
            // Update global category names and icons
            window.supabaseConfig.CATEGORY_NAMES[key] = name;
            window.supabaseConfig.CATEGORY_ICONS[key] = icon;
        }
        
        displayCategories();
        updateCategoryDropdowns();
        closeCategoryModal();
        
        const message = currentEditingCategory ? 'ক্যাটেগরি আপডেট হয়েছে' : 'নতুন ক্যাটেগরি যোগ হয়েছে';
        showToast(message, 'success');
        
    } catch (error) {
        console.error('Error saving category:', error);
        showToast(error.message || 'ক্যাটেগরি সেভ করতে সমস্যা হয়েছে', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save"></i> সেভ করুন';
    }
}

// Delete Category
async function deleteCategory(categoryKey) {
    // Check if category is being used by any products
    const productsUsingCategory = allProducts.filter(product => product.category === categoryKey);
    if (productsUsingCategory.length > 0) {
        showToast(`এই ক্যাটেগরি ${productsUsingCategory.length}টি পণ্যে ব্যবহৃত হচ্ছে। প্রথমে পণ্যগুলো মুছুন বা অন্য ক্যাটেগরিতে সরান।`, 'error');
        return;
    }
    
    if (!confirm('আপনি কি এই ক্যাটেগরি মুছতে চান?')) {
        return;
    }
    
    try {
        const { error } = await window.supabaseConfig.supabase
            .from(window.supabaseConfig.TABLES.CATEGORIES)
            .delete()
            .eq('key', categoryKey);
        
        if (error) {
            throw error;
        }
        
        // Remove from local data
        allCategories = allCategories.filter(cat => cat.key !== categoryKey);
        delete window.supabaseConfig.CATEGORY_NAMES[categoryKey];
        delete window.supabaseConfig.CATEGORY_ICONS[categoryKey];
        
        displayCategories();
        updateCategoryDropdowns();
        
        showToast('ক্যাটেগরি মুছে ফেলা হয়েছে', 'success');
        
    } catch (error) {
        console.error('Error deleting category:', error);
        showToast('ক্যাটেগরি মুছতে সমস্যা হয়েছে', 'error');
    }
}

// Update Category Dropdowns
function updateCategoryDropdowns() {
    const productCategorySelect = document.getElementById('productCategory');
    if (productCategorySelect) {
        // Clear existing options except the first one
        productCategorySelect.innerHTML = '<option value="">ক্যাটেগরি নির্বাচন করুন</option>';
        
        // Add category options
        allCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.key;
            option.textContent = category.name;
            productCategorySelect.appendChild(option);
        });
    }
}

// Switch Icon Tab
function switchIconTab(tab) {
    const fontawesomeSection = document.getElementById('fontawesomeSection');
    const imageSection = document.getElementById('imageSection');
    const tabButtons = document.querySelectorAll('.icon-option-tabs .tab-btn');
    
    // Update tab buttons
    tabButtons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Show/hide sections
    if (tab === 'fontawesome') {
        fontawesomeSection.style.display = 'block';
        imageSection.style.display = 'none';
        // Clear image URL when switching to fontawesome
        document.getElementById('categoryIconUrl').value = '';
    } else {
        fontawesomeSection.style.display = 'none';
        imageSection.style.display = 'block';
        // Clear fontawesome selection when switching to image
        document.getElementById('categoryIcon').value = 'fas fa-glass-martini';
    }
    
    // Update preview
    updateIconPreview();
}

// Switch Upload Tab
function switchUploadTab(tab) {
    const urlSection = document.getElementById('urlUploadSection');
    const fileSection = document.getElementById('fileUploadSection');
    const tabButtons = document.querySelectorAll('.upload-option-tabs .upload-tab-btn');
    
    // Update tab buttons
    tabButtons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Show/hide sections
    if (tab === 'url') {
        urlSection.style.display = 'block';
        fileSection.style.display = 'none';
        // Clear file input when switching to URL
        document.getElementById('categoryIconFile').value = '';
    } else {
        urlSection.style.display = 'none';
        fileSection.style.display = 'block';
        // Clear URL input when switching to file
        document.getElementById('categoryIconUrl').value = '';
    }
    
    // Update preview
    updateIconPreview();
}

// Handle Image Upload
async function handleImageUpload() {
    const fileInput = document.getElementById('categoryIconFile');
    const file = fileInput.files[0];
    
    if (!file) return;
    
    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
        showToast('File size must be less than 2MB', 'error');
        return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file', 'error');
        return;
    }
    
    try {
        // Show progress
        const progressDiv = document.getElementById('uploadProgress');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        progressDiv.style.display = 'block';
        progressFill.style.width = '0%';
        progressText.textContent = 'Uploading...';
        
        // Generate unique filename
        const timestamp = Date.now();
        const fileExtension = file.name.split('.').pop();
        const fileName = `category-icon-${timestamp}.${fileExtension}`;
        
        // Convert file to base64 as fallback
        const base64 = await fileToBase64(file);
        
        // Try to upload to Supabase Storage first
        try {
            const { data, error } = await window.supabaseConfig.supabase.storage
                .from('product-images')
                .upload(`category-icons/${fileName}`, file, {
                    cacheControl: '3600',
                    upsert: false
                });
            
            if (error) {
                throw error;
            }
            
            // Get public URL
            const { data: urlData } = window.supabaseConfig.supabase.storage
                .from('product-images')
                .getPublicUrl(`category-icons/${fileName}`);
            
            // Set the URL in the URL input field
            document.getElementById('categoryIconUrl').value = urlData.publicUrl;
            
        } catch (storageError) {
            console.warn('Storage upload failed, using base64 fallback:', storageError);
            
            // Fallback to base64
            document.getElementById('categoryIconUrl').value = base64;
        }
        
        // Update progress
        progressFill.style.width = '100%';
        progressText.textContent = 'Upload complete!';
        
        // Update preview
        updateIconPreview();
        
        // Hide progress after 2 seconds
        setTimeout(() => {
            progressDiv.style.display = 'none';
        }, 2000);
        
        showToast('Image uploaded successfully!', 'success');
        
    } catch (error) {
        console.error('Upload error:', error);
        showToast('Failed to upload image: ' + error.message, 'error');
        
        // Hide progress
        document.getElementById('uploadProgress').style.display = 'none';
    }
}

// Helper function to convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Update Icon Preview
function updateIconPreview() {
    const iconSelect = document.getElementById('categoryIcon');
    const iconUrlInput = document.getElementById('categoryIconUrl');
    const iconPreview = document.getElementById('iconPreview');
    
    if (!iconPreview) return;
    
    // Clear previous content
    iconPreview.innerHTML = '';
    
    // Check if image URL is provided and not empty
    if (iconUrlInput && iconUrlInput.value.trim()) {
        const img = document.createElement('img');
        img.src = iconUrlInput.value.trim();
        img.alt = 'Category Icon';
        img.onerror = function() {
            // If image fails to load, show default icon
            iconPreview.innerHTML = '<i class="fas fa-image"></i>';
        };
        img.onload = function() {
            // Image loaded successfully, ensure proper styling
            img.style.filter = 'brightness(0.9) contrast(1.1) saturate(1.2)';
        };
        iconPreview.appendChild(img);
    } else if (iconSelect && iconSelect.value) {
        // Use FontAwesome icon
        const iconElement = document.createElement('i');
        iconElement.className = iconSelect.value;
        iconPreview.appendChild(iconElement);
    } else {
        // Default icon
        const iconElement = document.createElement('i');
        iconElement.className = 'fas fa-tag';
        iconPreview.appendChild(iconElement);
    }
}

// ==================== DIRECT POSITION UPDATING FUNCTIONS ====================

// Toggle Category Sort (Show/hide dropdown for specific category)
function toggleCategorySort(categoryKey) {
    // Find the category card
    const categoryCard = document.querySelector(`[data-category-key="${categoryKey}"]`);
    if (!categoryCard) return;
    
    // Find the position number and select elements
    const positionNumber = categoryCard.querySelector('.position-number');
    const positionSelect = categoryCard.querySelector('.position-select');
    
    if (!positionNumber || !positionSelect) return;
    
    // Toggle visibility
    if (positionNumber.style.display === 'none') {
        // Show number, hide dropdown
        positionNumber.style.display = 'flex';
        positionSelect.style.display = 'none';
        positionSelect.style.border = 'none';
        positionSelect.style.boxShadow = 'none';
    } else {
        // Hide number, show dropdown
        positionNumber.style.display = 'none';
        positionSelect.style.display = 'block';
        positionSelect.style.border = '2px solid #10b981';
        positionSelect.style.boxShadow = '0 0 10px rgba(16, 185, 129, 0.5)';
        showToast('এখন number select করুন', 'info');
    }
}


// Update Category Position
async function updateCategoryPosition(categoryKey, newPosition) {
    try {
        const newPos = parseInt(newPosition);
        const currentCategory = allCategories.find(cat => cat.key === categoryKey);
        
        if (!currentCategory) {
            showToast('ক্যাটেগরি পাওয়া যায়নি', 'error');
            return;
        }
        
        const currentPos = currentCategory.sort_order || allCategories.indexOf(currentCategory) + 1;
        
        // If moving to a higher position (lower number)
        if (newPos < currentPos) {
            // Move all categories between newPos and currentPos-1 down by 1
            for (let i = newPos; i < currentPos; i++) {
                const categoryToMove = allCategories.find(cat => (cat.sort_order || allCategories.indexOf(cat) + 1) === i);
                if (categoryToMove) {
                    await window.supabaseConfig.supabase
                        .from(window.supabaseConfig.TABLES.CATEGORIES)
                        .update({ sort_order: i + 1 })
                        .eq('key', categoryToMove.key);
                }
            }
        }
        // If moving to a lower position (higher number)
        else if (newPos > currentPos) {
            // Move all categories between currentPos+1 and newPos up by 1
            for (let i = currentPos + 1; i <= newPos; i++) {
                const categoryToMove = allCategories.find(cat => (cat.sort_order || allCategories.indexOf(cat) + 1) === i);
                if (categoryToMove) {
                    await window.supabaseConfig.supabase
                        .from(window.supabaseConfig.TABLES.CATEGORIES)
                        .update({ sort_order: i - 1 })
                        .eq('key', categoryToMove.key);
                }
            }
        }
        
        // Update the current category to the new position
        await window.supabaseConfig.supabase
            .from(window.supabaseConfig.TABLES.CATEGORIES)
            .update({ sort_order: newPos })
            .eq('key', categoryKey);
        
        // Hide dropdown after update
        const categoryCard = document.querySelector(`[data-category-key="${categoryKey}"]`);
        if (categoryCard) {
            const positionNumber = categoryCard.querySelector('.position-number');
            const positionSelect = categoryCard.querySelector('.position-select');
            
            if (positionNumber && positionSelect) {
                positionNumber.style.display = 'flex';
                positionSelect.style.display = 'none';
                positionSelect.style.border = 'none';
                positionSelect.style.boxShadow = 'none';
            }
        }
        
        // Reload categories to reflect new order
        await loadCategories();
        
        showToast('ক্যাটেগরি সাজানো হয়েছে', 'success');
        
    } catch (error) {
        console.error('Error updating category position:', error);
        showToast('ক্যাটেগরি সাজাতে সমস্যা হয়েছে', 'error');
    }
}

// ==================== END NUMBER-BASED SORTING FUNCTIONS ====================

// ==================== END CATEGORY MANAGEMENT FUNCTIONS ====================

// Add CSS animations for toast
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);