// Supabase Configuration for Admin Panel
// আপনার Supabase প্রজেক্টের URL এবং API Key এখানে দিন

const SUPABASE_URL = 'https://zwzowlizzhdknlptomjc.supabase.co'; // আপনার Supabase URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3em93bGl6emhka25scHRvbWpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MDMwMzcsImV4cCI6MjA3MjQ3OTAzN30.IHjKjpjpFXXftQeopcljyajvIwTClHSpKFRruKST-EM'; // আপনার Supabase Anon Key

// Supabase Client Initialize
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Database Table Names
const TABLES = {
    PRODUCTS: 'products',
    ORDERS: 'orders',
    CATEGORIES: 'categories'
};

// Order Status
const ORDER_STATUS = {
    PENDING: 'pending',
    PREPARING: 'preparing',
    DELIVERED: 'delivered',
    COMPLETED: 'completed'
};

// Dynamic Category Management
let CATEGORY_NAMES = {
    'drinks': 'পানীয়',
    'burger': 'বার্গার',
    'pizza': 'পিজা',
    'rice': 'ভাত',
    'chicken': 'চিকেন',
    'beef': 'গরুর মাংস',
    'fish': 'মাছ',
    'vegetable': 'সবজি',
    'dessert': 'মিষ্টি',
    'snacks': 'নাস্তা',
    'french_fries': 'ফ্রেঞ্চ ফ্রাই',
    'fried_items': 'ভাজা আইটেম',
    'shorma': 'শর্মা',
    'sandwich': 'স্যান্ডউইচ',
    'faluda': 'ফালুদা',
    'pasta': 'পাস্তা',
    'noodles': 'নুডলস',
    'fuchka': 'ফুচকা',
    'soup': 'সুপ',
    'biriyani': 'বিরিয়ানি',
    'beverage': 'বিভারেজ আইটেম',
    'combo': 'কম্বো আইটেম'
};

// Category Icons
let CATEGORY_ICONS = {
    'drinks': 'fas fa-glass-martini',
    'burger': 'fas fa-hamburger',
    'pizza': 'fas fa-pizza-slice',
    'rice': 'fas fa-bowl-rice',
    'chicken': 'fas fa-drumstick-bite',
    'beef': 'fas fa-bacon',
    'fish': 'fas fa-fish',
    'vegetable': 'fas fa-carrot',
    'dessert': 'fas fa-ice-cream',
    'snacks': 'fas fa-cookie-bite',
    'french_fries': 'fas fa-french-fries',
    'fried_items': 'fas fa-fire',
    'shorma': 'fas fa-bread-slice',
    'sandwich': 'fas fa-sandwich',
    'faluda': 'fas fa-glass-whiskey',
    'pasta': 'fas fa-pasta',
    'noodles': 'fas fa-utensils',
    'fuchka': 'fas fa-circle',
    'soup': 'fas fa-bowl-food',
    'biriyani': 'fas fa-rice',
    'beverage': 'fas fa-wine-glass',
    'combo': 'fas fa-box'
};

// Status Names in Bengali
const STATUS_NAMES = {
    'pending': 'অপেক্ষমান',
    'preparing': 'প্রস্তুত হচ্ছে',
    'delivered': 'পৌঁছে দেওয়া হয়েছে',
    'completed': 'সম্পন্ন'
};

// Export for use in other files
window.supabaseConfig = {
    supabase,
    TABLES,
    ORDER_STATUS,
    CATEGORY_NAMES,
    CATEGORY_ICONS,
    STATUS_NAMES
};