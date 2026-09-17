import imagekit from "../config/image.config.js";

export const addproduct = async (req, res) => {
  try {
    const files = req.files || (req.file ? [req.file] : []);

    if (!files || files.length === 0) {
      return res.status(400).json({
        message: "image is required",
      });
    }

    const uploadedImages = [];

    for (const file of files) {
      const uploadimage = await imagekit.upload({
        file: file.buffer,
        fileName: file.originalname,
      });

      uploadedImages.push({
        image: uploadimage.url,
        title: file.originalname,
        sendAt: new Date(),
      });
    }

    return res.status(201).json({
      message: "Images uploaded successfully",
      files: uploadedImages,
    });
  } catch (error) {
    console.error("Error in upload controller:", error);
    return res.status(500).json({
      message: error.message,
    });
  }
};



