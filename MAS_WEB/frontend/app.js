// static API Base URL
const API_BASE = 'https://mm';

// --- Core Logic ---

// Custom Toast System
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-triangle';
    if (type === 'warning') icon = 'fa-exclamation-circle';

    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Fade in
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}
function toggleTheme() {
    const body = document.body;
    const icon = document.getElementById('theme-icon');

    if (body.classList.contains('light-mode')) {
        body.classList.remove('light-mode');
        icon?.classList.replace('fa-sun', 'fa-moon');
        localStorage.setItem('mas_theme', 'dark');
        updateChartTheme(false);
    } else {
        body.classList.add('light-mode');
        icon?.classList.replace('fa-moon', 'fa-sun');
        localStorage.setItem('mas_theme', 'light');
        updateChartTheme(true);
    }
}

function logout() {
    localStorage.removeItem('mas_token');
    localStorage.removeItem('mas_user');
    window.location.href = 'login.html';
}

// Set Initial Theme & Data
document.addEventListener('DOMContentLoaded', () => {
    // 1. Auth Guard
    const token = localStorage.getItem('mas_token');
    const isLoginPage = window.location.href.includes('login.html');

    if (!token && !isLoginPage) {
        window.location.href = 'login.html';
        return;
    }

    // 2. Theme Initialization
    if (localStorage.getItem('mas_theme') === 'light') {
        document.body.classList.add('light-mode');
        document.getElementById('theme-icon')?.classList.replace('fa-moon', 'fa-sun');
    }

    // 3. User Info Display & Default View Load
    if (!isLoginPage) {
        displayUserInfo();
        const defaultNav = document.querySelector('.nav-item.active');
        switchView('overview', defaultNav);
        initProgressBars();
    }
});

function displayUserInfo() {
    const userStr = localStorage.getItem('mas_user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            // Sidebar footer info
            const nameEl = document.querySelector('.sidebar-footer .name');
            if (nameEl) nameEl.innerText = user.name || user.username || 'المدير العام';
            const roleEl = document.querySelector('.sidebar-footer .role');
            if (roleEl) roleEl.innerText = user.role || 'Admin';
            const avatarEl = document.querySelector('.sidebar-footer .avatar');
            if (avatarEl) avatarEl.innerText = (user.name || 'م').charAt(0);

            // Welcome message in navbar
            const subtitleEl = document.querySelector('.page-subtitle');
            if (subtitleEl) subtitleEl.innerText = `مرحباً بك في مركز التحكم الموحد لـ MAS MEDICAL HUB.`;

            // Role based menu trimming: Hide Doctors and Management views for Doctor role
            if (user.role === 'DOCTOR') {
                document.querySelectorAll('.nav-item').forEach(item => {
                    const clickAttr = item.getAttribute('onclick');
                    if (clickAttr && (clickAttr.includes("'doctors'") || clickAttr.includes("'management'") || clickAttr.includes("'secretaries'"))) {
                        item.style.display = 'none';
                    }
                });
            }

            // Capture Browser Device Info
            const browserInfo = navigator.userAgent.split(') ')[0].split(' (')[1] || 'Web Dashboard';
            localStorage.setItem('mas_last_device', browserInfo);
        } catch (e) {
            console.error("Error parsing user data", e);
        }
    }
}

// --- Maintenance & System Checks ---
async function checkSystemStatus() {
    try {
        const res = await fetch(`${API_BASE}/status/`);
        const status = await res.json();

        if (status.maintenance_mode) {
            const userStr = localStorage.getItem('mas_user');
            const user = userStr ? JSON.parse(userStr) : null;
            // Only bypass for Admin/Staff
            if (!user || user.role !== 'ADMIN') {
                document.body.innerHTML = `
                    <div style="height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #0a0608; color: white; text-align: center; font-family: 'Cairo', sans-serif;">
                        <i class="fa-solid fa-triangle-exclamation" style="font-size: 5rem; color: #B00049; margin-bottom: 2rem;"></i>
                        <h1 style="font-size: 2.5rem;">النظام في وضع الصيانة</h1>
                        <p style="font-size: 1.2rem; color: #94a3b8; max-width: 600px;">نعمل حالياً على تحديث أنظمة MAS Medical Hub لتوفير تجربة أفضل. يرجى المحاولة لاحقاً.</p>
                        <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 2rem;">إعادة التحميل</button>
                    </div>
                 `;
            }
        }
    } catch (e) {
        console.warn("Status check failed", e);
    }
}
// Run status check periodically
setInterval(checkSystemStatus, 30000);

