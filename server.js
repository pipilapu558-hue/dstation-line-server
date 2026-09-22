import express from "express";
import OpenAI from "openai";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import fs from "fs";

const app = express();

// ========================================
// CORS
// ========================================

app.use((req, res, next) => {
    res.header(
        "Access-Control-Allow-Origin",
        "*"
    );

    res.header(
        "Access-Control-Allow-Methods",
        "GET,POST,PUT,DELETE,OPTIONS"
    );

    res.header(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
    );

    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }

    next();
});

app.use(express.json());

const PORT = process.env.PORT || 10000;

// ========================================
// Firebase
// ========================================

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    serviceAccount = JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    );
} else {
    serviceAccount = JSON.parse(
        fs.readFileSync(
            "./firebase-service-account.json",
            "utf8"
        )
    );
}

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

// ========================================
// OpenAI
// ========================================

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// ========================================
// เก็บประวัติการคุย
// ========================================

const conversations = new Map();

// ========================================
// ป้องกันการบันทึกซ้ำ
// ========================================

const savedBookings = new Map();

// ========================================
// รูปภาพ D-STATION
// ========================================

const IMAGES = {

    coworking:
        "https://i.ibb.co/7Jxd0r4f/message-Image-1789295654187.jpg",

    food:
        "https://i.ibb.co/QvhjZzBK/79.jpg",

    drinks:
        "https://i.ibb.co/s98Cyvx3/All-menu-pdf-A4-1.jpg",

    live:
        "https://i.ibb.co/YBChTY6m/705374241-122189785892758405-7329211305063398516-n-1.jpg",

    meeting:
        "https://i.ibb.co/4R9Bc2BW/727681090-122192614562758405-2094908553826759684-n-1.jpg",

    podcast:
        "https://i.ibb.co/HDmWC5mb/Gemini-Generated-Image-2odn1q2odn1q2odn.jpg"

};

// ========================================
// ข้อมูล D-STATION
// ========================================

