// ========== Smart Device Manager - Frontend App ==========

const API_URL = window.location.origin + '/api';
let ws = null;
let currentPage = 'dashboard';
let devices = [];
let commands = [];
let alerts = [];

// ========== Auth ==========
function getToken() {
    return localStorage.getItem('token');
}

function getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

function isAuthenticated() {
    return !!getToken();
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
}

// Check auth on load
if (!isAuthenticated() && !window.location.pathname.includes('login')) {
    window.location.href = '/login';
}

// ========== API Helper ==========
async function api(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(getToken() && { 'Authorization': `Bearer ${getToken()}` })
        },
        ...options
    };

    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }

    try {
        const res = await fetch(url, config);
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || 'API Error');
        }

        return data;
    } catch (err) {
        showToast(err.message, 'error');
        throw err;
    }
}

// ========== Toast ==========
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle';
    toast.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ========== WebSocket ==========
function connectWebSocket() {
    const wsUrl = `ws://${window.location.host}`;
    ws = new WebSocket(wsUrl);

    const statusDot = document.getElementById('wsStatus');
    const statusText = document.getElementById('wsStatusText');

    ws.onopen = () => {
        statusDot.classList.add('connected');
        statusText.textContent = 'Connected';
        showToast('Real-time connection established', 'success');
    };

    ws.onclose = () => {
        statusDot.classList.remove('connected');
        statusText.textContent = 'Disconnected';
        setTimeout(connectWebSocket, 5000);
    };

    ws.onerror = () => {
        statusDot.classList.remove('connected');
        statusText.textContent = 'Error';
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
        } catch (e) {
            console.error('WebSocket message error:', e);
        }
    };
}

function handleWebSocketMessage(data) {
    switch (data.type) {
        case 'device_created':
        case 'device_updated':
        case 'device_deleted':
            loadDevices();
            loadDashboardSummary();
            break;
        case 'connected':
            console.log('WebSocket connected:', data.message);
            break;
    }
}

// ========== Navigation ==========
function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            switchPage(page);
        });
    });
}

function switchPage(page) {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(page)?.classList.add('active');

    document.getElementById('pageTitle').textContent = 
        page.charAt(0).toUpperCase() + page.slice(1);

    currentPage = page;

    // Load page-specific data
    switch(page) {
        case 'dashboard':
            loadDashboardSummary();
            loadRecentDevices();
            break;
        case 'devices':
            loadDevices();
            break;
        case 'telemetry':
            loadTelemetryDevices();
            break;
        case 'commands':
            loadCommandDevices();
            loadCommands();
            break;
        case 'alerts':
            loadAlerts();
            break;
    }
}

// ========== Dashboard ==========
async function loadDashboardSummary() {
    try {
        const data = await api('/devices/dashboard/summary');
        const stats = data.data;

        document.getElementById('totalDevices').textContent = stats.total || 0;
        document.getElementById('onlineDevices').textContent = stats.online || 0;
        document.getElementById('offlineDevices').textContent = stats.offline || 0;
        document.getElementById('activeAlerts').textContent = stats.recentAlerts || 0;

        // Update device type chart
        renderDeviceTypeChart(stats.devicesByType || []);
    } catch (err) {
        console.error('Dashboard summary error:', err);
    }
}

