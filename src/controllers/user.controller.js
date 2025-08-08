import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponce.js";


const registerUser = asyncHandler(async (req, res) => {
    //  get user details from frontend
    //  validation -not empty
    //  check if user already exists: email, username
    //  check for images, check for avtar
    //  upload them to cloudinary, avtar
    //  create user object -create entery in db
    //  remove password and refresh token field from response
    //  check for user creation
    //  return response


    const {fullName, username, email, password} = req.body
    console.log("eamil", email);

    if (
        [fullName, email, username, password].some((field)=> field?.trim() === "")
    ) {
       throw  new apiError(400, "all feild are required");
    }
    

    const existedUser = User.findOne({
        $or: [
            {username}, {email}
        ]
    })


    if (existedUser) {
        throw new apiError(409, "user with this email or username already exists");                
    }


   const avatarLocalFilePath = req.files?.avatar[0]?.path;
   const coverImageLocalPath = req.files?.coverImage[0]?.path;

   if (!avatarLocalFilePath) {
      throw new apiError(400, "avatar image is required");
   }   

    const avatar = await uploadToCloudinary(avatarLocalFilePath);
    const CoverImg = await uploadToCloudinary(coverImageLocalPath);

    if (!avatar) {
      throw new apiError(400, "avatar image is required");
    }

    const user = await User.create({
        fullName,
        username: username.toLowerCase(),
        email,
        avatar: avatar.url,
        coverIamge: CoverImg?.url || "" 
    })

    const createdUser = await user.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new apiError(500, "something went wrong while registering user")
    }

    return res.status(201).json(
        new apiResponse(200, createdUser, "user registered sucessfully")
    )

})

export  {registerUser}