const D_STATION_INFO = `

คุณคือ AI ผู้ช่วยของ D-STATION นครสวรรค์

หน้าที่ของคุณคือให้ข้อมูลเกี่ยวกับ D-STATION เท่านั้น

========================================
ข้อมูลสถานที่
========================================

D-STATION นครสวรรค์

ที่อยู่:
49/60-61 อำเภอเมืองนครสวรรค์
นครสวรรค์ 60000

วิธีเดินทาง:
เลยสวนขอบฟ้า มาเลี้ยวซ้าย
ร้านจะอยู่ตรงข้ามเจ๊หนุ่ยหมูตุ๋น

Google Maps:
https://share.google/BaSU1tBqAHnNmsLXT

เวลาเปิดบริการ:
08:00 - 23:00 น.

โทร:
095-490-6492

LINE OA:
@d-station.co

========================================
ห้องประชุม
========================================

1. Byte Meeting Room
รองรับ 4-6 คน
ราคา 500 บาท / 2 ชั่วโมง

2. Pixel Meeting Room
รองรับ 7-10 คน
ราคา 800 บาท / 2 ชั่วโมง

3. Nexus Meeting Room
รองรับ 12-30 คน
ราคา 1,000 บาท / 2 ชั่วโมง

รายละเอียด:
- ห้องประชุมเป็นห้องส่วนตัว
- มี Wi-Fi
- มีอุปกรณ์พร้อมใช้งาน
- มี Smart TV / จอแสดงผล
- มีที่จอดรถ
- ไม่มีโปรเจกเตอร์

โปรโมชั่น:
ค่าบริการเช่าห้องประชุม
สามารถนำมาใช้เป็นส่วนลดค่าอาหารและเครื่องดื่มได้เต็มจำนวน

========================================
Podcast Studio
========================================

ราคา:
500 บาท / 1 ชั่วโมง

โปรโมชั่น:
จอง 1 ชั่วโมง แถมฟรี 1 ชั่วโมง

มีอุปกรณ์พร้อมใช้งาน
เหมาะสำหรับ Podcast
สัมภาษณ์
และสร้างคอนเทนต์

========================================
Live Studio
========================================

ราคา:
500 บาท / 1 ชั่วโมง

โปรโมชั่น:
จอง 1 ชั่วโมง แถมฟรี 1 ชั่วโมง

มีอุปกรณ์
ไฟ
และฉากพร้อมใช้งาน

เหมาะสำหรับ:
- ไลฟ์ขายสินค้า
- รีวิวสินค้า
- สร้างคอนเทนต์

การไลฟ์สดไม่มีบริการตัดต่อ

========================================
Co-working Space
========================================

มีพื้นที่สำหรับนั่งทำงาน
มี Wi-Fi
มีปลั๊กไฟ
บรรยากาศสงบ
เหมาะกับการทำงานและอ่านหนังสือ
มีอาหารและเครื่องดื่มให้บริการ

ค่าใช้บริการ:

ซื้อครบ 99 บาท
ใช้พื้นที่ได้ 3 ชั่วโมง

ซื้อครบ 159 บาท
ใช้พื้นที่ได้ทั้งวัน

Monthly Pass:
999 บาท / เดือน
ใช้พื้นที่ได้ตลอดเดือน
ฟรีเครื่องดื่ม 15 แก้ว / เดือน

========================================
อาหาร
========================================

D-STATION มีอาหารให้บริการ
หากลูกค้าถามเมนูอาหาร
ให้แจ้งว่ามีเมนูอาหารและส่งรูปเมนูอาหารให้ลูกค้าก่อนข้อความ

========================================
เครื่องดื่ม
========================================

D-STATION มีเครื่องดื่มให้บริการ
หากลูกค้าถามเมนูเครื่องดื่ม
ให้ส่งรูปเมนูเครื่องดื่มก่อนข้อความ

========================================
กฎการตอบ
========================================

- ตอบภาษาไทย
- สุภาพ
- เป็นธรรมชาติ
- กระชับ
- ตอบเฉพาะข้อมูลของ D-STATION
- ห้ามแต่งราคา ข้อมูล หรือโปรโมชั่นขึ้นมาเอง
- หากไม่มีข้อมูล ให้บอกว่าไม่ทราบข้อมูลนี้ และแนะนำให้สอบถามพนักงาน D-STATION
- หากลูกค้าถามเรื่องที่ไม่เกี่ยวกับ D-STATION เช่น การบ้าน เกม ข่าวทั่วไป สูตรอาหาร หรือเรื่องอื่น ๆ ให้ตอบกลับอย่างสุภาพว่า:

"ขออภัยค่ะ เรื่องนี้ไม่มีข้อมูลอยู่ในระบบของ D-STATION ค่ะ หากต้องการสอบถามข้อมูลเกี่ยวกับ D-STATION สามารถถามได้เลยนะคะ 😊"

ห้ามเงียบและห้ามไม่ตอบลูกค้า

========================================
การจองห้องประชุม
========================================

เมื่อเริ่มต้นที่ลูกค้าต้องการจองห้องประชุม
ให้ใช้ข้อความนี้ EXACTLY:

เบื้องต้น รบกวนขออนุญาตขอข้อมูลเพื่อทำการจองห้องล่วงหน้าค่ะ
ชื่อผู้ติดต่อ :
ตำแหน่ง :
จากหน่วยงาน/บริษัท :
ที่อยู่ :
โทร :
อีเมล :
วันที่เข้าใช้บริการ :
เวลาที่เข้าใช้บริการ :
จำนวนผู้เข้าใช้บริการ :

ข้อมูลที่ต้องมีทั้งหมด:

1. ชื่อผู้ติดต่อ
2. ตำแหน่ง
3. จากหน่วยงาน/บริษัท
4. ที่อยู่
5. โทร
6. อีเมล
7. วันที่เข้าใช้บริการ
8. เวลาที่เข้าใช้บริการ
9. จำนวนผู้เข้าใช้บริการ

หากลูกค้าให้ข้อมูลมาแล้ว
ห้ามถามข้อมูลนั้นซ้ำ

หากข้อมูลยังไม่ครบ
ให้ถามเฉพาะข้อมูลที่ยังขาด

หากลูกค้าระบุจำนวนคน
ให้ช่วยเลือกห้องให้ตามนี้:

4-6 คน = Byte Meeting Room
7-10 คน = Pixel Meeting Room
12-30 คน = Nexus Meeting Room

หากจำนวนคนไม่อยู่ในช่วงที่กำหนด
ให้แจ้งพนักงาน D-STATION สามารถช่วยแนะนำเพิ่มเติมได้

========================================
เมื่อข้อมูลการจองครบ
========================================

ให้สรุปข้อมูลดังนี้:

ข้อมูลการจอง

ห้อง: [ชื่อห้อง]
จำนวนคน: [จำนวนคน]
วันที่: [วันที่]
เวลา: [เวลาเริ่ม] - [เวลาสิ้นสุด]
ชื่อ: [ชื่อผู้ติดต่อ]
เบอร์ติดต่อ: [เบอร์]

ข้อมูลครบแล้วค่ะ ขณะนี้เป็นคำขอจอง
รอพนักงาน D-STATION ตรวจสอบและยืนยันการจองนะคะ

สำคัญ:

ต้องมีคำว่า:
"ข้อมูลครบแล้วค่ะ"

ห้ามบอกว่าจองสำเร็จแล้ว
ห้ามบอกว่าห้องว่างแน่นอน

รูปแบบเวลาต้องเป็น:

เวลา: 10:00 - 12:00

ไม่ต้องใส่คำว่า "น." หลังเวลา

`;