async function loadRecentDevices() {
    try {
        const data = await api('/devices?limit=5');
        const tbody = document.querySelector('#recentDevicesTable tbody');
        tbody.innerHTML = '';

        data.data.forEach(device => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${device.name}</strong><br><small>${device.deviceId}</small></td>
                <td><span class="badge">${device.type}</span></td>
                <td>${getStatusBadge(device.status)}</td>
                <td>${formatDate(device.lastSeen)}</td>
                <td>
                    <button class="btn btn-sm btn-icon" onclick="viewDevice('${device._id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (err) {
        console.error('Recent devices error:', err);
    }
}

function renderDeviceTypeChart(deviceTypes) {
    const container = document.getElementById('deviceTypeChart');
    if (!deviceTypes.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-chart-pie"></i><p>No devices yet</p></div>';
        return;
    }

    let html = '<div style="display: flex; flex-direction: column; gap: 12px;">';
    const total = deviceTypes.reduce((sum, d) => sum + d.count, 0);

    deviceTypes.forEach(type => {
        const percentage = ((type.count / total) * 100).toFixed(1);
        html += `
            <div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span>${type._id}</span>
                    <span>${type.count} (${percentage}%)</span>
                </div>
                <div style="background: var(--gray-light); border-radius: 4px; height: 24px; overflow: hidden;">
                    <div style="background: var(--primary); height: 100%; width: ${percentage}%; border-radius: 4px; transition: width 0.5s;"></div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

// ========== Devices ==========
async function loadDevices(page = 1) {
    try {
        const search = document.getElementById('deviceSearch')?.value || '';
        const data = await api(`/devices?page=${page}&limit=20&search=${search}`);
        devices = data.data;

        const tbody = document.querySelector('#devicesTable tbody');
        tbody.innerHTML = '';

        if (!devices.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><i class="fas fa-server"></i><p>No devices found</p></td></tr>';
            return;
        }

        devices.forEach(device => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><input type="checkbox" class="device-checkbox" value="${device._id}"></td>
                <td>
                    <strong>${device.name}</strong><br>
                    <small class="text-muted">${device.deviceId}</small>
                </td>
                <td><span class="badge">${device.type}</span></td>
                <td>${getStatusBadge(device.status)}</td>
                <td>${device.location?.name || '-'}</td>
                <td>${formatDate(device.lastSeen)}</td>
                <td>
                    <button class="btn btn-sm btn-icon" onclick="viewDevice('${device._id}')" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-icon" onclick="editDevice('${device._id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-icon btn-danger" onclick="deleteDevice('${device._id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        renderPagination('devicePagination', data.page, data.pages, loadDevices);
    } catch (err) {
        console.error('Devices error:', err);
    }
}

function getStatusBadge(status) {
    const statusMap = {
        'online': '<span class="badge online"><i class="fas fa-circle"></i> Online</span>',
        'offline': '<span class="badge offline"><i class="fas fa-circle"></i> Offline</span>',
        'error': '<span class="badge error"><i class="fas fa-circle"></i> Error</span>',
        'sleeping': '<span class="badge sleeping"><i class="fas fa-circle"></i> Sleeping</span>',
        'maintenance': '<span class="badge maintenance"><i class="fas fa-circle"></i> Maintenance</span>'
    };
    return statusMap[status] || `<span class="badge">${status}</span>`;
}

function formatDate(date) {
    if (!date) return 'Never';
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString();
}

function renderPagination(containerId, currentPage, totalPages, callback) {
    const container = document.getElementById(containerId);
    if (!container || totalPages <= 1) return;

    let html = '';
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="${i === currentPage ? 'active' : ''}" onclick="${callback.name}(${i})">${i}</button>`;
    }
    container.innerHTML = html;
}

// ========== Device Actions ==========
async function viewDevice(id) {
    try {
        const data = await api(`/devices/${id}`);
        const device = data.data.device;
        const telemetry = data.data.latestTelemetry;
        const alerts = data.data.recentAlerts;

        const content = document.getElementById('deviceDetailContent');
        content.innerHTML = `
            <div class="device-detail">
                <div class="detail-header">
                    <h2>${device.name}</h2>
                    <span class="badge ${device.status}">${device.status}</span>
                </div>
                <div class="detail-grid">
                    <div class="detail-section">
                        <h4>Basic Info</h4>
                        <p><strong>ID:</strong> ${device.deviceId}</p>
                        <p><strong>Type:</strong> ${device.type}</p>
                        <p><strong>Category:</strong> ${device.category}</p>
                        <p><strong>Description:</strong> ${device.description || 'N/A'}</p>
                    </div>
                    <div class="detail-section">
                        <h4>Location</h4>
                        <p><strong>Name:</strong> ${device.location?.name || 'N/A'}</p>
                        <p><strong>Coordinates:</strong> ${device.location?.latitude || '-'}, ${device.location?.longitude || '-'}</p>
                    </div>
                    <div class="detail-section">
                        <h4>Hardware</h4>
                        <p><strong>Model:</strong> ${device.model || 'N/A'}</p>
                        <p><strong>MAC:</strong> ${device.hardware?.macAddress || 'N/A'}</p>
                        <p><strong>IP:</strong> ${device.hardware?.ipAddress || 'N/A'}</p>
                        <p><strong>Firmware:</strong> ${device.firmware?.version || 'N/A'}</p>
                    </div>
                    <div class="detail-section">
                        <h4>Power</h4>
                        <p><strong>Source:</strong> ${device.power?.source || 'N/A'}</p>
                        <p><strong>Battery:</strong> ${device.power?.batteryLevel || '-'}%</p>
                        <p><strong>Voltage:</strong> ${device.power?.batteryVoltage || '-'}V</p>
                    </div>
                </div>
                ${telemetry ? `
                <div class="detail-section">
                    <h4>Latest Telemetry</h4>
                    <p><strong>Temperature:</strong> ${telemetry.temperature?.value || '-'}°C</p>
                    <p><strong>Humidity:</strong> ${telemetry.humidity?.value || '-'}%</p>
                    <p><strong>Power:</strong> ${telemetry.power || '-'}W</p>
                    <p><strong>Last Update:</strong> ${formatDate(telemetry.timestamp)}</p>
                </div>
                ` : ''}
            </div>
        `;

        document.getElementById('deviceDetailModal').classList.add('active');
    } catch (err) {
        showToast('Error loading device details', 'error');
    }
}

async function editDevice(id) {
    showToast('Edit feature coming soon', 'info');
}

async function deleteDevice(id) {
    if (!confirm('Are you sure you want to delete this device?')) return;

    try {
        await api(`/devices/${id}`, { method: 'DELETE' });
        showToast('Device deleted successfully', 'success');
        loadDevices();
        loadDashboardSummary();
    } catch (err) {
        showToast('Error deleting device', 'error');
    }
}

// ========== Add Device ==========
function initAddDevice() {
    const modal = document.getElementById('addDeviceModal');
    const btn = document.getElementById('addDeviceBtn');
    const closeBtns = modal.querySelectorAll('.modal-close');
    const form = document.getElementById('addDeviceForm');

    btn.addEventListener('click', () => modal.classList.add('active'));
    closeBtns.forEach(b => b.addEventListener('click', () => modal.classList.remove('active')));

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);

        // Handle nested objects
        const deviceData = {
            deviceId: data.deviceId,
            name: data.name,
            type: data.type,
            category: data.category,
            description: data.description,
            location: {
                name: data['location.name'],
                latitude: data['location.latitude'] ? parseFloat(data['location.latitude']) : undefined,
                longitude: data['location.longitude'] ? parseFloat(data['location.longitude']) : undefined
            }
        };

        try {
            await api('/devices', {
                method: 'POST',
                body: deviceData
            });
            showToast('Device added successfully', 'success');
            modal.classList.remove('active');
            form.reset();
            loadDevices();
            loadDashboardSummary();
        } catch (err) {
            showToast('Error adding device', 'error');
        }
    });
}

