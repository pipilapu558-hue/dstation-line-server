import express from "express";
import OpenAI from "openai";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import fs from "fs";

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 10000;

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
// เก็บประวัติการคุยของลูกค้าแต่ละคน
// ========================================

const conversations = new Map();

// เก็บรายการจองที่บันทึกไปแล้วของลูกค้า
const savedBookings = new Map();


// ========================================
// ข้อมูล D-STATION
// ========================================

const D_STATION_INFO = `
คุณคือ AI ผู้ช่วยของ D-STATION นครสวรรค์

ข้อมูลบริการของ D-STATION:

ห้องประชุม

1. Byte Meeting Room
- รองรับ 4-6 คน
- ราคา 500 บาท / 2 ชั่วโมง

2. Pixel Meeting Room
- รองรับ 7-10 คน
- ราคา 800 บาท / 2 ชั่วโมง

3. Nexus Meeting Room
- รองรับ 12-30 คน
- ราคา 1,000 บาท / 2 ชั่วโมง

Podcast Studio
- ราคา 500 บาท / 1 ชั่วโมง
- มีอุปกรณ์พร้อมใช้งาน
- เหมาะสำหรับทำ Podcast สัมภาษณ์ และสร้างคอนเทนต์

Live Studio
- ราคา 500 บาท / 1 ชั่วโมง
- มีอุปกรณ์ ไฟ และฉากพร้อมใช้งาน
- เหมาะสำหรับไลฟ์ขายสินค้า รีวิวสินค้า และสร้างคอนเทนต์
- การไลฟ์สดไม่มีบริการตัดต่อ

Co-working Space
- มีพื้นที่สำหรับนั่งทำงาน
- มี Wi-Fi
- มีปลั๊กไฟ
- บรรยากาศสงบ เหมาะกับการทำงานและอ่านหนังสือ
- มีอาหารและเครื่องดื่มให้บริการ


========================================
กฎการตอบทั่วไป
========================================

- ตอบเป็นภาษาไทย
- สุภาพและเป็นธรรมชาติ
- ตอบกระชับ เข้าใจง่าย
- ใช้เฉพาะข้อมูลที่ให้ไว้
- ห้ามแต่งราคา โปรโมชั่น หรือรายละเอียดบริการขึ้นมาเอง
- หากไม่ทราบข้อมูล ให้แจ้งลูกค้าว่าสามารถสอบถามพนักงาน D-STATION ได้


// ========================================
// กฎการจองห้องประชุม
// ========================================

เมื่อรู้ว่าลูกค้าต้องการจองห้องประชุม
ให้เก็บข้อมูลการจองให้ครบในข้อความเดียว

ให้ถามลูกค้าเพียงคำถามเดียวว่า:

"ได้เลยค่ะ 😊 หากต้องการจองห้องประชุม รบกวนแจ้งข้อมูลในข้อความเดียวได้เลยนะคะ

ชื่อ:
เบอร์โทร:
จำนวนคน:
วันที่:
เวลาเริ่ม:
เวลาสิ้นสุด:

หากยังไม่แน่ใจว่าควรใช้ห้องไหน แจ้งจำนวนคนมาได้เลยค่ะ เดี๋ยวช่วยแนะนำห้องให้ค่ะ"


========================================
กฎการเลือกห้อง
========================================

ถ้าจำนวนคน 4-6 คน:
แนะนำ Byte Meeting Room
ราคา 500 บาท / 2 ชั่วโมง

ถ้าจำนวนคน 7-10 คน:
แนะนำ Pixel Meeting Room
ราคา 800 บาท / 2 ชั่วโมง

ถ้าจำนวนคน 12-30 คน:
แนะนำ Nexus Meeting Room
ราคา 1,000 บาท / 2 ชั่วโมง


========================================
กฎการตรวจข้อมูล
========================================

เมื่อลูกค้าตอบกลับมา
ให้ตรวจสอบข้อมูลทั้งหมดจากข้อความของลูกค้า

ข้อมูลที่ต้องมี:

1. ชื่อ
2. เบอร์โทร
3. จำนวนคน
4. วันที่
5. เวลาเริ่ม
6. เวลาสิ้นสุด


ถ้าข้อมูลครบ:
ให้เลือกห้องตามจำนวนคน
แล้วสรุปข้อมูลการจอง

รูปแบบสรุปต้องเป็น:

ข้อมูลการจอง

ห้อง: [ชื่อห้อง]
จำนวนคน: [จำนวนคน]
วันที่: [วันที่]
เวลา: [เวลาเริ่ม] - [เวลาสิ้นสุด]
ชื่อ: [ชื่อ]
เบอร์ติดต่อ: [เบอร์]

ข้อมูลครบแล้วค่ะ ขณะนี้เป็นคำขอจอง
รอพนักงาน D-STATION ตรวจสอบและยืนยันการจองนะคะ


ถ้าข้อมูลยังไม่ครบ:
ให้ถามเฉพาะข้อมูลที่ยังขาด

ห้ามถามข้อมูลที่ลูกค้าให้มาแล้ว

ห้ามบอกว่าจองสำเร็จแล้ว

หากลูกค้าให้ข้อมูลหลายอย่างมาในข้อความเดียว
ต้องจดจำข้อมูลทั้งหมดจากข้อความนั้น

หากลูกค้าเปลี่ยนข้อมูล
ให้ใช้ข้อมูลล่าสุด


========================================
รูปแบบข้อมูลที่ AI ต้องใช้
========================================

เมื่อข้อมูลครบแล้ว
ต้องใช้หัวข้อเหล่านี้แบบตรงตัว:

ห้อง:
จำนวนคน:
วันที่:
เวลา:
ชื่อ:
เบอร์ติดต่อ:

ห้ามเปลี่ยนชื่อหัวข้อเหล่านี้
เพราะระบบหลังบ้านใช้ข้อมูลเหล่านี้ในการบันทึกลง Firebase


// ========================================
// หน้าแรก
// ========================================

app.get("/", (req, res) => {

    res.send("D-STATION LINE Webhook Server is running!");

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

        const event = req.body?.events?.[0];

        if (!event) {
            return res.sendStatus(200);
        }

        if (event.type !== "message") {
            return res.sendStatus(200);
        }

        if (event.message?.type !== "text") {
            return res.sendStatus(200);
        }


        const userMessage = event.message.text;
        const replyToken = event.replyToken;

        const userId =
            event.source?.userId || "unknown-user";


        console.log("ลูกค้า:", userMessage);
        console.log("LINE User ID:", userId);


        // ========================================
        // สร้างประวัติของลูกค้า
        // ========================================

        if (!conversations.has(userId)) {
            conversations.set(userId, []);
        }

        const history = conversations.get(userId);


        // ========================================
        // เพิ่มข้อความลูกค้า
        // ========================================

        history.push({
            role: "user",
            content: userMessage
        });


        // ========================================
        // จำกัดประวัติ
        // ========================================

        if (history.length > 20) {
            history.splice(
                0,
                history.length - 20
            );
        }


        // ========================================
        // ส่งบทสนทนาให้ AI
        // ========================================

        const response =
            await openai.responses.create({

                model: "gpt-5.6-luna",

                instructions:
                    D_STATION_INFO,

                input:
                    history

            });


        const aiReply =
            response.output_text;

        console.log("AI:", aiReply);


        // ========================================
        // เก็บคำตอบ AI
        // ========================================

        history.push({
            role: "assistant",
            content: aiReply
        });


        // ========================================
// ตรวจว่าข้อมูลการจองครบหรือยัง
// ========================================

const bookingComplete =
    aiReply.includes("ข้อมูลครบแล้วค่ะ") &&
    aiReply.includes("ห้อง:") &&
    aiReply.includes("จำนวนคน:") &&
    aiReply.includes("วันที่:") &&
    aiReply.includes("เวลา:") &&
    aiReply.includes("ชื่อ:") &&
    aiReply.includes("เบอร์ติดต่อ:");

console.log(
    "CHECK ข้อมูลการจองครบ:",
    bookingComplete
);


if (bookingComplete) {

    console.log(
        "พบข้อมูลการจองครบแล้ว"
    );


    // ========================================
    // ดึงข้อมูลจากคำตอบ AI
    // ========================================

    const roomMatch =
        aiReply.match(
            /ห้อง\s*:\s*(.+)/
        );

    const peopleMatch =
        aiReply.match(
            /จำนวนคน\s*:\s*(.+)/
        );

    const dateMatch =
        aiReply.match(
            /วันที่\s*:\s*(.+)/
        );

    const startTimeMatch =
        aiReply.match(
            /เวลา\s*:\s*(\d{1,2}[:.]\d{2})\s*[-–—]\s*(\d{1,2}[:.]\d{2})/
        );

    const nameMatch =
        aiReply.match(
            /ชื่อ\s*:\s*(.+)/
        );

    const phoneMatch =
        aiReply.match(
            /เบอร์ติดต่อ\s*:\s*(.+)/
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

    const startTime =
        startTimeMatch
            ? startTimeMatch[1].trim()
            : "";

    const endTime =
        startTimeMatch
            ? startTimeMatch[2].trim()
            : "";

    const customerName =
        nameMatch
            ? nameMatch[1].trim()
            : "";

    const phone =
        phoneMatch
            ? phoneMatch[1].trim()
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
            phone
        }
    );


    // ========================================
    // ตรวจว่าข้อมูลสำคัญครบจริงหรือไม่
    // ========================================

    const bookingKey =
    `${userId}|${room}|${date}|${startTime}|${endTime}|${phone}`;

const alreadySaved =
    savedBookings.get(userId) === bookingKey;


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

        // ========================================
        // บันทึกลง Firestore
        // ========================================

        await db
            .collection("bookings")
            .add({

                customerName:
                    customerName,

                phone:
                    phone,

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


        console.log(
            "บันทึกคำขอจองลง Firebase สำเร็จ"
        );

        savedBookings.set(
    userId,
    bookingKey
);

    } else {

        console.log(
            "ข้อมูลการจองยังไม่ครบ จึงยังไม่บันทึก Firebase"
        );

    }

}


       // ========================================
// ส่งคำตอบกลับ LINE
// ========================================

// ตรวจว่าลูกค้ากำลังถามเรื่องห้องประชุมหรือไม่
const isMeetingRoomQuestion =
    /ห้องประชุม|ห้องประชุมให้เช่า|เช่าห้องประชุม|จองห้องประชุม|ห้องประชุมมี|ห้องประชุมราคา|ห้องประชุมกี่คน/
        .test(userMessage);

const messages = [
    {
        type: "text",
        text: aiReply
    }
];

// ถ้าลูกค้าถามเรื่องห้องประชุม → ส่งรูปรายละเอียดห้องให้ด้วย
if (isMeetingRoomQuestion) {

    messages.push({
        type: "image",

        originalContentUrl:
            "https://i.postimg.cc/7wKx749d/line-oa-chat-260831-104118.jpg",

        previewImageUrl:
            "https://i.postimg.cc/7wKx749d/line-oa-chat-260831-104118.jpg"
    });

}


// ========================================
// ส่งข้อความกลับ LINE
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