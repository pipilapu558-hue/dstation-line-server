import express from "express";
import OpenAI from "openai";

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 10000;

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});


// หน้าแรก
app.get("/", (req, res) => {

    res.send("D-STATION LINE Webhook Server is running!");

});


// LINE Webhook
app.post("/webhook", async (req, res) => {

    console.log(
        "LINE Webhook:",
        JSON.stringify(req.body, null, 2)
    );

    try {

        const event = req.body?.events?.[0];

        // ถ้าไม่มี event
        if (!event) {
            return res.sendStatus(200);
        }

        // ถ้าไม่ใช่ข้อความ
        if (event.type !== "message") {
            return res.sendStatus(200);
        }

        // ถ้าไม่ใช่ข้อความตัวอักษร
        if (event.message?.type !== "text") {
            return res.sendStatus(200);
        }

        const userMessage = event.message.text;
        const replyToken = event.replyToken;

        console.log("ลูกค้า:", userMessage);


        // ส่งข้อความให้ OpenAI
        const response = await openai.responses.create({

            model: "gpt-5.6-luna",

            instructions:
                "คุณคือ AI ผู้ช่วยของ D-STATION นครสวรรค์ ตอบลูกค้าเป็นภาษาไทยอย่างสุภาพ กระชับ เป็นธรรมชาติ และช่วยตอบคำถามเกี่ยวกับบริการของ D-STATION",

            input: userMessage

        });


        const aiReply = response.output_text;

        console.log("AI:", aiReply);


        // ส่งคำตอบกลับไปที่ LINE
        await fetch(
            "https://api.line.me/v2/bot/message/reply",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization":
                        `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
                },

                body: JSON.stringify({
                    replyToken: replyToken,

                    messages: [
                        {
                            type: "text",
                            text: aiReply
                        }
                    ]
                })
            }
        );


        console.log("ส่งคำตอบกลับ LINE สำเร็จ");

        res.sendStatus(200);


    } catch (error) {

        console.error("Error:", error);

        res.sendStatus(500);

    }

});


app.listen(PORT, "0.0.0.0", () => {

    console.log(
        `Server running on port ${PORT}`
    );

});