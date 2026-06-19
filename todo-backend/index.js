require("dotenv").config();
const express = require("express");
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-auth-token', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));

const path = require('path');
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));


const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB..."))
  .catch(err => console.error("Could not connect to MongoDB...", err));

const todos = require("./routes/todos");
app.use("/api/todos", todos);


const auth = require("./routes/auth");
app.use("/api/auth", auth);

const payment = require("./routes/payment");
app.use("/api/payment", payment);

const { initCron } = require("./cron/dailySummary");
initCron();

const port = 3001;

app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});