import express from "express";

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 10000;


// หน้าแรก
app.get("/", (req, res) => {

    res.send("D-STATION LINE Webhook Server is running!");

});


// LINE Webhook
app.post("/webhook", (req, res) => {

    console.log(
        "LINE Webhook:",
        JSON.stringify(req.body, null, 2)
    );

    res.sendStatus(200);

});


app.listen(PORT, "0.0.0.0", () => {

    console.log(
        `Server running on port ${PORT}`
    );

});