// ========== Telemetry ==========
async function loadTelemetryDevices() {
    try {
        const data = await api('/devices?limit=100');
        const select = document.getElementById('telemetryDeviceSelect');
        select.innerHTML = '<option value="">Select Device</option>';

        data.data.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.textContent = `${device.name} (${device.deviceId})`;
            select.appendChild(option);
        });

        select.addEventListener('change', (e) => {
            if (e.target.value) loadTelemetryData(e.target.value);
        });
    } catch (err) {
        console.error('Telemetry devices error:', err);
    }
}

async function loadTelemetryData(deviceId) {
    try {
        const hours = document.getElementById('timeRange')?.value || 24;
        const data = await api(`/devices/${deviceId}/telemetry?hours=${hours}`);

        if (data.data.length > 0) {
            const latest = data.data[0];
            document.getElementById('currentTemp').textContent = latest.temperature?.value ? `${latest.temperature.value}°C` : '--°C';
            document.getElementById('currentHumidity').textContent = latest.humidity?.value ? `${latest.humidity.value}%` : '--%';
            document.getElementById('currentPower').textContent = latest.power ? `${latest.power}W` : '--W';
            document.getElementById('currentBattery').textContent = latest.deviceHealth?.batteryLevel ? `${latest.deviceHealth.batteryLevel}%` : '--%';
        }
    } catch (err) {
        console.error('Telemetry data error:', err);
    }
}

