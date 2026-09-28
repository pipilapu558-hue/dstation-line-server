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
    res.header("Access-Control-Allow-Origin", "*");
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
// จำว่าลูกค้ากำลังจองบริการอะไร
// ========================================

const bookingModes = new Map();


// ========================================
// ป้องกันการบันทึกซ้ำ
// ========================================

const savedBookings = new Map();


// ========================================
// รูปต้นฉบับจาก ImgBB
// ========================================

const IMAGE_SOURCES = {
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
// URL รูปผ่าน Render
// ========================================

const IMAGES = {
    coworking:
        "https://dstation-line-server.onrender.com/images/coworking",

    food:
        "https://dstation-line-server.onrender.com/images/food",

    drinks:
        "https://dstation-line-server.onrender.com/images/drinks",

    live:
        "https://dstation-line-server.onrender.com/images/live",

    meeting:
        "https://dstation-line-server.onrender.com/images/meeting",

    podcast:
        "https://dstation-line-server.onrender.com/images/podcast"
};


// ========================================
// สร้าง Preview URL
// ========================================

function createPreviewUrl(imageName) {
    return IMAGES[imageName];
}


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

ชื่อบริการ:
Podcast Studio

ราคา:
500 บาท / 1 ชั่วโมง

โปรโมชั่น:
จอง 1 ชั่วโมง แถมฟรี 1 ชั่วโมง

มีอุปกรณ์พร้อมใช้งาน

เหมาะสำหรับ:
- Podcast
- สัมภาษณ์
- สร้างคอนเทนต์

========================================
Live Studio
========================================

ชื่อบริการ:
Live Studio

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

หากลูกค้าถามเมนูอาหาร:
- ให้แจ้งว่ามีเมนูอาหาร
- ให้ส่งรูปเมนูอาหาร
- ให้ลูกค้าดูรายละเอียดเมนูและราคาได้จากรูป

ห้ามตอบว่าไม่มีข้อมูลเกี่ยวกับอาหาร

========================================
เครื่องดื่ม
========================================

D-STATION มีเครื่องดื่มให้บริการ

หากลูกค้าถามเมนูเครื่องดื่ม:
- ให้แจ้งว่ามีเมนูเครื่องดื่ม
- ให้ส่งรูปเมนูเครื่องดื่ม
- ให้ลูกค้าดูรายละเอียดเมนูและราคาได้จากรูป

ห้ามตอบว่าไม่มีข้อมูลเกี่ยวกับเครื่องดื่ม

========================================
กฎการตอบ
========================================

- ตอบภาษาไทย
- สุภาพ
- เป็นธรรมชาติ
- กระชับ
- ตอบเฉพาะข้อมูลของ D-STATION
- ห้ามแต่งราคา ข้อมูล หรือโปรโมชั่นขึ้นมาเอง

หากไม่มีข้อมูล:
ให้บอกว่าไม่ทราบข้อมูลนี้
และแนะนำให้สอบถามพนักงาน D-STATION

หากลูกค้าถามเรื่องที่ไม่เกี่ยวกับ D-STATION:

"ขออภัยค่ะ เรื่องนี้ไม่มีข้อมูลอยู่ในระบบของ D-STATION ค่ะ หากต้องการสอบถามข้อมูลเกี่ยวกับ D-STATION สามารถถามได้เลยนะคะ 😊"

========================================
สำคัญเกี่ยวกับการจอง
========================================

หากลูกค้าพูดว่าต้องการ:
- จอง
- ขอจอง
- ต้องการจองห้อง
- จองห้องประชุม
- จองห้อง Live
- จองห้องไลฟ์
- จอง Podcast
- จองห้อง Podcast
- จองห้องพอดแคสต์

ให้ถือว่าลูกค้าต้องการจองบริการ

ห้ามตอบเฉพาะโปรโมชั่น
ห้ามตอบเฉพาะราคา

ต้องเข้าสู่ขั้นตอนเก็บข้อมูลการจองทันที

========================================
การจองห้อง
========================================

สามารถจองบริการเหล่านี้ได้:

1. Byte Meeting Room
2. Pixel Meeting Room
3. Nexus Meeting Room
4. Podcast Studio
5. Live Studio

เมื่อเริ่มต้นการจอง
ให้ใช้ข้อความนี้:

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

ข้อมูลที่ต้องมี:
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

Podcast Studio:
ใช้ห้อง Podcast Studio

Live Studio:
ใช้ห้อง Live Studio

ห้องประชุม:
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
ต้องมีคำว่า "ข้อมูลครบแล้วค่ะ"

ห้ามบอกว่าจองสำเร็จแล้ว
ห้ามบอกว่าห้องว่างแน่นอน

รูปแบบเวลา:
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
// IMAGE PROXY
// ========================================

app.get("/images/:name", async (req, res) => {
    try {
        const name = req.params.name;
        const imageUrl = IMAGE_SOURCES[name];

        console.log(
            "========================================"
        );

        console.log(
            "Image Proxy Request:",
            name
        );

        console.log(
            "Image Source:",
            imageUrl
        );

        if (!imageUrl) {
            return res.status(404).send(
                "ไม่พบรูปภาพ"
            );
        }

        const response = await fetch(
            imageUrl
        );

        console.log(
            "ImgBB Status:",
            response.status
        );

        console.log(
            "Content-Type:",
            response.headers.get(
                "content-type"
            )
        );

        if (!response.ok) {
            return res.status(500).send(
                "ไม่สามารถดึงรูปภาพได้"
            );
        }

        const contentType =
            response.headers.get(
                "content-type"
            ) || "image/jpeg";

        const buffer =
            Buffer.from(
                await response.arrayBuffer()
            );

        console.log(
            "Image Size:",
            buffer.length,
            "bytes"
        );

        res.setHeader(
            "Content-Type",
            contentType
        );

        res.setHeader(
            "Content-Length",
            buffer.length
        );

        res.setHeader(
            "Cache-Control",
            "public, max-age=3600"
        );

        res.send(buffer);

    } catch (error) {
        console.error(
            "Image Proxy Error:",
            error
        );

        res.status(500).send(
            "เกิดข้อผิดพลาดในการส่งรูป"
        );
    }
});


// ========================================
// สร้าง Image Message
// ========================================

function createImageMessage(
    imageName
) {
    const originalUrl =
        IMAGES[imageName];

    const previewUrl =
        createPreviewUrl(imageName);

    console.log(
        "Create Image Message:",
        imageName
    );

    console.log(
        "Original:",
        originalUrl
    );

    console.log(
        "Preview:",
        previewUrl
    );

    return {
        type: "image",
        originalContentUrl:
            originalUrl,
        previewImageUrl:
            previewUrl
    };
}


// ========================================
// ส่งข้อความ LINE
// ========================================

async function replyToLine(
    replyToken,
    messages
) {
    console.log(
        "จำนวนข้อความที่จะส่ง:",
        messages.length
    );

    const response =
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

    if (!response.ok) {
        const errorText =
            await response.text();

        console.error(
            "========================================"
        );

        console.error(
            "LINE API ERROR"
        );

        console.error(
            "Status:",
            response.status
        );

        console.error(
            "Error:",
            errorText
        );

        console.error(
            "========================================"
        );

        return false;
    }

    console.log(
        "ส่งข้อความ LINE สำเร็จ"
    );

    return true;
}


// ========================================
// ส่งข้อความยืนยันการจอง
// ========================================

app.post(
    "/send-confirmation",
    async (req, res) => {

        try {

            const bookingId =
                req.body?.bookingId;

            console.log(
                "Booking ID:",
                bookingId
            );

            if (!bookingId) {
                return res.status(400).json({
                    success: false,
                    message:
                        "ไม่มี bookingId"
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
                    message:
                        "ไม่พบข้อมูลการจอง"
                });
            }

            const booking =
                bookingDoc.data();

            if (!booking.lineUserId) {
                return res.status(400).json({
                    success: false,
                    message:
                        "ไม่พบ LINE User ID ของลูกค้า"
                });
            }

            const confirmationMessage =
`ยืนยันการจองค่ะ 🎉

บริการ: ${booking.service || booking.room}

ห้อง: ${booking.room}

จำนวนคน: ${booking.people}

วันที่: ${booking.date}

เวลา: ${booking.startTime} - ${booking.endTime}

ชื่อผู้จอง: ${booking.customerName}

การจองได้รับการยืนยันเรียบร้อยแล้วค่ะ

ขอบคุณที่ใช้บริการ D-STATION นครสวรรค์ค่ะ 😊`;

            const response =
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
                                        type:
                                            "text",

                                        text:
                                            confirmationMessage
                                    }
                                ]
                            })
                    }
                );

            if (!response.ok) {

                const errorText =
                    await response.text();

                console.error(
                    "LINE Push Error:",
                    errorText
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "ส่งข้อความ LINE ไม่สำเร็จ"
                });
            }

            console.log(
                "ส่งข้อความยืนยันสำเร็จ"
            );

            return res.json({
                success: true
            });

        } catch (error) {

            console.error(
                "Confirmation Error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "เกิดข้อผิดพลาด"
            });
        }
    }
);


