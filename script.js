// ==========================================
// Firebase
// ==========================================

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    updateDoc,
    doc,
    orderBy,
    query
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


// ==========================================
// Firebase Configuration
// ==========================================

const firebaseConfig = {
    apiKey: "AIzaSyAiNo8aCVZ-K39YLQdRkTOV8zxYfipWKck",
    authDomain: "dstation-booking-14a60.firebaseapp.com",
    projectId: "dstation-booking-14a60",
    storageBucket: "dstation-booking-14a60.firebasestorage.app",
    messagingSenderId: "476418357748",
    appId: "1:476418357748:web:e89739b51600cb39cca1a1",
    measurementId: "G-TB5Z0JT134"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let bookings = [];


// ==========================================
// ข้อมูลบริการ
// ==========================================

const serviceData = {

    "Byte Meeting Room": {
        price: 500,
        duration: 2
    },

    "Pixel Meeting Room": {
        price: 800,
        duration: 2
    },

    "Nexus Meeting Room": {
        price: 1000,
        duration: 2
    },

    "Podcast Studio": {
        price: 500,
        duration: 1
    },

    "Live Studio": {
        price: 500,
        duration: 1
    }

};


// ==========================================
// โหลดข้อมูลการจอง
// ==========================================

async function loadBookings() {

    try {

        const snapshot = await getDocs(
            collection(db, "bookings")
        );

        bookings = [];

        snapshot.forEach((document) => {

            bookings.push({
                id: document.id,
                ...document.data()
            });

        });

        renderBookings();

    } catch (error) {

        console.error(
            "เกิดข้อผิดพลาดในการโหลดข้อมูล:",
            error
        );

    }

}


// ==========================================
// แสดงรายการจอง
// ==========================================

function renderBookings() {

    const list =
        document.getElementById("bookingList");

    if (!list) {
        return;
    }

    list.innerHTML = "";

    if (bookings.length === 0) {

        list.innerHTML = `
            <p>ยังไม่มีคำขอจอง</p>
        `;

        updateDashboard();

        return;
    }


    bookings.forEach((booking) => {

        let statusText = "รอตรวจสอบ";
        let statusClass = "";

        if (booking.status === "approved") {

            statusText = "อนุมัติแล้ว";
            statusClass = "confirmed";

        }

        if (booking.status === "unavailable") {

            statusText = "ไม่ว่าง";
            statusClass = "unavailable";

        }


        let buttons = "";

        if (booking.status === "pending") {

            buttons = `
                <div class="buttons">

                    <button
                        class="approve"
                        onclick="approveBooking('${booking.id}')"
                    >
                        ✓ อนุมัติ
                    </button>

                    <button
                        class="reject"
                        onclick="rejectBooking('${booking.id}')"
                    >
                        ✕ ไม่ว่าง
                    </button>

                </div>
            `;

        }


        list.innerHTML += `

            <div class="booking">

                <div>

                    <strong>
                        ${booking.customerName || "-"}
                    </strong>

                    <p>
                        🏢 ${booking.service || "-"}
                    </p>

                    <p>
                        📅 ${formatDate(booking.date)}
                    </p>

                    <p>
                        ⏰
                        ${booking.startTime || "-"}
                        -
                        ${booking.endTime || "-"}
                        น.
                    </p>

                    <p>
                        👥
                        ${booking.people || "-"}
                        คน
                    </p>

                </div>


                <div class="status">

                    <span class="${statusClass}">
                        ${statusText}
                    </span>

                    ${buttons}

                </div>

            </div>

        `;

    });


    updateDashboard();

}


// ==========================================
// โหลดข้อความจาก LINE
// ==========================================

async function loadLineMessages() {

    try {

        const messagesQuery = query(
            collection(db, "line_messages"),
            orderBy("createdAt", "desc")
        );

        const snapshot =
            await getDocs(messagesQuery);

        const list =
            document.getElementById(
                "lineMessageList"
            );

        if (!list) {
            return;
        }

        list.innerHTML = "";

        if (snapshot.empty) {

            list.innerHTML = `
                <p>ยังไม่มีข้อความจาก LINE</p>
            `;

            return;
        }


        snapshot.forEach((document) => {

            const message =
                document.data();

            list.innerHTML += `

                <div class="booking">

                    <div>

                        <strong>
                            💬 ลูกค้าจาก LINE
                        </strong>

                        <p>
                            ${message.text || ""}
                        </p>

                        <p>
                            👤
                            ${message.userId || "-"}
                        </p>

                    </div>

                    <div class="status">

                        <span>
                            รอดำเนินการ
                        </span>

                    </div>

                </div>

            `;

        });

    } catch (error) {

        console.error(
            "ไม่สามารถโหลดข้อความจาก LINE:",
            error
        );

    }

}


// ==========================================
// แปลงวันที่
// ==========================================

function formatDate(date) {

    if (!date) {
        return "";
    }

    if (!date.includes("-")) {
        return date;
    }

    const parts = date.split("-");

    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const day = parseInt(parts[2]);

    const thaiMonths = [
        "มกราคม",
        "กุมภาพันธ์",
        "มีนาคม",
        "เมษายน",
        "พฤษภาคม",
        "มิถุนายน",
        "กรกฎาคม",
        "สิงหาคม",
        "กันยายน",
        "ตุลาคม",
        "พฤศจิกายน",
        "ธันวาคม"
    ];

    return `${day} ${thaiMonths[month - 1]} ${year + 543}`;

}


// ==========================================
// อนุมัติการจอง
// ==========================================

async function approveBooking(id) {

    try {

        await updateDoc(
            doc(db, "bookings", id),
            {
                status: "approved"
            }
        );

        await loadBookings();

    } catch (error) {

        console.error(error);

        alert(
            "ไม่สามารถอนุมัติการจองได้"
        );

    }

}


// ==========================================
// เปลี่ยนเป็นไม่ว่าง
// ==========================================

async function rejectBooking(id) {

    try {

        await updateDoc(
            doc(db, "bookings", id),
            {
                status: "unavailable"
            }
        );

        await loadBookings();

    } catch (error) {

        console.error(error);

        alert(
            "ไม่สามารถเปลี่ยนสถานะได้"
        );

    }

}


// ==========================================
// Dashboard
// ==========================================

function updateDashboard() {

    const total =
        bookings.length;

    const pending =
        bookings.filter(
            item => item.status === "pending"
        ).length;

    const approved =
        bookings.filter(
            item => item.status === "approved"
        ).length;

    const unavailable =
        bookings.filter(
            item => item.status === "unavailable"
        ).length;


    const totalElement =
        document.getElementById(
            "totalBooking"
        );

    const pendingElement =
        document.getElementById(
            "pendingBooking"
        );

    const approvedElement =
        document.getElementById(
            "approvedBooking"
        );

    const rejectedElement =
        document.getElementById(
            "rejectedBooking"
        );


    if (totalElement) {
        totalElement.textContent = total;
    }

    if (pendingElement) {
        pendingElement.textContent = pending;
    }

    if (approvedElement) {
        approvedElement.textContent = approved;
    }

    if (rejectedElement) {
        rejectedElement.textContent = unavailable;
    }

}


// ==========================================
// เปิดฟอร์ม
// ==========================================

function openForm() {

    const modal =
        document.getElementById(
            "bookingModal"
        );

    if (!modal) {
        return;
    }

    modal.style.display = "flex";

    updateServiceInfo();

}


// ==========================================
// ปิดฟอร์ม
// ==========================================

function closeForm() {

    const modal =
        document.getElementById(
            "bookingModal"
        );

    if (modal) {

        modal.style.display = "none";

    }

}


// ==========================================
// แสดงข้อมูลบริการ
// ==========================================

function updateServiceInfo() {

    const serviceElement =
        document.getElementById(
            "service"
        );

    if (!serviceElement) {
        return;
    }

    const service =
        serviceElement.value;

    const info =
        serviceData[service];

    if (!info) {
        return;
    }


    let infoBox =
        document.getElementById(
            "serviceInfo"
        );


    if (!infoBox) {

        infoBox =
            document.createElement("div");

        infoBox.id =
            "serviceInfo";

        infoBox.style.marginTop =
            "8px";

        infoBox.style.padding =
            "10px 12px";

        infoBox.style.borderRadius =
            "8px";

        infoBox.style.background =
            "#f5f5f5";

        infoBox.style.fontSize =
            "14px";


        serviceElement.parentElement
            .appendChild(infoBox);

    }


    infoBox.innerHTML = `

        <strong>
            ${service}
        </strong>

        <br>

        💰 ${info.price.toLocaleString()} บาท

        &nbsp;&nbsp;

        ⏱️ ${info.duration} ชั่วโมง

    `;


    updateEndTime();

}


// ==========================================
// คำนวณเวลาสิ้นสุดอัตโนมัติ
// ==========================================

function updateEndTime() {

    const serviceElement =
        document.getElementById(
            "service"
        );

    const startElement =
        document.getElementById(
            "startTime"
        );

    const endElement =
        document.getElementById(
            "endTime"
        );


    if (
        !serviceElement ||
        !startElement ||
        !endElement
    ) {
        return;
    }


    if (!startElement.value) {
        return;
    }


    const info =
        serviceData[
            serviceElement.value
        ];

    if (!info) {
        return;
    }


    const startMinutes =
        timeToMinutes(
            startElement.value
        );

    let endMinutes =
        startMinutes +
        info.duration * 60;


    if (endMinutes >= 1440) {
        endMinutes = 1439;
    }


    const hours =
        Math.floor(endMinutes / 60);

    const minutes =
        endMinutes % 60;


    endElement.value =
        String(hours).padStart(2, "0")
        + ":"
        + String(minutes).padStart(2, "0");

}


// ==========================================
// ตรวจเวลาชน
// ==========================================

async function checkTimeConflict(
    service,
    date,
    start,
    end
) {

    const snapshot =
        await getDocs(
            collection(
                db,
                "bookings"
            )
        );


    for (
        const document of snapshot.docs
    ) {

        const booking =
            document.data();


        if (
            booking.status ===
            "unavailable"
        ) {
            continue;
        }


        if (
            booking.service !==
            service
        ) {
            continue;
        }


        if (
            booking.date !==
            date
        ) {
            continue;
        }


        if (
            !booking.startTime ||
            !booking.endTime
        ) {
            continue;
        }


        const existingStart =
            timeToMinutes(
                booking.startTime
            );

        const existingEnd =
            timeToMinutes(
                booking.endTime
            );

        const newStart =
            timeToMinutes(start);

        const newEnd =
            timeToMinutes(end);


        if (
            newStart < existingEnd &&
            newEnd > existingStart
        ) {

            return true;

        }

    }


    return false;

}


// ==========================================
// แปลงเวลาเป็นนาที
// ==========================================

function timeToMinutes(time) {

    const parts =
        time.split(":");

    const hour =
        parseInt(parts[0]);

    const minute =
        parseInt(parts[1]);

    return hour * 60 + minute;

}


// ==========================================
// เพิ่มคำขอจอง
// ==========================================

async function addBooking() {

    const nameElement =
        document.getElementById(
            "customerName"
        );

    const serviceElement =
        document.getElementById(
            "service"
        );

    const dateElement =
        document.getElementById(
            "bookingDate"
        );

    const peopleElement =
        document.getElementById(
            "people"
        );

    const startElement =
        document.getElementById(
            "startTime"
        );

    const endElement =
        document.getElementById(
            "endTime"
        );


    if (
        !nameElement ||
        !serviceElement ||
        !dateElement ||
        !peopleElement ||
        !startElement ||
        !endElement
    ) {

        alert(
            "ไม่พบช่องข้อมูลในแบบฟอร์ม"
        );

        return;

    }


    const name =
        nameElement.value.trim();

    const service =
        serviceElement.value;

    const date =
        dateElement.value;

    const people =
        peopleElement.value.trim();

    const start =
        startElement.value;

    const end =
        endElement.value;


    // ตรวจเฉพาะข้อมูลที่จำเป็น
    // ไม่ตรวจจำนวนคน

    if (
        name === "" ||
        date === "" ||
        people === "" ||
        start === ""
    ) {

        alert(
            "กรุณากรอกข้อมูลให้ครบ"
        );

        return;

    }


    // ถ้ายังไม่มีเวลาสิ้นสุด
    // ให้คำนวณจากบริการ

    if (end === "") {

        updateEndTime();

    }


    const finalEnd =
        endElement.value;


    if (!finalEnd) {

        alert(
            "กรุณาระบุเวลาสิ้นสุด"
        );

        return;

    }


    if (
        timeToMinutes(start) >=
        timeToMinutes(finalEnd)
    ) {

        alert(
            "เวลาสิ้นสุดต้องมากกว่าเวลาเริ่ม"
        );

        return;

    }


    try {

        // ตรวจเวลาชน

        const conflict =
            await checkTimeConflict(
                service,
                date,
                start,
                finalEnd
            );


        if (conflict) {

            alert(
                "⚠️ ช่วงเวลานี้มีการจองแล้ว กรุณาเลือกเวลาอื่น"
            );

            return;

        }


        const info =
            serviceData[service];


        await addDoc(
            collection(
                db,
                "bookings"
            ),
            {

                customerName:
                    name,

                service:
                    service,

                date:
                    date,

                startTime:
                    start,

                endTime:
                    finalEnd,

                people:
                    people,

                price:
                    info
                        ? info.price
                        : 0,

                duration:
                    info
                        ? info.duration
                        : 0,

                status:
                    "pending"

            }
        );


        alert(
            "บันทึกคำขอจองเรียบร้อยแล้ว"
        );


        nameElement.value = "";
        dateElement.value = "";
        peopleElement.value = "";
        startElement.value = "";
        endElement.value = "";


        closeForm();

        await loadBookings();


    } catch (error) {

        console.error(
            "เกิดข้อผิดพลาด:",
            error
        );

        alert(
            "ไม่สามารถบันทึกข้อมูลได้"
        );

    }

}


// ==========================================
// ตั้งค่าฟอร์ม
// ==========================================

function setupBookingForm() {

    const serviceElement =
        document.getElementById(
            "service"
        );

    const startElement =
        document.getElementById(
            "startTime"
        );


    if (serviceElement) {

        serviceElement.addEventListener(
            "change",
            () => {

                updateServiceInfo();

            }
        );

    }


    if (startElement) {

        startElement.addEventListener(
            "change",
            () => {

                updateEndTime();

            }
        );

    }


    updateServiceInfo();

}


// ==========================================
// ให้ HTML เรียก Function ได้
// ==========================================

window.openForm =
    openForm;

window.closeForm =
    closeForm;

window.addBooking =
    addBooking;

window.approveBooking =
    approveBooking;

window.rejectBooking =
    rejectBooking;


// ==========================================
// เริ่มระบบ
// ==========================================

setupBookingForm();

loadBookings();

loadLineMessages();
