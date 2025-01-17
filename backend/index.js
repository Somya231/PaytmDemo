// backend/index.js
const express = require('express');
const cors = require("cors");
const rootRouter = require("./routes/index");

const app = express();

app.use(cors());
app.use(express.json());

// All api will start with this route
app.use("/api/v1", rootRouter);

app.listen(3000, () => {
    console.log("Port 3000 is running");
  });