async function fetchDashboardData() {
    const token = localStorage.getItem('mas_token');
    try {
        // Only fetch stats initially for speed. Other data is fetched when their view is loaded.
        const statsRes = await fetch(`${API_BASE}/stats/`, { headers: { 'Authorization': `Token ${token}` } });
        const statsData = await statsRes.json();

        updateDashboardUI({
            diagnoses_today: statsData?.stats?.today_diagnoses || 0,
            accuracy: statsData?.stats?.ai_accuracy || '98.5%',
            recent_queue: statsData?.recent_queue || []
        });

    } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
    }
}

function updateDashboardUI(data) {
    // Update Stat Cards
    const docEl = document.getElementById('stat-total-doctors');
    if (docEl) docEl.innerText = data.total_doctors || '0';

    const diagEl = document.getElementById('stat-diagnoses');
    if (diagEl) diagEl.innerText = data.diagnoses_today || '0';

    const accEl = document.getElementById('stat-accuracy');
    if (accEl) accEl.innerText = data.accuracy || '98.5%';

    // Update Table (Active Queue)
    const tbody = document.getElementById('recent-activity-body');
    if (tbody && data.recent_queue) {
        tbody.innerHTML = '';
        data.recent_queue.forEach(item => {
            const statusClass = item.status === 'مكتمل' ? 'status-active' : 'status-inactive';
            tbody.innerHTML += `
                <tr>
                    <td><span style="font-family: monospace; color: var(--accent-main); font-weight: 800;">#${item.id}</span></td>
                    <td>
                        <div class="tbl-user">
                            <i class="fa-solid fa-user-circle" style="font-size: 1.5rem; color: var(--text-muted);"></i>
                            ${item.user}
                        </div>
                    </td>
                    <td>${item.type}</td>
                    <td>${item.time}</td>
                    <td style="font-weight: 700; color: var(--success);">${item.confidence || '---'}</td>
                    <td><span class="status-badge ${statusClass}">${item.status}</span></td>
                    <td>
                        <button class="btn-icon" onclick="viewDiagnosisDetails(${item.id})"><i class="fa-solid fa-eye"></i></button>
                    </td>
                </tr>
            `;
        });
    }

    // Initialize/Update Chart
    if (document.getElementById('activityChart')) {
        initChart(data.chart_data);
    }
}

// 2. Navigation Logic (Lazy Loading)
async function switchView(viewId, element) {
    const contentDiv = document.getElementById('dynamic-content');
    if (!contentDiv) return;

    // Show premium shimmer loader
    contentDiv.innerHTML = `
        <div class="glass-panel shimmer" style="height: 400px; margin: 2rem; border-radius: 20px; display: flex; align-items: center; justify-content: center; flex-direction: column;">
            <div class="rotating-mas" style="width: 60px; height: 60px; margin-bottom: 1.5rem; opacity: 0.5;">
                 <img src="logo_circle.png" style="width: 100%; height: 100%; border-radius: 50%;">
            </div>
            <div style="color: var(--text-muted); font-size: 1.1rem; font-weight: 600; letter-spacing: 1px;">جاري تجهيز البيانات الذكية...</div>
        </div>
    `;

    // Update active state in sidebar
    if (element) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        element.classList.add('active');
    }

    // Update Header Text
    const titleObj = {
        'overview': 'نظرة عامة (Overview)',
        'users': 'سجل المرضى والمستفيدين',
        'doctors': 'الطاقم الطبي التخصصي',
        'secretaries': 'إدارة السكرتارية والموظفين',
        'management': 'إدارة العيادات والفروع',
        'bookings': 'إدارة المواعيد والحجوزات',
        'ads': 'إحصائيات وإعلانات المركز',
        'system': 'لوحة التحكم المركزية'
    };

    const headerTitle = document.getElementById('current-page-title');
    if (headerTitle && titleObj[viewId]) {
        headerTitle.innerText = titleObj[viewId];
    }

    try {
        // Fetch HTML view dynamically
        const response = await fetch(`views/${viewId}.html`);
        if (!response.ok) throw new Error('View not found');
        const html = await response.text();

        // Inject HTML
        contentDiv.innerHTML = html;

        // Add animation class
        const firstChild = contentDiv.firstElementChild;
        if (firstChild && firstChild.classList) {
            firstChild.classList.add('view-section');
            setTimeout(() => firstChild.classList.add('active'), 10);
        }

        // Trigger Specific Data Fetching for the newly loaded view
        if (viewId === 'overview') {
            fetchDashboardData();
            // Need to re-initialize stats specific to overview if needed
            fetchStatsAndTotals();
        }
        if (viewId === 'users') fetchUsers();
        if (viewId === 'doctors') fetchDoctors();
        if (viewId === 'secretaries') fetchSecretaries();
        if (viewId === 'management') fetchBranches();
        if (viewId === 'ads') fetchAds();
        if (viewId === 'system') fetchDevices();
        if (viewId === 'bookings') fetchBookings();

    } catch (err) {
        console.error('Failed to load view:', err);
        contentDiv.innerHTML = `
            <div class="glass-panel view-section active" style="padding: 4rem; text-align: center; margin: 2rem;">
                <i class="fa-solid fa-microchip-slash" style="font-size: 4rem; color: var(--accent-light); margin-bottom: 2rem; opacity: 0.5;"></i>
                <h2 style="color: var(--accent-main);">وحدة قيد التحديث</h2>
                <p style="color: var(--text-muted); max-width: 500px; margin: 1rem auto;">نحن نعمل على مزامنة ميزات الذكاء الاصطناعي لهذه الصفحة ضمن معايير MAS-Premium الجديدة.</p>
            </div>`;
    }
}