// ========================================
// LINE WEBHOOK
// ========================================

app.post(
    "/webhook",
    async (req, res) => {

        console.log(
            "========================================"
        );

        console.log(
            "LINE WEBHOOK"
        );

        console.log(
            JSON.stringify(
                req.body,
                null,
                2
            )
        );

        try {

            const event =
                req.body?.events?.[0];

            if (!event) {
                return res.sendStatus(200);
            }

            if (
                event.type !==
                "message"
            ) {
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
            // STICKER
            // ========================================

            if (
                event.message?.type ===
                "sticker"
            ) {

                await replyToLine(
                    replyToken,
                    [
                        {
                            type: "text",
                            text:
                                "ได้รับสติกเกอร์แล้วค่ะ 😊\nมีอะไรให้ D-STATION ช่วยสอบถามได้เลยนะคะ"
                        }
                    ]
                );

                return res.sendStatus(200);
            }


            // ========================================
            // รับเฉพาะ TEXT
            // ========================================

            if (
                event.message?.type !==
                "text"
            ) {
                return res.sendStatus(200);
            }

            const userMessage =
                event.message.text;

            console.log(
                "ลูกค้า:",
                userMessage
            );


            // ========================================
            // ตรวจประเภทคำถาม
            // ========================================

            const isBookingRequest =
                /จอง|ขอจอง|ต้องการจอง|จองห้อง|ทำการจอง|booking/i
                    .test(userMessage);

            const isPodcastQuestion =
    /พอดแคสต์|podcast|พอคแคสต์|พอตแคสต์|พอตแคส|พอดแคด|ห้องอัด/i
        .test(userMessage);

            const isLiveQuestion =
                /ห้องไลฟ์|ไลฟ์สด|live studio|live|ไลฟ์/i
                    .test(userMessage);

            const isMeetingRoomQuestion =
                /ห้องประชุม|เช่าห้องประชุม|จองห้องประชุม|รายละเอียดห้องประชุม|ห้องประชุมมี|ห้องประชุมราคา|Byte|Pixel|Nexus/i
                    .test(userMessage);

            const isCoworkingQuestion =
                /co-working|co working|coworking|โคเวิร์กกิ้ง|co-work|พื้นที่ทำงาน|พื้นที่นั่งทำงาน|ค่าใช้จ่าย.*ทำงาน|ค่าบริการ.*ทำงาน/i
                    .test(userMessage);

            const isFoodQuestion =
                /เมนูอาหาร|อาหาร|กินอะไร|มีอาหารอะไร|ราคาอาหาร|เมนู.*กิน|รายการอาหาร/i
                    .test(userMessage);

            const isDrinkQuestion =
                /เมนูเครื่องดื่ม|เครื่องดื่ม|กาแฟ|น้ำ|เครื่องดื่มมีอะไร|ราคาน้ำ|เมนู.*น้ำ|รายการเครื่องดื่ม/i
                    .test(userMessage);

            const isGeneralMenuQuestion =
                /ขอดูเมนู|ขอเมนู|ดูเมนู|เมนูมีอะไร|เมนูทั้งหมด/i
                    .test(userMessage);

            const isFoodAndDrinkQuestion =
                isFoodQuestion &&
                isDrinkQuestion;


            // ========================================
            // ประวัติการคุย
            // ========================================

            if (
                !conversations.has(userId)
            ) {
                conversations.set(
                    userId,
                    []
                );
            }

            const history =
                conversations.get(
                    userId
                );

            history.push({
                role: "user",
                content:
                    userMessage
            });

            if (
                history.length > 20
            ) {
                history.splice(
                    0,
                    history.length - 20
                );
            }


            // ========================================
            // ตรวจ Booking Mode
            // ========================================

            let currentBookingMode =
                bookingModes.get(
                    userId
                ) || "";


            // ========================================
            // คำขอจองใหม่
            // ========================================

            if (isBookingRequest) {

                if (
                    isPodcastQuestion
                ) {

                    currentBookingMode =
                        "Podcast Studio";

                } else if (
                    isLiveQuestion
                ) {

                    currentBookingMode =
                        "Live Studio";

                } else if (
                    isMeetingRoomQuestion
                ) {

                    currentBookingMode =
                        "ห้องประชุม";

                } else {

                    currentBookingMode =
                        "บริการของ D-STATION";
                }

                bookingModes.set(
                    userId,
                    currentBookingMode
                );
            }


            // ========================================
            // MENU
            //
            // เมนูไม่เรียก AI
            // ========================================

            if (
                !isBookingRequest &&
                (
                    isGeneralMenuQuestion ||
                    isFoodAndDrinkQuestion ||
                    isFoodQuestion ||
                    isDrinkQuestion
                )
            ) {

                const menuMessages = [];

                if (
                    isGeneralMenuQuestion ||
                    isFoodAndDrinkQuestion
                ) {

                    menuMessages.push(
                        createImageMessage(
                            "food"
                        )
                    );

                    menuMessages.push(
                        createImageMessage(
                            "drinks"
                        )
                    );

                    menuMessages.push({
                        type: "text",
                        text:
                            "ได้เลยค่ะ 😊 สามารถดูเมนูอาหารและเครื่องดื่มจากรูปด้านบนได้เลยนะคะ"
                    });

                } else if (
                    isFoodQuestion
                ) {

                    menuMessages.push(
                        createImageMessage(
                            "food"
                        )
                    );

                    menuMessages.push({
                        type: "text",
                        text:
                            "ได้เลยค่ะ 😊 เมนูอาหารและราคาดูได้จากรูปด้านบนเลยนะคะ"
                    });

                } else if (
                    isDrinkQuestion
                ) {

                    menuMessages.push(
                        createImageMessage(
                            "drinks"
                        )
                    );

                    menuMessages.push({
                        type: "text",
                        text:
                            "ได้เลยค่ะ 😊 เมนูเครื่องดื่มและราคาดูได้จากรูปด้านบนเลยนะคะ"
                    });
                }

                await replyToLine(
                    replyToken,
                    menuMessages
                );

                return res.sendStatus(200);
            }


            // ========================================
            // PODCAST
            // ถ้าไม่ใช่การจอง
            // ========================================

            if (
                !isBookingRequest &&
                isPodcastQuestion
            ) {

                const messages = [
                    createImageMessage(
                        "podcast"
                    ),
                    {
                        type: "text",
                        text:
                            "Podcast Studio ราคา 500 บาท / 1 ชั่วโมงค่ะ 🎙️\n\nจอง 1 ชั่วโมง แถมฟรี 1 ชั่วโมง พร้อมอุปกรณ์สำหรับ Podcast สัมภาษณ์ และสร้างคอนเทนต์ค่ะ 😊"
                    }
                ];

                await replyToLine(
                    replyToken,
                    messages
                );

                return res.sendStatus(200);
            }


            // ========================================
            // LIVE
            // ========================================

            if (
                !isBookingRequest &&
                isLiveQuestion
            ) {

                const messages = [
                    createImageMessage(
                        "live"
                    ),
                    {
                        type: "text",
                        text:
                            "Live Studio ราคา 500 บาท / 1 ชั่วโมงค่ะ 🎥\n\nจอง 1 ชั่วโมง แถมฟรี 1 ชั่วโมง พร้อมไฟ ฉาก และอุปกรณ์สำหรับไลฟ์ค่ะ 😊"
                    }
                ];

                await replyToLine(
                    replyToken,
                    messages
                );

                return res.sendStatus(200);
            }


            // ========================================
            // ห้องประชุม
            // ========================================

            if (
                !isBookingRequest &&
                isMeetingRoomQuestion
            ) {

                const messages = [
                    createImageMessage(
                        "meeting"
                    ),
                    {
                        type: "text",
                        text:
                            "D-STATION มีห้องประชุม 3 ขนาดค่ะ 😊\n\nByte 4-6 คน 500 บาท / 2 ชั่วโมง\nPixel 7-10 คน 800 บาท / 2 ชั่วโมง\nNexus 12-30 คน 1,000 บาท / 2 ชั่วโมง\n\nค่าบริการเช่าห้องสามารถนำมาใช้เป็นส่วนลดค่าอาหารและเครื่องดื่มได้เต็มจำนวนค่ะ"
                    }
                ];

                await replyToLine(
                    replyToken,
                    messages
                );

                return res.sendStatus(200);
            }


            // ========================================
            // CO-WORKING
            // ========================================

            if (
                !isBookingRequest &&
                isCoworkingQuestion
            ) {

                const messages = [
                    createImageMessage(
                        "coworking"
                    ),
                    {
                        type: "text",
                        text:
                            "D-STATION มี Co-working Space สำหรับนั่งทำงานและอ่านหนังสือค่ะ 😊\n\nมี Wi-Fi และปลั๊กไฟ พร้อมบรรยากาศสงบ เหมาะกับการทำงานค่ะ"
                    }
                ];

                await replyToLine(
                    replyToken,
                    messages
                );

                return res.sendStatus(200);
            }


            // ========================================
            // AI INSTRUCTION
            // ========================================

            let currentInstruction = "";


            if (isBookingRequest) {

                if (
                    currentBookingMode ===
                    "Podcast Studio"
                ) {

                    currentInstruction = `

ลูกค้าต้องการจอง Podcast Studio

นี่คือคำขอจอง

ห้ามตอบเฉพาะโปรโมชั่น
ห้ามตอบเฉพาะราคา

ต้องเข้าสู่ขั้นตอนเก็บข้อมูลการจองทันที

กำหนดห้องเป็น:
Podcast Studio

`;

                } else if (
                    currentBookingMode ===
                    "Live Studio"
                ) {

                    currentInstruction = `

ลูกค้าต้องการจอง Live Studio

นี่คือคำขอจอง

ห้ามตอบเฉพาะโปรโมชั่น
ห้ามตอบเฉพาะราคา

ต้องเข้าสู่ขั้นตอนเก็บข้อมูลการจองทันที

กำหนดห้องเป็น:
Live Studio

`;

                } else if (
                    currentBookingMode ===
                    "ห้องประชุม"
                ) {

                    currentInstruction = `

ลูกค้าต้องการจองห้องประชุม

ต้องเข้าสู่ขั้นตอนเก็บข้อมูลการจองทันที

เมื่อทราบจำนวนคนแล้วให้เลือก:

4-6 คน = Byte Meeting Room
7-10 คน = Pixel Meeting Room
12-30 คน = Nexus Meeting Room

`;

                } else {

                    currentInstruction = `

ลูกค้าต้องการจองบริการของ D-STATION

ให้เข้าสู่ขั้นตอนเก็บข้อมูลการจองทันที

`;
                }

            } else if (
                currentBookingMode
            ) {

                currentInstruction = `

ลูกค้ากำลังอยู่ในขั้นตอนการจอง ${currentBookingMode}

ให้ดำเนินการเก็บข้อมูลการจองต่อจากข้อมูลเดิม

ห้ามถามข้อมูลที่ลูกค้าให้มาแล้ว

ถามเฉพาะข้อมูลที่ยังขาด

หากข้อมูลครบแล้ว
ให้สรุปข้อมูลการจองตามรูปแบบที่กำหนด

`;
            }

// ========================================
// Podcast - ส่งรูปทันที
// ========================================

if (
    isPodcastQuestion &&
    !/จอง|ขอจอง|ต้องการจอง|จองห้อง|booking/i.test(userMessage)
) {
    await replyToLine(
        replyToken,
        [
            createImageMessage("podcast"),
            {
                type: "text",
                text:
                    "สนใจห้อง Podcast Studio สามารถดูรายละเอียดจากรูปด้านบนได้เลยค่ะ 🎙️\n\nราคา 500 บาท / 1 ชั่วโมง\nจอง 1 ชั่วโมง แถมฟรี 1 ชั่วโมง\nพร้อมอุปกรณ์สำหรับ Podcast และการสร้างคอนเทนต์ค่ะ 😊"
            }
        ]
    );

    return res.sendStatus(200);
}


            // ========================================
            // เรียก OpenAI
            // ========================================

            const response =
                await openai.responses.create({
                    model:
                        "gpt-5.6-luna",

                    instructions:
                        D_STATION_INFO +
                        "\n\n" +
                        currentInstruction,

                    input:
                        history
                });

            const aiReply =
                response.output_text ||
                "ขออภัยค่ะ ขณะนี้ไม่สามารถตอบข้อความได้ค่ะ";

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
            // ตรวจข้อมูลจองครบ
            // ========================================

            const bookingComplete =
                aiReply.includes(
                    "ข้อมูลครบแล้วค่ะ"
                ) &&
                aiReply.includes(
                    "ห้อง:"
                ) &&
                aiReply.includes(
                    "จำนวนคน:"
                ) &&
                aiReply.includes(
                    "วันที่:"
                ) &&
                aiReply.includes(
                    "เวลา:"
                ) &&
                aiReply.includes(
                    "ชื่อ:"
                ) &&
                aiReply.includes(
                    "เบอร์ติดต่อ:"
                );

            console.log(
                "ข้อมูลการจองครบ:",
                bookingComplete
            );


            // ========================================
            // ฟังก์ชันดึงข้อมูล
            // ========================================

            function getField(
                text,
                fieldName
            ) {

                const regex =
                    new RegExp(
                        `${fieldName}\\s*:\\s*([^\\n\\r]+)`,
                        "i"
                    );

                const match =
                    text.match(regex);

                return match
                    ? match[1].trim()
                    : "";
            }


            // ========================================
            // บันทึก Booking
            // ========================================

            if (bookingComplete) {

                const room =
                    getField(
                        aiReply,
                        "ห้อง"
                    );

                const people =
                    getField(
                        aiReply,
                        "จำนวนคน"
                    );

                const date =
                    getField(
                        aiReply,
                        "วันที่"
                    );

                const customerName =
                    getField(
                        aiReply,
                        "ชื่อ"
                    );

                const phone =
                    getField(
                        aiReply,
                        "เบอร์ติดต่อ"
                    );

                const position =
                    getField(
                        aiReply,
                        "ตำแหน่ง"
                    );

                const company =
                    getField(
                        aiReply,
                        "จากหน่วยงาน/บริษัท"
                    );

                const address =
                    getField(
                        aiReply,
                        "ที่อยู่"
                    );

                const email =
                    getField(
                        aiReply,
                        "อีเมล"
                    );


                // ========================================
                // เวลา
                // ========================================

                const timeMatch =
                    aiReply.match(
                        /เวลา\s*:\s*(\d{1,2})\s*[:.]\s*(\d{2})\s*(?:น\.)?\s*[-–—]\s*(\d{1,2})\s*[:.]\s*(\d{2})\s*(?:น\.)?/i
                    );

                let startTime = "";
                let endTime = "";

                if (timeMatch) {

                    startTime =
                        `${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}`;

                    endTime =
                        `${timeMatch[3].padStart(2, "0")}:${timeMatch[4]}`;
                }


                // ========================================
                // Service
                // ========================================

                let service =
                    "ห้องประชุม";

                if (
                    /Podcast Studio/i.test(
                        room
                    ) ||
                    /พอดแคสต์/i.test(
                        room
                    )
                ) {

                    service =
                        "Podcast Studio";

                } else if (
                    /Live Studio/i.test(
                        room
                    ) ||
                    /ไลฟ์/i.test(
                        room
                    )
                ) {

                    service =
                        "Live Studio";
                }


                // ========================================
                // ใช้ Booking Mode ช่วย
                // ========================================

                if (
                    currentBookingMode ===
                    "Podcast Studio"
                ) {

                    service =
                        "Podcast Studio";

                } else if (
                    currentBookingMode ===
                    "Live Studio"
                ) {

                    service =
                        "Live Studio";
                }


                console.log(
                    "ข้อมูลที่จะบันทึก:",
                    {
                        room,
                        service,
                        people,
                        date,
                        startTime,
                        endTime,
                        customerName,
                        phone
                    }
                );


                // ========================================
                // Booking Key
                // ========================================

                const bookingKey =
                    `${userId}|${service}|${room}|${date}|${startTime}|${endTime}|${phone}`;

                const alreadySaved =
                    savedBookings.get(
                        userId
                    ) === bookingKey;


                // ========================================
                // บันทึก Firestore
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
                            .collection(
                                "bookings"
                            )
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
                                    service,

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
                        "บันทึกคำขอจองสำเร็จ:",
                        bookingRef.id
                    );

                    bookingModes.delete(
                        userId
                    );
                }
            }


            // ========================================
            // เตรียมข้อความตอบ LINE
            // ========================================

            const messages = [];


            // ========================================
            // Podcast
            // ========================================

            if (
                isPodcastQuestion
            ) {

                messages.push(
                    createImageMessage(
                        "podcast"
                    )
                );

            } else if (
                isLiveQuestion
            ) {

                messages.push(
                    createImageMessage(
                        "live"
                    )

                );

            } else if (
                isMeetingRoomQuestion
            ) {

                messages.push(
                    createImageMessage(
                        "meeting"
                    )

                );

            } else if (
                isCoworkingQuestion
            ) {

                messages.push(
                    createImageMessage(
                        "coworking"
                    )
                );
            }


            // ========================================
            // AI Text
            // ========================================

            messages.push({
                type: "text",
                text:
                    aiReply
            });


            // ========================================
            // ส่ง LINE
            // ========================================

            await replyToLine(
                replyToken,
                messages
            );

            return res.sendStatus(200);

        } catch (error) {

            console.error(
                "========================================"
            );

            console.error(
                "WEBHOOK ERROR"
            );

            console.error(
                error
            );

            console.error(
                "========================================"
            );

            return res.sendStatus(500);
        }
    }
);


// ========================================
// START SERVER
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