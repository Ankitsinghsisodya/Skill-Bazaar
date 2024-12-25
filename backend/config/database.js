const mongoose = require("mongoose");
require("dotenv").config(); // Call the config function

exports.connect = () => {
  mongoose
    .connect(process.env.MONGOOSE_URL)
    .then(() => console.log("DB connected Successfully"))
    .catch((error) => {
      console.log("DB connection failed");
      console.log(error);
      process.exit(1);
    });
};