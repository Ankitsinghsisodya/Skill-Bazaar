const User = require("../models/User");
const OTP = require("../models/OTP");
const otpGenerator = require("otp-generator");
const Profile = require(`../models/Profile`);
const bcrypt = require(`bcrypt`);
const jwt = require("jsonwebtoken");
const mailSender = require("../utils/mailSender");
require("dotenv").config();

// sendOtp
exports.sendOTP = async (req, res) => {
  try {
    //fetch email from request ki body
    const { email } = req.body;

    //check if user already exist
    const checkUserPresent = await User.findOne({ email });

    // if user already exist, then return a response
    if (checkUserPresent) {
      res.status(401).json({
        success: false,
        message: "User already registered",
      });
    }
    // generate otp
    var otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
    });

    //check unique otp or not
    let result = await OTP.findOne({ otp });

    while (result) {
      otp = otpGenerator.generate(6, {
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false,
      });
      result = await OTP.findOne({ otp });
    }

    const otpPayload = { email, otp };

    //creat an ertry for OTP
    const otpBody = await OTP.create(otpPayload);

    //return resonse successful
    res.status(200).json({
      success: true,
      message: "OTP Sent SuccessFuly",
      otp,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// sign up
exports.signUp = async (req, res) => {
  try {
    // data ftech from request ki body
    const {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      accountType,
      contactNumber,
      otp,
    } = req.body;

    //validate krlo

    if (
      !firstName ||
      !lastName ||
      !email ||
      !confirmPassword ||
      !password ||
      !otp
    ) {
      return res.status(403).json({
        success: false,
        message: "All fileds are required",
      });
    }

    // check both password are equal or not
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message:
          "Password and CofirmPassword Value does not match, please try again",
      });
    }

    // check user already exist or not
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: "User already registered",
      });
    }

    // find most recent OTP stored for the user
    const recentOtp = await OTP.find({ email }).sort({ createAt: -1 }).limit(1);

    // validate OTP
    if (recentOtp.length == 0) {
      //OTP not found
      return res.status(400).json({
        success: false,
        message: "OTP not found",
      });
    } else if (otp !== recentOtp[0].otp) {
      // Invalid OTP
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const profileDetails = await Profile.create({
      gender: null,
      dateOfBirth: null,
      about: null,
      contactNumber: null,
    });
    //entry create in Db
    const user = await User.create({
      firstName,
      lastName,
      email,
      contactNumber,
      password: hashedPassword,
      accountType,
      additionalDetails: profileDetails._id,
      image: `https://api.dicebear.com/5.x/initials/svg?seed=${firstName}${lastName}`,
    });

    //return res
    return res.status(200).json({
      sucess: true,
      message: "User is registered Successfully",
      user,
    });
  } catch (error) {
    console.log(`Error :: Auth.js :: SignUp`, error);
    res.status(500).json({
      success: false,
      message: "User cannot be registered. Please try again",
    });
  }
};

// login
exports.login = async (req, res) => {
  try {
    // get data from req body
    const { email, password } = req.body;

    
    // validation data
    if (!email || !password)
      return res.status(403).json({
        success: false,
        message: "All fields are required, please try again",
      });

    // user check exist or not
    const user = await User.findOne({ email }).populate("additionalDetails");
    console.log("user -> ", user);
    if (!user)
      res.status(401).json({
        success: false,
        message: "User is not registered, please signup first",
      });

    // generate JWt, after password matching
    if (await bcrypt.compare(password, user.password)) {
      const payload = {
        email: user.email,
        id: user._id,
        accountType: user.accountType,
      };
      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "2h",
      });
      user.token = token;
      user.password = undefined;

      // create cookie and send response
      const options = {
        expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        httpOnly: true,
      };

      res.cookie("token", token, options).status(200).json({
        success: true,
        token,
        user,
        message: "Logged in Successfully",
      });
    } else {
      return res.status(401).json({
        success: false,
        message: "Password is incorrect",
      });
    }
  } catch (error) {
    console.log(`Error:: Auth.js :: login`, error);
    return res.status(500).json({
      success: false,
      message: `Login Failure, please try again`,
    });
  }
};

// changepassword
exports.changePassword = async (req, res) => {
  try {
    // get data from req body
    const { email, password, newPassword, confirmNewPassword } = req.body;
    // get old password, newPassword, confirmNewPassword

    if (!email || !password || !newPassword || !confirmNewPassword) {
      return res.status(400).send({
        success: false,
        message: `Please send all the details required`,
      });
    }

    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).send({
        success: false,
        message: `Such a user doesn't exist`,
      });

    // validation
    if (!(await bcrypt.compare(user.password, password)))
      return res.status(403).send({
        success: false,
        message: `Password is incorrect`,
      });
    // update pwd in DB
    user.password = await bcrypt(password, 10);
    // send mail - Password updated
    mailSender(
      user.email,
      "Password changed",
      `<p>Your password is updated</p>`
    );

    // return response
    res.status(200).json({
      success: true,
      message: `password changed`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Password not changed`,
    });
  }
};
