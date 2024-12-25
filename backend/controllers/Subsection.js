const Subsection = require("../models/SubSection");
const Section = require("../models/Section");
const { uploadImageToCloudinary } = require("../utils/imageUploader");
require('dotenv').config();

// create Subsection

exports.createSubSection = async (req, res) => {
  try {
    // fetch data from Req body
    const { sectionId, title, timeDuration, description } = req.body;
    // extract file/video
    const video = req.files.videoFile;
    // validation
    if (!sectionId || !title || !timeDuration || !description || !video)
      return res.status(400).json({
        success: false,
        message: "Missing Properties",
      });
    // upload video to cloudinary
    const uploadDetails = await uploadImageToCloudinary(
      video,
      process.env.FOLDER_NAME
    );
    // create a subssection
    const SubSectionDetails = await Subsection.create({
      title,
      timeDuration,
      description,
      videoUrl: uploadDetails.secrure_url,
    });
    // update Section with this subsection ObjectId
    await Section.findByIdAndUpdate(
      {
        sectionId,
      },
      {
        $push: {
          subSection: SubSectionDetails._id,
        },
      },
      { new: true }
    )
      .poplate("subSection")
      .exec();
    //return respones
    return res.status(200).json({
      success: true,
      message: "Subsection created successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to create Subsection, please try again",
      error: error.message,
    });
  }
};

// Hw : update Subsection and delte Subsection

exports.deleteSubSection = async (req, res) => {
  try {
    // fetch data from req body
    const { subSectionId } = req.body;
    // validation
    if (!subSectionId) {
      return res.status(400).json({
        success: false,
        message: "Missing Properties",
      });
    }
    // delete Subsection
    await Subsection.findByIdAndDelete({ subSectionId });
    // return response
    return res.status(200).json({
      success: true,
      message: "Subsection deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to delete Subsection, please try again",
      error: error.message,
    });
  }
};

exports.updateSubSection = async (req, res) => {
  try {
    const { subSectoinId, title, timeDuration, description } = req.body;
    // validation
    if (!subSectionId || !title || !timeDuration || !description) {
      return res.status(400).json({
        success: false,
        message: "Missing Properties",
      });
    }
    // update Subsection
    const updatedSubsection = await Subsection.findByIdAndUpdate(
      { subSectionId },
      {
        title,
        timeDuration,
        description,
      },
      { new: true }
    );
    return res.status(200).json({
      success: true,
      message: "Subsection updated successfully",
      data: updatedSubsection,
    });
  } catch (error) {
    res.status(500).json({
        success: false,
        message: "Unable to update Subsection, please try again",
        error: error.message,
    })
  }
};