// ========================================
// หน้าแรก
// ========================================

app.get("/", (req, res) => {
    res.send(
        "D-STATION LINE Webhook Server is running!"
    );
});

// ========================================
// ฟังก์ชันสร้าง Image Message
// ========================================

function createImageMessage(url) {
    return {
        type: "image",
        originalContentUrl: url,
        previewImageUrl: url
    };
}

// ========================================
// ส่งข้อความยืนยันการจองกลับ LINE
// ========================================

app.post("/send-confirmation", async (req, res) => {

    try {

        const bookingId =
            req.body?.bookingId;

        console.log(
            "ได้รับคำขอส่งข้อความยืนยัน:",
            bookingId
        );

        if (!bookingId) {

            return res.status(400).json({
                success: false,
                message: "ไม่มี bookingId"
            });

        }

        const bookingDoc =
            await db
                .collection("bookings")
                .doc(bookingId)
                .get();

        if (!bookingDoc.exists) {

            return res.status(404).json({
                success: false,
                message: "ไม่พบข้อมูลการจอง"
            });

        }

        const booking =
            bookingDoc.data();

        console.log(
            "ข้อมูลการจองที่จะส่ง LINE:",
            {
                room: booking.room,
                people: booking.people,
                date: booking.date,
                startTime: booking.startTime,
                endTime: booking.endTime,
                hasLineUserId: !!booking.lineUserId
            }
        );

        if (!booking.lineUserId) {

            return res.status(400).json({
                success: false,
                message: "ไม่พบ LINE User ID ของลูกค้า"
            });

        }

        const confirmationMessage =
`ยืนยันการจองห้องประชุมค่ะ 🎉

ห้อง: ${booking.room}

จำนวนคน: ${booking.people}

วันที่: ${booking.date}

เวลา: ${booking.startTime} - ${booking.endTime}

ชื่อผู้จอง: ${booking.customerName}

การจองได้รับการยืนยันเรียบร้อยแล้วค่ะ

ขอบคุณที่ใช้บริการ D-STATION นครสวรรค์ค่ะ 😊`;

        const lineResponse =
            await fetch(
                "https://api.line.me/v2/bot/message/push",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
                    },

                    body:
                        JSON.stringify({
                            to:
                                booking.lineUserId,

                            messages: [
                                {
                                    type: "text",
                                    text:
                                        confirmationMessage
                                }
                            ]
                        })
                }
            );

        if (!lineResponse.ok) {

            const lineError =
                await lineResponse.text();

            console.error(
                "LINE Push Error:",
                lineError
            );

            return res.status(500).json({
                success: false,
                message:
                    "ส่งข้อความ LINE ไม่สำเร็จ"
            });

        }

        console.log(
            "ส่งข้อความยืนยันกลับ LINE สำเร็จ"
        );

        res.json({
            success: true
        });

    } catch (error) {

        console.error(
            "Confirmation Error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "เกิดข้อผิดพลาด"
        });

    }

});

