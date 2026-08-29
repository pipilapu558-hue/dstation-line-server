import express from "express";
import admin from "firebase-admin";

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 10000;


// ==========================================
// Firebase Admin
// ==========================================

const serviceAccount =
    JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT
    );


admin.initializeApp({
    credential:
        admin.credential.cert(
            serviceAccount
        )
});


const db =
    admin.firestore();


// ==========================================
// หน้าแรก
// ==========================================

app.get("/", (req, res) => {

    res.send(
        "D-STATION LINE Webhook Server is running!"
    );

});


// ==========================================
// LINE Webhook
// ==========================================

app.post("/webhook", async (req, res) => {

    try {

        console.log(
            "LINE Webhook:",
            JSON.stringify(
                req.body,
                null,
                2
            )
        );


        const events =
            req.body.events || [];


        for (
            const event
            of events
        ) {

            if (
                event.type === "message" &&
                event.message?.type === "text"
            ) {

                const text =
                    event.message.text;


                const userId =
                    event.source?.userId || "";


                await db
                    .collection("line_messages")
                    .add({

                        text: text,

                        userId: userId,

                        createdAt:
                            admin.firestore
                                .FieldValue
                                .serverTimestamp()

                    });


                console.log(
                    "บันทึกข้อความลง Firebase แล้ว:",
                    text
                );

            }

        }


        res.sendStatus(200);


    } catch (error) {

        console.error(
            "Webhook Error:",
            error
        );


        res.sendStatus(500);

    }

});


app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `Server running on port ${PORT}`
        );

    }
);
