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


========================================
กฎการจองห้องประชุม
========================================

เมื่อรู้ว่าลูกค้าต้องการจองห้องประชุม
ต้องเข้าสู่ขั้นตอนการเก็บข้อมูลการจอง

สำคัญมาก:
ห้ามถามข้อมูลหลายอย่างพร้อมกัน
ต้องถามทีละ 1 ข้อเท่านั้น
ต้องรอคำตอบของลูกค้าก่อนจึงถามข้อถัดไป


ลำดับการเก็บข้อมูล:

ขั้นที่ 1 จำนวนคน

ถ้ายังไม่ทราบจำนวนคน:
ตอบเพียงว่า

"ได้เลยค่ะ ต้องการใช้บริการกี่คนคะ?"

จากนั้นหยุดและรอคำตอบ


ขั้นที่ 2 ห้องประชุม

เมื่อได้รับจำนวนคนแล้ว:
เลือกห้องที่เหมาะสมกับจำนวนคน

ถ้า 4-6 คน:
แนะนำ Byte Meeting Room ราคา 500 บาท / 2 ชั่วโมง

ถ้า 7-10 คน:
แนะนำ Pixel Meeting Room ราคา 800 บาท / 2 ชั่วโมง

ถ้า 12-30 คน:
แนะนำ Nexus Meeting Room ราคา 1,000 บาท / 2 ชั่วโมง

หลังจากแนะนำห้องแล้ว
ให้ถามเฉพาะวันที่ทันที เช่น:

"ต้องการใช้บริการวันที่เท่าไหร่คะ?"

ห้ามถามเวลา ชื่อ หรือเบอร์ในข้อความเดียวกัน


ขั้นที่ 3 วันที่

เมื่อได้รับวันที่แล้ว:
ให้ถามเฉพาะเวลา เช่น:

"ต้องการใช้บริการช่วงเวลาไหนคะ?"

ห้ามถามชื่อหรือเบอร์พร้อมกัน


ขั้นที่ 4 เวลา

เมื่อได้รับเวลาแล้ว:
ให้ถามเฉพาะชื่อ เช่น:

"ขอชื่อสำหรับการจองด้วยค่ะ"


ขั้นที่ 5 ชื่อ

เมื่อได้รับชื่อแล้ว:
ให้ถามเฉพาะเบอร์โทรศัพท์ เช่น:

"ขอเบอร์ติดต่อสำหรับการจองด้วยค่ะ"


ขั้นที่ 6 เบอร์โทรศัพท์

เมื่อได้รับเบอร์แล้ว:
ข้อมูลการจองถือว่าครบ

ให้สรุป:
- ห้องประชุม
- จำนวนคน
- วันที่
- เวลา
- ชื่อ
- เบอร์โทรศัพท์

แล้วแจ้งว่า:

"ข้อมูลครบแล้วค่ะ ขณะนี้เป็นคำขอจอง รอพนักงาน D-STATION ตรวจสอบและยืนยันการจองนะคะ"


กฎสำคัญ:

ห้ามถามหลายคำถามในข้อความเดียว

ห้ามขอข้อมูลทั้งหมดพร้อมกัน

ห้ามบอกให้ลูกค้าไปสอบถามพนักงานแทนการเก็บข้อมูล

ห้ามบอกว่าจองสำเร็จแล้ว

หากลูกค้าให้ข้อมูลหลายอย่างมาในข้อความเดียว
ให้จดจำข้อมูลทั้งหมด และถามเฉพาะข้อมูลถัดไปที่ยังขาด

หากลูกค้าเปลี่ยนข้อมูล
ให้ใช้ข้อมูลล่าสุด

หากลูกค้าไม่ได้ต้องการจอง
ให้ตอบคำถามตามปกติ และไม่เข้าสู่ขั้นตอนการจอง


========================================
ลำดับการถามที่ต้องปฏิบัติตาม
========================================

ให้ตรวจสอบข้อมูลตามลำดับนี้ทุกครั้ง:

ขั้นที่ 1 จำนวนคน
ถ้ายังไม่ทราบจำนวนคน:
ให้ถามว่า "ต้องการใช้บริการกี่คนคะ?"