// Helper to fetch totals for the overview page lazily
async function fetchStatsAndTotals() {
    const token = localStorage.getItem('mas_token');
    try {
        const [doctorsRes, patientsRes, branchesRes] = await Promise.all([
            fetch(`${API_BASE}/doctors/`, { headers: { 'Authorization': `Token ${token}` } }),
            fetch(`${API_BASE}/users/`, { headers: { 'Authorization': `Token ${token}` } }),
            fetch(`${API_BASE}/branches/`, { headers: { 'Authorization': `Token ${token}` } })
        ]);

        const doctors = await doctorsRes.json();
        const patients = await patientsRes.json();
        const branches = await branchesRes.json();

        const docEl = document.getElementById('stat-total-doctors');
        if (docEl) docEl.innerText = Array.isArray(doctors) ? doctors.length : 0;

        // Can add more stats mapping here if needed in overview
    } catch (err) {
        console.error('Stats and Totals fetch failed', err);
    }
}

// --- Modals (New System) ---
function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add('active');

    // Auto-populate for Secretaries
    if (id === 'addSecretaryModal') {
        populateBranchDropdown();
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove('active');
}

// Close on outside click
window.onclick = function (event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
}

// --- Management Features ---

// 1. Branches Management
async function fetchBranches() {
    const TOKEN = localStorage.getItem('mas_token');
    try {
        const response = await fetch(`${API_BASE}/branches/`, {
            headers: { 'Authorization': `Token ${TOKEN}` }
        });
        const branches = await response.json();
        const tbody = document.querySelector('#branchesTable tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        branches.forEach(b => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${b.id}</td>
                <td>${b.governorate}</td>
                <td>${b.street_name}</td>
                <td>${b.contact_number || '---'}</td>
                <td><span class="badge badge-success">يعمل كعيادة</span></td>
                <td>
                    <div class="action-btns">
                        <button class="btn-icon delete" onclick="deleteBranch(${b.id})"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error("Error fetching branches:", err);
    }
}

async function handleCreateBranch(e) {
    e.preventDefault();
    const TOKEN = localStorage.getItem('mas_token');
    const data = {
        governorate: document.getElementById('branchGov').value,
        street_name: document.getElementById('branchStreet').value,
        contact_number: document.getElementById('branchContact').value
    };

    try {
        const response = await fetch(`${API_BASE}/branches/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${TOKEN}`
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            showToast('تم إضافة العيادة بنجاح!', 'success');
            closeModal('addBranchModal');
            fetchBranches();
            document.getElementById('addBranchForm').reset();
        } else {
            showToast('حدث خطأ أثناء الإضافة', 'error');
        }
    } catch (err) {
        showToast('فشل الاتصال بالسيرفر', 'error');
    }
}

async function deleteBranch(id) {
    if (!confirm('هل أنت متأكد من حذف هذه العيادة؟')) return;
    const TOKEN = localStorage.getItem('mas_token');

    try {
        const response = await fetch(`${API_BASE}/branches/${id}/`, {
            method: 'DELETE',
            headers: { 'Authorization': `Token ${TOKEN}` }
        });

        if (response.ok) {
            fetchBranches();
            showToast('تم الحذف بنجاح', 'success');
        } else {
            showToast('فشل الحذف', 'error');
        }
    } catch (err) {
        showToast('حدث خطأ', 'error');
    }
}

// 2. Secretaries Management
async function fetchSecretaries() {
    const TOKEN = localStorage.getItem('mas_token');
    const target = document.getElementById('secretariesList');
    if (!target) return;
    target.innerHTML = '<div class="glass-panel shimmer" style="height: 200px;"></div>';

    try {
        const response = await fetch(`${API_BASE}/secretaries/`, {
            headers: { 'Authorization': `Token ${TOKEN}` }
        });
        const data = await response.json();
        renderSecretaryTable(data);
    } catch (err) {
        target.innerHTML = 'خطأ في التحميل';
    }
}

function renderSecretaryTable(secretaries) {
    let html = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>الموظف</th>
                    <th>الفرع المسؤول</th>
                    <th>تاريخ التعيين</th>
                    <th>إجراءات</th>
                </tr>
            </thead>
            <tbody>
    `;

    secretaries.forEach(s => {
        const joinDate = s.user_details?.date_joined ? new Date(s.user_details.date_joined).toLocaleDateString('ar-SA') : 'غير محدد';
        html += `
            <tr>
                <td>
                    <div style="font-weight: 600;">${s.user_details?.first_name} ${s.user_details?.last_name || ''}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${s.user_details?.email}</div>
                </td>
                <td>${s.branch_details?.governorate || '---'}</td>
                <td>${joinDate}</td>
                <td>
                    <button class="btn-icon delete" onclick="deleteSecretary(${s.id})"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    document.getElementById('secretariesList').innerHTML = html;
}

async function populateBranchDropdown() {
    const TOKEN = localStorage.getItem('mas_token');
    try {
        const response = await fetch(`${API_BASE}/branches/`, {
            headers: { 'Authorization': `Token ${TOKEN}` }
        });
        const branches = await response.json();
        const select = document.getElementById('secBranch');
        if (!select) return;
        select.innerHTML = '<option value="">اختر العيادة / الفرع...</option>';

        branches.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.id;
            opt.textContent = `${b.governorate} - ${b.street_name}`;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error("Error populating dropdown:", err);
    }
}

async function handleRegisterSecretary(e) {
    e.preventDefault();
    const data = {
        username: document.getElementById('secEmail').value,
        email: document.getElementById('secEmail').value,
        password: document.getElementById('secPassword').value,
        first_name: document.getElementById('secName').value,
        role: 'SECRETARY',
        branch_id: document.getElementById('secBranch').value
    };

    try {
        const response = await fetch(`${API_BASE}/register/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            showToast('تم تسجيل الموظف بنجاح!', 'success');
            closeModal('addSecretaryModal');
            fetchSecretaries();
            document.getElementById('addSecretaryForm').reset();
        } else {
            const errData = await response.json();
            showToast('خطأ: ' + (errData.error || 'حدث خطأ في التسجيل'), 'error');
        }
    } catch (err) {
        showToast('فشل الاتصال بالسيرفر', 'error');
    }
}

async function deleteSecretary(id) {
    if (!confirm('هل أنت متأكد من حذف هذا الحساب للموظف؟')) return;
    const TOKEN = localStorage.getItem('mas_token');

    try {
        const response = await fetch(`${API_BASE}/secretaries/${id}/`, {
            method: 'DELETE',
            headers: { 'Authorization': `Token ${TOKEN}` }
        });

        if (response.ok) {
            fetchSecretaries();
            showToast('تم الحذف بنجاح', 'success');
        } else {
            showToast('فشل الحذف', 'error');
        }
    } catch (err) {
        showToast('حدث خطأ', 'error');
    }
}

// 3. Doctors Management (Viewing stats & joining dates)
async function fetchDoctors() {
    const token = localStorage.getItem('mas_token');
    const target = document.getElementById('doctorsList');
    if (!target) return;
    target.innerHTML = '<div class="glass-panel shimmer" style="height: 300px;"></div>';

    try {
        const response = await fetch(`${API_BASE}/doctors/`, {
            headers: { 'Authorization': `Token ${token}` }
        });
        const data = await response.json();
        renderDoctorTable(data);
    } catch (err) {
        target.innerHTML = 'خطأ في التحميل';
    }
}

function renderDoctorTable(doctors) {
    let html = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>الطبيب</th>
                    <th>التخصص</th>
                    <th>العيادات / العمال</th>
                    <th>تاريخ الانضمام</th>
                    <th>الحالة</th>
                </tr>
            </thead>
            <tbody>
    `;

    doctors.forEach(d => {
        const joinDate = d.user_details?.date_joined ? new Date(d.user_details.date_joined).toLocaleDateString('ar-SA') : '---';
        html += `
            <tr>
                <td>
                    <div style="font-weight: 700; color: var(--accent-main)">د. ${d.user_details?.first_name} ${d.user_details?.last_name || ''}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted)">${d.user_details?.email}</div>
                </td>
                <td>${d.specialty}</td>
                <td>
                    <div class="stats-mini">
                        <span><i class="fa-solid fa-hospital"></i> ${d.branch_count || 0}</span>
                        <span><i class="fa-solid fa-user-tie"></i> ${d.secretary_count || 0}</span>
                    </div>
                </td>
                <td>${joinDate}</td>
                <td><span class="badge badge-success">نشط حالياً</span></td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    document.getElementById('doctorsList').innerHTML = html;
}

// 4. Patients (Users) Management
async function fetchUsers() {
    const token = localStorage.getItem('mas_token');
    const target = document.getElementById('patientsList');
    if (!target) return;
    target.innerHTML = '<div class="glass-panel shimmer" style="height: 300px;"></div>';

    try {
        const response = await fetch(`${API_BASE}/users/`, {
            headers: { 'Authorization': `Token ${token}` }
        });
        const data = await response.json();
        // Filter for Patients only for this view
        const patients = data.filter(u => u.role === 'PATIENT');
        renderPatientTable(patients);
    } catch (err) {
        target.innerHTML = 'خطأ في التحميل';
    }
}

function renderPatientTable(patients) {
    let html = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>اسم المريض</th>
                    <th>البريد الإلكتروني</th>
                    <th>رقم الهاتف</th>
                    <th>تاريخ التسجيل</th>
                    <th>الحالة</th>
                </tr>
            </thead>
            <tbody>
    `;

    patients.forEach(p => {
        const joinDate = p.date_joined ? new Date(p.date_joined).toLocaleDateString('ar-SA') : '---';
        html += `
            <tr>
                <td>
                    <div style="font-weight: 600;">${p.first_name} ${p.last_name || ''}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted)">ID: #${p.id}</div>
                </td>
                <td>${p.email}</td>
                <td>${p.phone_number || 'غير متوفر'}</td>
                <td>${joinDate}</td>
                <td><span class="badge badge-primary">مريض مشفر</span></td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    document.getElementById('patientsList').innerHTML = html;
}

// --- Advertising Management ---
async function fetchAds() {
    const token = localStorage.getItem('mas_token');
    const table = document.getElementById('adsTable');
    const loader = document.querySelector('#view-ads .loader');

    try {
        const response = await fetch(`${API_BASE}/ad-banners/`, {
            headers: { 'Authorization': `Token ${token}` }
        });
        const ads = await response.json();

        loader.style.display = 'none';
        table.style.display = 'table';
        renderAdsTable(ads);
    } catch (err) {
        console.error("Error fetching ads:", err);
    }
}

function renderAdsTable(ads) {
    const tbody = document.getElementById('ads-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (ads.length === 0) {
        document.getElementById('adsTable').style.display = 'none';
        document.getElementById('adsEmpty').style.display = 'block';
        return;
    }

    document.getElementById('adsEmpty').style.display = 'none';
    document.getElementById('adsTable').style.display = 'table';

    ads.forEach(ad => {
        const tr = document.createElement('tr');
        const statusClass = ad.is_active ? 'status-active' : 'status-inactive';
        tr.innerHTML = `
            <td><img src="${ad.image}" class="ad-thumb" style="width: 100px; height: 50px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border-glass);"></td>
            <td style="font-weight: 700;">${ad.title}</td>
            <td style="color: var(--text-muted); font-size: 0.8rem;">${ad.subtitle}</td>
            <td><span class="status-badge ${statusClass}">${ad.is_active ? 'نشط' : 'متوقف'}</span></td>
            <td>
                <div class="action-btns" style="display: flex; gap: 0.5rem;">
                    <button class="notif-btn" style="color: var(--danger); background: rgba(239, 68, 68, 0.05);" onclick="deleteAd(${ad.id})"><i class="fa-solid fa-trash"></i></button>
                    <button class="notif-btn" style="color: var(--accent-main); background: rgba(176, 0, 73, 0.05);"><i class="fa-solid fa-eye"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function previewAdImage(input) {
    const preview = document.getElementById('adImagePreview');
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            preview.style.display = 'block';
            preview.innerHTML = `<img src="${e.target.result}">`;
        }
        reader.readAsDataURL(input.files[0]);
    }
}

async function handleCreateAd(e) {
    e.preventDefault();
    const TOKEN = localStorage.getItem('mas_token');
    const formData = new FormData();
    formData.append('title', document.getElementById('adTitle').value);
    formData.append('subtitle', document.getElementById('adSubtitle').value);
    if (document.getElementById('adLink').value) {
        formData.append('link_url', document.getElementById('adLink').value);
    }
    formData.append('image', document.getElementById('adImage').files[0]);
    formData.append('is_active', true);

    try {
        const response = await fetch(`${API_BASE}/ad-banners/`, {
            method: 'POST',
            headers: { 'Authorization': `Token ${TOKEN}` },
            body: formData
        });

        if (response.ok) {
            showToast('تم إضافة الإعلان بنجاح!', 'success');
            closeModal('addAdModal');
            fetchAds();
            document.getElementById('addAdForm').reset();
            document.getElementById('adImagePreview').style.display = 'none';
        } else {
            showToast('خطأ في إضافة الإعلان', 'error');
        }
    } catch (err) {
        showToast('فشل الاتصال بالسيرفر', 'error');
    }
}

async function deleteAd(id) {
    if (!confirm('هل أنت متأكد من حذف هذا الإعلان؟')) return;
    const TOKEN = localStorage.getItem('mas_token');

    try {
        const response = await fetch(`${API_BASE}/ad-banners/${id}/`, {
            method: 'DELETE',
            headers: { 'Authorization': `Token ${TOKEN}` }
        });

        if (response.ok) {
            fetchAds();
            showToast('تم حذف الإعلان', 'success');
        } else {
            showToast('فشل في الحذف', 'error');
        }
    } catch (err) {
        showToast('حدث خطأ', 'error');
    }
}

// 3. UI Animations (Progress Bars)
function initProgressBars() {
    setTimeout(() => {
        document.querySelectorAll('.progress-track').forEach(track => {
            const val = track.style.getPropertyValue('--val');
            const fill = track.querySelector('.progress-fill');
            if (fill) fill.style.width = val;
        });
    }, 500); // Small delay for visual effect on load
}

// 4. Chart.js Implementation
let activityChart;

function initChart(chartData) {
    const ctx = document.getElementById('activityChart').getContext('2d');

    // Fallback if no data
    const labels = chartData && chartData.length ? chartData.map(d => d.day) : ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
    const values = chartData && chartData.length ? chartData.map(d => d.count) : [0, 0, 0, 0, 0, 0, 0];

    if (activityChart) {
        activityChart.data.labels = labels;
        activityChart.data.datasets[0].data = values;
        activityChart.update();
        return;
    }

    // Gradient for line (Premium Raspberry)
    let gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(176, 0, 73, 0.4)'); // Raspberry
    gradient.addColorStop(1, 'rgba(176, 0, 73, 0.0)');

    const isLight = document.body.classList.contains('light-mode');
    const textColor = isLight ? '#64748b' : '#94a3b8';
    const gridColor = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';

    activityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'عدد التشخيصات الناجحة',
                data: values,
                borderColor: '#B00049',
                backgroundColor: gradient,
                borderWidth: 4,
                pointBackgroundColor: isLight ? '#ffffff' : '#0a0608',
                pointBorderColor: '#B00049',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                fill: true,
                tension: 0.4 // Smooth curves
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 21, 34, 0.9)',
                    titleFont: { family: 'Cairo', size: 14 },
                    bodyFont: { family: 'Cairo', size: 14 },
                    padding: 10,
                    borderColor: 'rgba(0, 212, 255, 0.3)',
                    borderWidth: 1,
                    displayColors: false,
                    callbacks: {
                        label: function (context) {
                            return 'تشخيص: ' + context.parsed.y;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: gridColor, drawBorder: false },
                    ticks: { color: textColor, font: { family: 'Cairo' } }
                },
                x: {
                    grid: { display: false, drawBorder: false },
                    ticks: { color: textColor, font: { family: 'Cairo' } }
                }
            }
        }
    });
}

function updateChartTheme(isLight) {
    if (!activityChart) return;

    const textColor = isLight ? '#64748b' : '#8b9bb4';
    const gridColor = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
    const pointBg = isLight ? '#ffffff' : '#0a0e17';

    activityChart.options.scales.x.ticks.color = textColor;
    activityChart.options.scales.y.ticks.color = textColor;
    activityChart.options.scales.y.grid.color = gridColor;
    activityChart.data.datasets[0].pointBackgroundColor = pointBg;

    activityChart.update();
}

// --- Administrator System Controls ---
async function toggleSystemFeature(feature, isEnabled) {
    const token = localStorage.getItem('mas_token');

    // Map UI flags to Backend keys
    const keyMap = {
        'maintenance': 'MAINTENANCE_MODE',
        'registration': 'REGISTRATION_ENABLED'
    };

    const backendKey = keyMap[feature] || feature.toUpperCase();

    try {
        const response = await fetch(`${API_BASE}/settings/${backendKey}/`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Token ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 'value': isEnabled ? 'true' : 'false' })
        });

        if (!response.ok && response.status === 404) {
            // Create if doesn't exist
            await fetch(`${API_BASE}/settings/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 'key': backendKey, 'value': isEnabled ? 'true' : 'false' })
            });
        }

        let featureName = '';
        switch (feature) {
            case 'brats': featureName = 'فحص أورام الدماغ'; break;
            case 'pneumonia': featureName = 'فحص التهاب الرئة'; break;
            case 'skin': featureName = 'أمراض الجلد'; break;
            case 'chat': featureName = 'المحادثة مع الذكاء الاصطناعي (Gemma)'; break;
            case 'registration': featureName = 'تسجيل الحسابات الجديدة'; break;
            case 'doctor_verify': featureName = 'تدقيق الأطباء اليدوي'; break;
            case 'maintenance': featureName = 'وضع الصيانة الشامل'; break;
        }

        const statusText = isEnabled ? 'تم تفعيله بنجاح' : 'تم إيقافه بنجاح';
        showToast(`نظام MAS الذكي: ${featureName} ${statusText}.`, isEnabled ? 'success' : 'warning');

        if (feature === 'maintenance' && isEnabled) {
            if (confirm("تحذير أمني: لقد قمت بتفعيل وضع الصيانة العام. هل ترغب في تسجيل الخروج الآن؟")) {
                logout();
            }
        }

    } catch (err) {
        console.error("Failed to toggle feature", err);
        showToast("فشل في تحديث إعدادات النظام على السيرفر.", 'error');
    }
}
// --- Bookings Management ---
let allBookings = [];
async function fetchBookings() {
    const TOKEN = localStorage.getItem('mas_token');
    const target = document.getElementById('bookingsList');
    if (!target) return;

    try {
        const res = await fetch(`${API_BASE}/bookings/`, {
            headers: { 'Authorization': `Token ${TOKEN}` }
        });
        allBookings = await res.json();
        renderBookingsTable(allBookings);
    } catch (err) {
        target.innerHTML = '<div class="glass-panel">فشل تحميل المواعيد</div>';
    }
}

function renderBookingsTable(bookings) {
    const target = document.getElementById('bookingsList');
    if (!target) return;

    if (bookings.length === 0) {
        target.innerHTML = '<div class="glass-panel" style="text-align:center; padding: 2rem;">لا توجد مواعيد حالياً.</div>';
        return;
    }

    let html = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>المريض</th>
                    <th>التاريخ والوقت</th>
                    <th>نوع الكشف</th>
                    <th>ملاحظات</th>
                    <th>الحالة</th>
                    <th>إجراءات الإدارة</th>
                </tr>
            </thead>
            <tbody>
    `;

    bookings.forEach(b => {
        const dateStr = new Date(b.booking_date).toLocaleString('ar-SA');
        const statusClass = `status-${b.status.toLowerCase()}`;
        html += `
            <tr>
                <td>
                    <div style="font-weight:700;">${b.user_name || 'مريض رقم ' + b.user}</div>
                    <div style="font-size:0.7rem; color:var(--text-muted);">${b.phone || ''}</div>
                </td>
                <td>${dateStr}</td>
                <td>${b.appointment_type || 'استشارة'}</td>
                <td style="max-width:200px; font-size:0.8rem;">${b.description || '---'}</td>
                <td><span class="booking-status ${statusClass}">${b.status_display || b.status}</span></td>
                <td>
                    <div class="action-btns" style="display:flex; gap:0.5rem;">
                        ${b.status === 'PENDING' ? `
                            <button class="btn-icon" style="color:#4ade80;" onclick="updateBookingStatus(${b.id}, 'CONFIRMED')" title="تأكيد"><i class="fa-solid fa-check"></i></button>
                            <button class="btn-icon" style="color:#f87171;" onclick="updateBookingStatus(${b.id}, 'REJECTED')" title="رفض"><i class="fa-solid fa-xmark"></i></button>
                        ` : ''}
                        <button class="btn-icon" style="color:var(--text-muted);" onclick="deleteBooking(${b.id})"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    target.innerHTML = html;
}

function filterBookings(status) {
    // Update active chip
    document.querySelectorAll('.btn-chip').forEach(c => c.classList.remove('active'));
    event.target.classList.add('active');

    if (status === 'all') {
        renderBookingsTable(allBookings);
    } else {
        const filtered = allBookings.filter(b => b.status === status);
        renderBookingsTable(filtered);
    }
}

async function updateBookingStatus(id, status) {
    const TOKEN = localStorage.getItem('mas_token');
    try {
        const res = await fetch(`${API_BASE}/bookings/${id}/`, {
            method: 'PATCH',
            headers: { 
                'Authorization': `Token ${TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });
        if (res.ok) {
            fetchBookings();
        } else {
            alert('فشل تحديث الحالة');
        }
    } catch (err) {
        alert('خطأ في الاتصال');
    }
}

// --- Device Management ---
async function fetchDevices() {
    const TOKEN = localStorage.getItem('mas_token');
    const target = document.getElementById('devicesList');
    if (!target) return;

    try {
        const res = await fetch(`${API_BASE}/user-devices/`, {
            headers: { 'Authorization': `Token ${TOKEN}` }
        });
        const devices = await res.json();
        renderDevicesTable(devices);
    } catch (err) {
        console.error("Fetch devices failed", err);
    }
}

function renderDevicesTable(devices) {
    const target = document.getElementById('devicesList');
    if (!target) return;

    let html = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>المستخدم (صاحب الجهاز)</th>
                    <th>نوع الجهاز / المتصفح</th>
                    <th>معرف الجهاز الفريد</th>
                    <th>آخر ظهور</th>
                    <th>إجراءات</th>
                </tr>
            </thead>
            <tbody>
    `;

    devices.forEach(d => {
        const lastSeen = new Date(d.last_login).toLocaleString('ar-SA');
        html += `
            <tr>
                <td>
                    <div style="font-weight:700;">${d.user_name || 'مستخدم #' + d.user}</div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">${d.is_verified ? '✅ جهاز موثق' : '⚠️ قيد التحقق'}</div>
                </td>
                <td><i class="fa-solid fa-desktop" style="margin-left:5px;"></i> ${d.device_name}</td>
                <td style="font-family:monospace; color:var(--accent-main); font-size:0.8rem;">${d.device_id}</td>
                <td>${lastSeen}</td>
                <td>
                    <button class="btn-icon delete" onclick="deleteDevice(${d.id})"><i class="fa-solid fa-trash"></i> منع الجهاز</button>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    target.innerHTML = html;
}

async function deleteDevice(id) {
    if (!confirm('هل تريد فعلاً سحب صلاحية هذا الجهاز؟ سيتم تسجيل خروج المستخدم فوراً.')) return;
    const TOKEN = localStorage.getItem('mas_token');
    try {
        const res = await fetch(`${API_BASE}/user-devices/${id}/`, {
            method: 'DELETE',
            headers: { 'Authorization': `Token ${TOKEN}` }
        });
        if (res.ok) fetchDevices();
    } catch (err) {
        alert('فشل سحب الصلاحية');
    }
}

// --- Diagnosis Detail Viewer ---
async function viewDiagnosisDetails(id) {
    const TOKEN = localStorage.getItem('mas_token');
    const modal = document.getElementById('diagnosisDetailModal');
    const content = document.getElementById('diagnosisDetailContent');
    
    openModal('diagnosisDetailModal');
    content.innerHTML = '<div class="loader">جاري جلب تفاصيل التقرير الطبي...</div>';

    try {
        const res = await fetch(`${API_BASE}/diagnoses/${id}/`, {
            headers: { 'Authorization': `Token ${TOKEN}` }
        });
        const diag = await res.json();

        content.innerHTML = `
            <div class="diagnosis-report-grid" style="display:grid; grid-template-columns: 1fr 1.5fr; gap: 2rem; margin-top: 1rem;">
                <!-- Left: Metadata -->
                <div class="report-meta">
                    <div class="glass-panel" style="padding: 1rem; margin-bottom: 1rem;">
                        <h4 style="color: var(--accent-main); margin-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.5rem;">معلومات الملف</h4>
                        <div class="meta-item" style="margin-bottom:0.8rem;">
                            <span style="display:block; font-size:0.75rem; color:var(--text-muted);">رقم التسجيل:</span>
                            <span style="font-weight:700;">#MAS-DIAG-${diag.id}</span>
                        </div>
                        <div class="meta-item" style="margin-bottom:0.8rem;">
                            <span style="display:block; font-size:0.75rem; color:var(--text-muted);">تاريخ الإجراء:</span>
                            <span>${new Date(diag.created_at).toLocaleString('ar-SA')}</span>
                        </div>
                        <div class="meta-item">
                            <span style="display:block; font-size:0.75rem; color:var(--text-muted);">اسم المريض:</span>
                            <span style="font-weight:600;">${diag.user_name || 'مستخدم رقم ' + diag.user}</span>
                        </div>
                    </div>

                    <div class="glass-panel" style="padding: 1.5rem; text-align: center; border: 2px solid var(--accent-main);">
                        <div style="font-size:0.8rem; text-transform:uppercase; letter-spacing:1px; color:var(--text-muted);">نتيجة الذكاء الاصطناعي</div>
                        <div style="font-size: 2rem; font-weight: 900; color: var(--accent-main); margin: 0.5rem 0;">${diag.result}</div>
                        <div style="font-size:1.1rem; color: var(--success); font-weight: 700;">دقة: ${diag.confidence || '99.9%'}</div>
                    </div>
                </div>

                <!-- Right: Image & Analysis -->
                <div class="report-analysis">
                    <div style="border-radius: 12px; overflow: hidden; border: 1px solid var(--border-glass); margin-bottom: 1.5rem;">
                        <img src="${diag.image}" style="width: 100%; height: auto; display: block;" alt="الأشعة الطبية">
                    </div>
                    <div class="glass-panel" style="padding: 1.5rem;">
                         <h4 style="margin-bottom:1rem;"><i class="fa-solid fa-comment-medical"></i> التحليل التلقائي (Auto-Analysis)</h4>
                         <p style="font-size:0.95rem; line-height:1.6; color:var(--text-muted);">
                             بناءً على معالجة الصورة عبر محرك MAS-AI ${diag.type === 'PNEUMONIA' ? 'الخاص بالرئة' : 'الخاص بالرأس'}، 
                             تم اكتشاف أنماط تتوافق مع "<strong>${diag.result}</strong>". 
                             تم توجيه المريض لمراجعة أخصائي ${diag.type === 'PNEUMONIA' ? 'أمراض صدرية' : 'أورام/أعصاب'}.
                         </p>
                    </div>
                </div>
            </div>
        `;
    } catch (err) {
        content.innerHTML = '<div class="glass-panel">فشل تحميل تفاصيل التشخيص.</div>';
    }
}