// ========== Commands ==========
async function loadCommandDevices() {
    try {
        const data = await api('/devices?limit=100');
        const select = document.getElementById('commandDeviceSelect');
        select.innerHTML = '<option value="">Select Device</option>';

        data.data.forEach(device => {
            const option = document.createElement('option');
            option.value = device._id;
            option.textContent = `${device.name} (${device.deviceId})`;
            select.appendChild(option);
        });
    } catch (err) {
        console.error('Command devices error:', err);
    }
}

async function loadCommands() {
    try {
        const data = await api('/commands?limit=50');
        commands = data.data;

        const tbody = document.querySelector('#commandsTable tbody');
        tbody.innerHTML = '';

        if (!commands.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><i class="fas fa-terminal"></i><p>No commands yet</p></td></tr>';
            return;
        }

        commands.forEach(cmd => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${cmd.deviceId}</td>
                <td><code>${cmd.command}</code></td>
                <td><span class="badge ${cmd.status}">${cmd.status}</span></td>
                <td>${formatDate(cmd.sentAt || cmd.createdAt)}</td>
                <td>
                    ${cmd.status === 'failed' ? `
                    <button class="btn btn-sm" onclick="retryCommand('${cmd._id}')">
                        <i class="fas fa-redo"></i>
                    </button>
                    ` : ''}
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (err) {
        console.error('Commands error:', err);
    }
}

function initCommands() {
    document.getElementById('sendCommandBtn').addEventListener('click', async () => {
        const deviceId = document.getElementById('commandDeviceSelect').value;
        const command = document.getElementById('commandSelect').value;

        if (!deviceId || !command) {
            showToast('Please select device and command', 'warning');
            return;
        }

        try {
            await api('/commands', {
                method: 'POST',
                body: { deviceId, command }
            });
            showToast('Command sent successfully', 'success');
            loadCommands();
        } catch (err) {
            showToast('Error sending command', 'error');
        }
    });
}

async function retryCommand(id) {
    try {
        await api(`/commands/${id}/retry`, { method: 'POST' });
        showToast('Command retried', 'success');
        loadCommands();
    } catch (err) {
        showToast('Error retrying command', 'error');
    }
}

// ========== Alerts ==========
async function loadAlerts() {
    try {
        const data = await api('/devices?limit=1'); // Placeholder - alerts endpoint would be needed
        const tbody = document.querySelector('#alertsTable tbody');
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><i class="fas fa-bell"></i><p>Alerts feature coming soon</p></td></tr>';
    } catch (err) {
        console.error('Alerts error:', err);
    }
}

// ========== Search ==========
function initSearch() {
    const searchInput = document.getElementById('deviceSearch');
    if (searchInput) {
        let timeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => loadDevices(), 500);
        });
    }
}

// ========== Refresh ==========
function initRefresh() {
    document.getElementById('refreshBtn').addEventListener('click', () => {
        const icon = document.querySelector('#refreshBtn i');
        icon.classList.add('fa-spin');

        switch(currentPage) {
            case 'dashboard':
                loadDashboardSummary();
                loadRecentDevices();
                break;
            case 'devices':
                loadDevices();
                break;
            case 'commands':
                loadCommands();
                break;
        }

        setTimeout(() => icon.classList.remove('fa-spin'), 1000);
    });
}

// ========== Logout ==========
function initLogout() {
    document.getElementById('logoutBtn').addEventListener('click', logout);
}

// ========== User Info ==========
function loadUserInfo() {
    const user = getUser();
    if (user) {
        document.getElementById('userName').textContent = user.username || 'User';
    }
}

// ========== Modal Close ==========
function initModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    });
}

// ========== Initialize ==========
document.addEventListener('DOMContentLoaded', () => {
    if (!isAuthenticated() && !window.location.pathname.includes('login')) return;

    initNavigation();
    initAddDevice();
    initCommands();
    initSearch();
    initRefresh();
    initLogout();
    initModals();
    loadUserInfo();

    if (isAuthenticated()) {
        connectWebSocket();
        loadDashboardSummary();
        loadRecentDevices();
    }
});
