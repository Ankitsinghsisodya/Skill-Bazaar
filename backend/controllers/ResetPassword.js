const User = require("../models/User");
const mailSender = require("../utils/mailSender");
const bcrypt = require('bcrypt');
const crypto = require('crypto');

//resetPasswordToken
exports.resetPasswordToken = async (req, res) => {
  try {
    // get email from req body
    const email = req.body.email;
    // check user for this email, email validation

    const user =  User.findOne({ email:email });
    if (!user) {
      return response.status(400).json({
        success: false,
        message: "Your Email is not registered with us",
      });
    }
    // generate token
    const token = crypto.randomUUID();
    // update user by adding token and expiration time
    const updatedDetails = await User.findOneAndUpdate(
      { email },
      {
        token: token,
        resetPasswordExpired: Date.now() + 5 * 60 * 1000,
      },
      { new: true }
    );
    // create url
    const url = `http://localhost:3000/update-password/${token}`;

    // send mail containnig the url
    await mailSender(
      email,
      "Password Reset",
      `Your Link for email verification is ${url}. Please click this url to reset your password.`
    )
    // return response

    return res.json({
      success: true,
      message: `Email sent successfully, please check email and change password`,
    });
  } catch (error) {
    console.log(`Error:: ResetPassword.js :: resetPasswordToken`, error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// resetPassword
exports.resetPassword = async (req, res) => {
  try {
    // data fetch
    const { password, confirmPassword, token } = req.body;
    // validation
    if (password !== confirmPassword) {
      return res.json({
        success: false,
        message: `Password not matching`,
      });
    }
    // get userdetails from db using token
    const userDetails = await User.findOne({ token });

    // if no entry - invalid token
    if (!userDetails)
      return res.json({
        success: false,
        message: `Token is invalid`
      });
    // token time expires
    if(userDetails.resetPasswordExpired < Date.now()){
        return res.json({
            success: false,
            message: `Token is exired, please regenerate your token`
        })
    }
    // hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    // update the password
    await User.findOneAndUpdate({token},{
        password: hashedPassword,
    },{new: true})
    // rturn response
    return res.status(200).json({
        success: true,
        message: `Password reset successfull`
    })
  } catch (error) {
    console.log(`Error :: ResetPassword :: resetPassword`, error);
    res.status(500).json({
        success: false,
        message: `Something went wrong while resetting the password`
    })
  }
};