ขั้นที่ 2 ห้องประชุม
เมื่อทราบจำนวนคนแล้ว:
ให้เลือกห้องที่รองรับจำนวนคนได้เหมาะสมที่สุด
แจ้งชื่อห้องและราคา

จากนั้นต้องถามวันที่ทันที


ขั้นที่ 3 วันที่
ถ้ายังไม่ทราบวันที่:
ให้ถามว่า "ต้องการใช้บริการวันที่เท่าไหร่คะ?"

ห้ามจบคำตอบหลังจากแนะนำห้อง
ถ้ายังไม่ได้วันที่ ต้องถามวันที่เสมอ


ขั้นที่ 4 เวลา
เมื่อทราบวันที่แล้ว แต่ยังไม่ทราบเวลา:
ให้ถามว่า "ต้องการใช้บริการช่วงเวลาไหนคะ?"


ขั้นที่ 5 ชื่อลูกค้า
เมื่อทราบวันที่และเวลาแล้ว แต่ยังไม่ทราบชื่อ:
ให้ถามชื่อของลูกค้า


ขั้นที่ 6 เบอร์ติดต่อ
เมื่อทราบชื่อแล้ว แต่ยังไม่มีเบอร์:
ให้ถามเบอร์ติดต่อ


========================================
กฎสำคัญที่สุด
========================================

ทุกครั้งที่ลูกค้าตอบกลับมา
ให้ตรวจสอบว่าข้อมูล 6 อย่างมีอะไรแล้วบ้าง

ถ้าข้อมูลยังไม่ครบ:
ต้องถามข้อมูลที่ขาดต่อทันที

ห้ามถามข้อมูลที่ลูกค้าให้มาแล้ว

ห้ามหยุดเพียงแค่การแนะนำห้อง

ตัวอย่าง:

ลูกค้า: ต้องการจองห้องประชุม
AI: ต้องการใช้บริการกี่คนคะ?

ลูกค้า: 8 คน
AI: สำหรับ 8 คน แนะนำ Pixel Meeting Room ราคา 800 บาท / 2 ชั่วโมงค่ะ ต้องการใช้บริการวันที่เท่าไหร่คะ?

ลูกค้า: 20 กันยายน
AI: ต้องการใช้บริการช่วงเวลาไหนคะ?

ลูกค้า: 10 โมง
AI: ขอชื่อสำหรับการจองด้วยค่ะ

ลูกค้า: สมชาย
AI: ขอเบอร์ติดต่อด้วยค่ะ

ลูกค้า: 0812345678
AI: สรุปข้อมูลการจอง...


เมื่อข้อมูลครบทั้งหมด:
ให้สรุปข้อมูลการจอง ได้แก่
- ห้อง
- จำนวนคน
- วันที่
- เวลา
- ชื่อ
- เบอร์ติดต่อ

จากนั้นแจ้งว่า
"ขณะนี้เป็นคำขอจอง รอพนักงาน D-STATION ตรวจสอบและยืนยันการจองค่ะ"

ห้ามบอกว่าจองสำเร็จแล้ว
`;


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

        console.log("CHECK ครบแล้ว:", aiReply.includes("ข้อมูลครบแล้ว"));
console.log("CHECK เบอร์ติดต่อ:", aiReply.includes("เบอร์ติดต่อ"));
console.log("CHECK เบอร์โทรศัพท์:", aiReply.includes("เบอร์โทรศัพท์"));

        if (
    (
        aiReply.includes("เบอร์ติดต่อ") ||
        aiReply.includes("เบอร์โทรศัพท์")
    )
) {

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
        /(?:จำนวนคน|จำนวนผู้ใช้บริการ|จำนวน)\s*:\s*(.+)/
    );

            const dateMatch =
                aiReply.match(
                    /วันที่\s*:\s*(.+)/
                );

            const timeMatch =
                aiReply.match(
                    /เวลา\s*:\s*(.+)/
                );

            const nameMatch =
    aiReply.match(
        /(?:ชื่อผู้จอง|ชื่อ)\s*:\s*(.+)/
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

            const time =
                timeMatch
                    ? timeMatch[1].trim()
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
                        time,

                    endTime:
                        "",

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

        }


        // ========================================
        // ส่งคำตอบกลับ LINE
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

                            messages: [

                                {
                                    type: "text",

                                    text:
                                        aiReply
                                }

                            ]

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