// ========================================
// LINE Webhook
// ========================================

app.post("/webhook", async (req, res) => {

    console.log(
        "LINE Webhook:",
        JSON.stringify(req.body, null, 2)
    );

    try {

        const event =
            req.body?.events?.[0];

        if (!event) {
            return res.sendStatus(200);
        }

        if (event.type !== "message") {
            return res.sendStatus(200);
        }

        const replyToken =
            event.replyToken;

        const userId =
            event.source?.userId ||
            "unknown-user";

        console.log(
            "LINE User ID:",
            userId
        );

        // ========================================
        // กรณี Sticker
        // ========================================

        if (event.message?.type === "sticker") {

            const stickerReply = {
                type: "text",
                text:
                    "ได้รับสติกเกอร์แล้วค่ะ 😊\nมีอะไรให้ D-STATION ช่วยสอบถามได้เลยนะคะ"
            };

            const stickerResponse =
                await fetch(
                    "https://api.line.me/v2/bot/message/reply",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",

                            "Authorization":
                                `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
                        },

                        body:
                            JSON.stringify({
                                replyToken:
                                    replyToken,

                                messages: [
                                    stickerReply
                                ]
                            })
                    }
                );

            if (!stickerResponse.ok) {

                console.error(
                    "LINE Sticker Reply Error:",
                    await stickerResponse.text()
                );

            }

            return res.sendStatus(200);
        }

        // ========================================
        // รับเฉพาะข้อความ Text
        // ========================================

        if (event.message?.type !== "text") {
            return res.sendStatus(200);
        }

        const userMessage =
            event.message.text;

        console.log(
            "ลูกค้า:",
            userMessage
        );

        // ========================================
        // สร้างประวัติ
        // ========================================

        if (!conversations.has(userId)) {

            conversations.set(
                userId,
                []
            );

        }

        const history =
            conversations.get(userId);

        history.push({
            role: "user",
            content:
                userMessage
        });

        if (history.length > 20) {

            history.splice(
                0,
                history.length - 20
            );

        }

        // ========================================
        // ส่งให้ AI
        // ========================================

        const response =
            await openai.responses.create({

                model:
                    "gpt-5.6-luna",

                instructions:
                    D_STATION_INFO,

                input:
                    history

            });

        const aiReply =
            response.output_text;

        console.log(
            "AI:",
            aiReply
        );

        history.push({
            role: "assistant",
            content:
                aiReply
        });

        // ========================================
        // ตรวจประเภทคำถามเพื่อส่งรูป
        // ========================================

        const isMeetingRoomQuestion =
            /ห้องประชุม|เช่าห้องประชุม|จองห้องประชุม|รายละเอียดห้องประชุม|ห้องประชุมมี|ห้องประชุมราคา|Byte|Pixel|Nexus/i
                .test(userMessage);

        const isPodcastQuestion =
            /พอดแคสต์|podcast|พอคแคสต์|ห้องอัด|ห้องพอดแคสต์/i
                .test(userMessage);

        const isLiveQuestion =
            /ห้องไลฟ์|ไลฟ์สด|live studio|live|ไลฟ์/i
                .test(userMessage);

        const isCoworkingQuestion =
            /co-working|co working|coworking|โคเวิร์กกิ้ง|co-work|พื้นที่ทำงาน|พื้นที่นั่งทำงาน|ค่าใช้จ่าย.*ทำงาน|ค่าบริการ.*ทำงาน/i
                .test(userMessage);

        const isFoodQuestion =
            /เมนูอาหาร|อาหาร|กินอะไร|มีอาหารอะไร|ราคาอาหาร/i
                .test(userMessage);

        const isDrinkQuestion =
            /เมนูเครื่องดื่ม|เครื่องดื่ม|กาแฟ|น้ำ|เครื่องดื่มมีอะไร|ราคาน้ำ/i
                .test(userMessage);

        // ========================================
        // ตรวจข้อมูลการจองครบ
        // ========================================

        const bookingComplete =
            aiReply.includes(
                "ข้อมูลครบแล้วค่ะ"
            ) &&
            aiReply.includes("ห้อง:") &&
            aiReply.includes("จำนวนคน:") &&
            aiReply.includes("วันที่:") &&
            aiReply.includes("เวลา:") &&
            aiReply.includes("ชื่อ:") &&
            aiReply.includes("เบอร์ติดต่อ:");

        console.log(
            "ข้อมูลการจองครบ:",
            bookingComplete
        );

        // ========================================
        // บันทึก Booking
        // ========================================

        if (bookingComplete) {

            const roomMatch =
                aiReply.match(
                    /ห้อง\s*:\s*([^\n\r]+)/
                );

            const peopleMatch =
                aiReply.match(
                    /จำนวนคน\s*:\s*([^\n\r]+)/
                );

            const dateMatch =
                aiReply.match(
                    /วันที่\s*:\s*([^\n\r]+)/
                );

            const timeMatch =
                aiReply.match(
                    /เวลา\s*:\s*(\d{1,2})\s*[:.]\s*(\d{2})\s*[-–—]\s*(\d{1,2})\s*[:.]\s*(\d{2})/
                );

            const nameMatch =
                aiReply.match(
                    /ชื่อ\s*:\s*([^\n\r]+)/
                );

            const phoneMatch =
                aiReply.match(
                    /เบอร์ติดต่อ\s*:\s*([^\n\r]+)/
                );

            const room =
                roomMatch
                    ? roomMatch[1].trim()
                    : "";

            const people =
                peopleMatch
                    ? peopleMatch[1].trim()
                    : "";

            const date =
                dateMatch
                    ? dateMatch[1].trim()
                    : "";

            let startTime = "";
            let endTime = "";

            if (timeMatch) {

                startTime =
                    `${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}`;

                endTime =
                    `${timeMatch[3].padStart(2, "0")}:${timeMatch[4]}`;

            }

            const customerName =
                nameMatch
                    ? nameMatch[1].trim()
                    : "";

            const phone =
                phoneMatch
                    ? phoneMatch[1].trim()
                    : "";

            // ========================================
            // ดึงข้อมูลจากแบบฟอร์มเพิ่มเติม
            // ========================================

            const positionMatch =
                aiReply.match(
                    /ตำแหน่ง\s*:\s*([^\n\r]+)/
                );

            const companyMatch =
                aiReply.match(
                    /จากหน่วยงาน\/บริษัท\s*:\s*([^\n\r]+)/
                );

            const addressMatch =
                aiReply.match(
                    /ที่อยู่\s*:\s*([^\n\r]+)/
                );

            const emailMatch =
                aiReply.match(
                    /อีเมล\s*:\s*([^\n\r]+)/
                );

            const position =
                positionMatch
                    ? positionMatch[1].trim()
                    : "";

            const company =
                companyMatch
                    ? companyMatch[1].trim()
                    : "";

            const address =
                addressMatch
                    ? addressMatch[1].trim()
                    : "";

            const email =
                emailMatch
                    ? emailMatch[1].trim()
                    : "";

            console.log(
                "ข้อมูลที่เตรียมบันทึก:",
                {
                    room,
                    people,
                    date,
                    startTime,
                    endTime,
                    customerName,
                    phone,
                    position,
                    company,
                    address,
                    email
                }
            );

            // ========================================
            // ป้องกันการบันทึกซ้ำ
            // ========================================

            const bookingKey =
                `${userId}|${room}|${date}|${startTime}|${endTime}|${phone}`;

            const alreadySaved =
                savedBookings.get(userId) ===
                bookingKey;

            // ========================================
            // บันทึก Firebase
            // ========================================

            if (
                room &&
                people &&
                date &&
                startTime &&
                endTime &&
                customerName &&
                phone &&
                !alreadySaved
            ) {

                const bookingRef =
                    await db
                        .collection("bookings")
                        .add({

                            customerName:
                                customerName,

                            phone:
                                phone,

                            position:
                                position,

                            company:
                                company,

                            address:
                                address,

                            email:
                                email,

                            service:
                                "ห้องประชุม",

                            room:
                                room,

                            date:
                                date,

                            startTime:
                                startTime,

                            endTime:
                                endTime,

                            people:
                                people,

                            status:
                                "pending",

                            lineUserId:
                                userId,

                            createdAt:
                                FieldValue.serverTimestamp()

                        });

                savedBookings.set(
                    userId,
                    bookingKey
                );

                console.log(
                    "บันทึกคำขอจองลง Firebase สำเร็จ:",
                    bookingRef.id
                );

            } else {

                console.log(
                    "ข้อมูลไม่ครบ หรือบันทึกไปแล้ว"
                );

            }

        }

        // ========================================
        // เตรียมข้อความ LINE
        // รูปต้องมาก่อนข้อความ
        // ========================================

        const messages = [];

        // ห้องประชุม
        if (isMeetingRoomQuestion) {

            messages.push(
                createImageMessage(
                    IMAGES.meeting
                )
            );

        }

        // Podcast
        else if (isPodcastQuestion) {

            messages.push(
                createImageMessage(
                    IMAGES.podcast
                )
            );

        }

        // Live
        else if (isLiveQuestion) {

            messages.push(
                createImageMessage(
                    IMAGES.live
                )
            );

        }

        // Co-working
        else if (isCoworkingQuestion) {

            messages.push(
                createImageMessage(
                    IMAGES.coworking
                )
            );

        }

        // อาหาร
        else if (isFoodQuestion) {

            messages.push(
                createImageMessage(
                    IMAGES.food
                )
            );

        }

        // เครื่องดื่ม
        else if (isDrinkQuestion) {

            messages.push(
                createImageMessage(
                    IMAGES.drinks
                )
            );

        }

        // ========================================
        // ข้อความ AI
        // ========================================

        messages.push({
            type: "text",
            text:
                aiReply
        });

        // ========================================
        // ส่งกลับ LINE
        // ========================================

        const lineResponse =
            await fetch(
                "https://api.line.me/v2/bot/message/reply",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
                    },

                    body:
                        JSON.stringify({

                            replyToken:
                                replyToken,

                            messages:
                                messages

                        })
                }
            );

        if (!lineResponse.ok) {

            const lineError =
                await lineResponse.text();

            console.error(
                "LINE API Error:",
                lineError
            );

        }

        console.log(
            "ส่งคำตอบกลับ LINE สำเร็จ"
        );

        res.sendStatus(200);

    } catch (error) {

        console.error(
            "Error:",
            error
        );

        res.sendStatus(500);

    }

});

// ========================================
// Start Server
// ========================================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `Server running on port ${PORT}`
        );

    }
);