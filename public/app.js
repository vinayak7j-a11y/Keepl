/* =========================
   GLOBAL API HELPER
========================= */

async function apiRequest(url, method = "GET", body = null) {

    const token = localStorage.getItem("token");

    const options = {
        method,
        headers: {
            "Content-Type": "application/json"
        }
    };

    if (token) {
        options.headers["Authorization"] = `Bearer ${token}`;
    }

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {

        const res = await fetch(url, options);

        if (!res.ok) {

            if (res.status === 401) {
                localStorage.clear();
                window.location.href = "/";
            }

            const text = await res.text();
            throw new Error(text || "API request failed");
        }

        return await res.json();

    } catch (err) {

        console.error("API Error:", err);
        throw err;

    }
}


/* =========================
   LOGIN
========================= */

async function login() {

    const phone = document.getElementById("phone")?.value.trim();
    const password = document.getElementById("password")?.value.trim();

    if (!phone || !password) {
        alert("Please enter phone and password");
        return;
    }

    try {

        const data = await apiRequest("/api/shops/login", "POST", {
            phone,
            password
        });

        if (data.shopId) {

            localStorage.setItem("token", data.token);
            localStorage.setItem("shopId", data.shopId);
            localStorage.setItem("qrCode", data.qrCode || "");

            window.location.href = `/dashboard/${data.shopId}`;

        } else {

            alert(data.message || "Login failed");

        }

    } catch (err) {

        alert("Server error");

    }
}


/* =========================
   ADD TRANSACTION
========================= */

async function addTransaction() {

    const phone = document.getElementById("tphone")?.value.trim();
    const billAmount = Number(document.getElementById("amount")?.value);

    const shopId = localStorage.getItem("shopId");

    if (!phone || !billAmount) {
        alert("Enter phone and bill amount");
        return;
    }

    try {

        const data = await apiRequest("/api/add-transaction", "POST", {
            phone,
            shopId,
            billAmount
        });

        const result = document.getElementById("result");

        if (result) {
            result.innerText = data.message || "Transaction added";
        }

    } catch (err) {

        alert("Transaction failed");

    }
}


/* =========================
   REDEEM POINTS
========================= */

async function redeem() {

    const phone = document.getElementById("rphone")?.value.trim();
    const points = Number(document.getElementById("points")?.value);

    const shopId = localStorage.getItem("shopId");

    if (!phone || !points) {
        alert("Enter phone and points");
        return;
    }

    try {

        const data = await apiRequest("/api/redeem", "POST", {
            phone,
            shopId,
            points
        });

        const result = document.getElementById("result");

        if (result) {
            result.innerText = data.message || "Redeemed successfully";
        }

    } catch (err) {

        alert("Redeem failed");

    }
}


/* =========================
   LOAD DASHBOARD STATS
========================= */

async function loadStats() {

    const shopId = localStorage.getItem("shopId");

    if (!shopId) return;

    try {

        const data = await apiRequest(`/api/dashboard/${shopId}`);

        const customers = document.getElementById("customers");
        const transactions = document.getElementById("transactions");
        const pointsIssued = document.getElementById("pointsIssued");
        const revenue = document.getElementById("revenue");
        const repeat = document.getElementById("repeat");

        if (customers) customers.innerText = data.totalCustomers || 0;
        if (transactions) transactions.innerText = data.totalTransactions || 0;
        if (pointsIssued) pointsIssued.innerText = data.totalPointsIssued || 0;
        if (revenue) revenue.innerText = "₹" + (data.revenue || 0);
        if (repeat) repeat.innerText = data.repeatCustomers || 0;

    } catch (err) {

        console.error("Stats error:", err);

    }
}


/* =========================
   LOAD CUSTOMER QUEUE
========================= */

async function loadQueue() {

    const shopId = window.location.pathname.split("/").pop();

    if (!shopId) return;

    const container = document.getElementById("queue");

    if (!container) return;

    try {

        const customers = await apiRequest(`/api/queue/${shopId}`);

        container.innerHTML = "";

        customers.forEach(c => {

            const div = document.createElement("div");
            div.className = "queue-item";

            div.innerHTML = `
                <span>${c.name || "Customer"} - ${c.phone}</span>
                <input id="amount-${c._id}" type="number" placeholder="Bill Amount">
                <button onclick="addFromQueue('${c.phone}','${c._id}', this)">
                    Add Bill
                </button>
            `;

            container.appendChild(div);

        });

    } catch (err) {

        console.error("Queue load error:", err);

    }
}


/* =========================
   ADD BILL FROM QUEUE
========================= */

async function addFromQueue(phone, id, button) {

    const amount = Number(document.getElementById(`amount-${id}`)?.value);

    if (!amount || amount <= 0) {
        alert("Enter a valid bill amount");
        return;
    }

    const shopId = localStorage.getItem("shopId");

    button.disabled = true;
    button.innerText = "Processing...";

    try {

        const data = await apiRequest("/api/add-transaction", "POST", {
            phone,
            shopId,
            billAmount: amount
        });

        if (data.message !== "Points added") {
            alert(data.message);
        }

        loadQueue();

    } catch (err) {

        alert("Failed to add bill");

    }

    button.disabled = false;
    button.innerText = "Add Bill";
}


/* =========================
   LOAD SHOP QR
========================= */

function loadQR() {

    const qr = localStorage.getItem("qrCode");
    const img = document.getElementById("shopQR");

    if (qr && img) {
        img.src = qr;
    }

}


/* =========================
   PAGE INIT
========================= */

window.onload = () => {

    loadStats();
    loadQueue();
    loadQR();

};


/* =========================
   SERVICE WORKER
========================= */

if ("serviceWorker" in navigator) {

navigator.serviceWorker
.register("/sw.js")
.then(() => console.log("Service Worker registered"))
.catch(err => console.log("SW failed:", err));

}


/* =========================
   INSTALL APP PROMPT
========================= */

let deferredPrompt;

window.addEventListener("beforeinstallprompt", (e) => {

e.preventDefault();
deferredPrompt = e;

const installBtn = document.getElementById("installBtn");

if (installBtn) {

installBtn.style.display = "block";

installBtn.onclick = async () => {

deferredPrompt.prompt();

const result = await deferredPrompt.userChoice;

if(result.outcome === "accepted"){
console.log("App installed");
}

installBtn.style.display = "none";

};

}

});


/* =========================
   AUTO REFRESH QUEUE
========================= */

setInterval(() => {

if (document.getElementById("queue")) {
loadQueue();
}

}, 3000);