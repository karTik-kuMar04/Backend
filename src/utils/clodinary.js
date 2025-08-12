import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"


    // Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDAINARY_NAME, 
    api_key: process.env.CLOUDAINARY_API_KEY,
    api_secret: process.env.CLOUDAINARY_API_SECRET // Click 'View API Keys' above to copy your API secret
});


const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        // upload file to cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        // file has been uploaded
        // console.log("File uploaded on cloudinary successfully", response.url);
        fs.unlinkSync(localFilePath);
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath); // remove  the locally saved temporary file as the upload opration got failed
        return null;
    }
}

export { uploadOnCloudinary };