async function login(){

const phone = document.getElementById("phone").value
const password = document.getElementById("password").value

const res = await fetch("/api/shops/login",{
method:"POST",
headers:{ "Content-Type":"application/json" },
body: JSON.stringify({phone,password})
})

const data = await res.json()

console.log("LOGIN RESPONSE:", data)

if(data.shopId){

localStorage.setItem("token", data.token)
localStorage.setItem("shopId", data.shopId)
localStorage.setItem("qrCode", data.qrCode)

window.location.href="/dashboard.html"

}else{

alert(data.message)

}

}



async function addTransaction(){

const phone=document.getElementById("tphone").value
const billAmount=document.getElementById("amount").value

const shopId=localStorage.getItem("shopId")

const res=await fetch("/api/add-transaction",{

method:"POST",

headers:{ "Content-Type":"application/json" },

body: JSON.stringify({phone,shopId,billAmount})

})

const data=await res.json()

document.getElementById("result").innerText=JSON.stringify(data)

}



async function redeem(){

const phone=document.getElementById("rphone").value
const points=document.getElementById("points").value

const shopId=localStorage.getItem("shopId")

const res=await fetch("/api/redeem",{

method:"POST",

headers:{ "Content-Type":"application/json" },

body: JSON.stringify({phone,shopId,points})

})

const data=await res.json()

document.getElementById("result").innerText=JSON.stringify(data)

}


async function loadStats(){

const shopId = localStorage.getItem("shopId")

const res = await fetch(`/api/dashboard/${shopId}`)

const data = await res.json()

document.getElementById("customers").innerText = data.totalCustomers
document.getElementById("transactions").innerText = data.totalTransactions
document.getElementById("pointsIssued").innerText = data.totalPointsIssued
document.getElementById("revenue").innerText = "₹" + data.revenue
document.getElementById("repeat").innerText = data.repeatCustomers

}



async function loadQueue(){

const shopId=localStorage.getItem("shopId")

const res=await fetch(`/api/queue/${shopId}`)

const customers=await res.json()

const container=document.getElementById("queue")

container.innerHTML=""

customers.forEach(c=>{

container.innerHTML+=`
<div class="queue-card">

<div class="customer-info">
<strong>${c.name}</strong><br>
📱 ${c.phone}
</div>

<div class="bill-input">
<input id="amount-${c._id}" placeholder="Bill Amount">

<button onclick="addFromQueue('${c.phone}','${c._id}', this)">
Add Bill
</button>
</div>

</div>
`

})

}



async function addFromQueue(phone,id,button){

const amount = document.getElementById(`amount-${id}`).value

if(!amount || amount <= 0){
alert("Enter a valid bill amount")
return
}

const shopId=localStorage.getItem("shopId")

button.disabled = true
button.innerText = "Processing..."

const res = await fetch("/api/add-transaction",{

method:"POST",

headers:{"Content-Type":"application/json"},

body:JSON.stringify({

phone,
shopId,
billAmount:amount

})

})

const data = await res.json()

if(data.message !== "Points added"){
alert(data.message)
}

button.disabled = false
button.innerText = "Add Bill"

loadQueue()

}



function loadQR(){

const qr = localStorage.getItem("qrCode")

if(qr){
document.getElementById("shopQR").src = qr
}

}



window.onload = () => {

loadStats()
loadQueue()
loadQR()

}



setInterval(loadQueue,3000)