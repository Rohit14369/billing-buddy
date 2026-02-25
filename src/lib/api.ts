const API_BASE = "https://sadik-traders-backend.vercel.app/api";

function getToken(): string | null {
  return localStorage.getItem("st_token");
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse(res: Response) {
  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || data.error || "Request failed");
  return data;
}

// AUTH
export async function loginUser(email: string, password: string) {
  const res = await fetch(`${API_BASE}/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(res);
}

export async function registerUser(name: string, email: string, password: string) {
  const res = await fetch(`${API_BASE}/users/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  return handleResponse(res);
}

export async function getProfile() {
  const res = await fetch(`${API_BASE}/users/profile`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

// PRODUCTS
export async function getProducts() {
  const res = await fetch(`${API_BASE}/products`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function getProduct(id: string) {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function createProduct(data: any) {
  const res = await fetch(`${API_BASE}/products`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateProduct(id: string, data: any) {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteProduct(id: string) {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function updateStock(id: string, stock: number) {
  const res = await fetch(`${API_BASE}/products/${id}/stock`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ stock }),
  });
  return handleResponse(res);
}

// BILLS
export async function createBill(data: any) {
  const res = await fetch(`${API_BASE}/bills`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function getBills() {
  const res = await fetch(`${API_BASE}/bills`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function getBill(id: string) {
  const res = await fetch(`${API_BASE}/bills/${id}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function deleteBill(id: string) {
  const res = await fetch(`${API_BASE}/bills/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function updateBill(id: string, data: any) {
  const res = await fetch(`${API_BASE}/bills/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

// DASHBOARD
export async function getDashboard() {
  const res = await fetch(`${API_BASE}/dashboard`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

// LOW STOCK
export async function getLowStock() {
  const res = await fetch(`${API_BASE}/low-stock`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

// ATTENDANCE (localStorage based since backend may not have it)
export function getAttendanceRecords(): any[] {
  try {
    return JSON.parse(localStorage.getItem("st_attendance") || "[]");
  } catch { return []; }
}

export function saveAttendanceRecord(record: any) {
  const records = getAttendanceRecords();
  records.unshift(record);
  localStorage.setItem("st_attendance", JSON.stringify(records));
}

// PAYMENT TRACKING (localStorage based)
export function getPaymentRecords(): any[] {
  try {
    return JSON.parse(localStorage.getItem("st_payments") || "[]");
  } catch { return []; }
}

export function savePaymentRecord(record: any) {
  const records = getPaymentRecords();
  records.push(record);
  localStorage.setItem("st_payments", JSON.stringify(records));
}

export function getPaymentsForBill(billId: string): any[] {
  return getPaymentRecords().filter((p: any) => p.billId === billId);
}

export function getTotalPaidForBill(billId: string): number {
  return getPaymentsForBill(billId).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
}
