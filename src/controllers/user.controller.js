import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/clodinary.js";
import { apiResponse } from "../utils/apiResponce.js";
import jwt from "jsonwebtoken"

// Generate access & refresh tokens
const generateAccessAndRefreshToken = async (userID) => {
    try {
        const user = await User.findById(userID);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { refreshToken, accessToken };
    } catch (error) {
        throw new apiError(500, "Something went wrong while generating access and refresh token");
    }
};

// =============================
// Register User
// Steps:
// 1. Get user details from frontend
// 2. Validation - not empty
// 3. Check if user already exists: email, username
// 4. Check for images, check for avatar
// 5. Upload them to Cloudinary
// 6. Create user object - create entry in DB
// 7. Remove password and refresh token field from response
// 8. Check for user creation
// 9. Return response
// =============================
const registerUser = asyncHandler(async (req, res) => {
    const { fullName, username, email, password } = req.body;

    // Step 2: Validation
    if ([fullName, email, username, password].some(field => !field?.trim())) {
        throw new apiError(400, "All fields are required");
    }

    // Step 3: Check if user already exists
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (existedUser) {
        throw new apiError(409, "User with this email or username already exists");
    }

    // Step 4: Avatar image path
    const avatarLocalFilePath = req.files?.avatar?.[0]?.path;

    // Step 4 (optional): Cover image path
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalFilePath) {
        throw new apiError(400, "Avatar image is required");
    }

    // Step 5: Upload images to Cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalFilePath);
    const coverImage = coverImageLocalPath
        ? await uploadOnCloudinary(coverImageLocalPath)
        : null;

    if (!avatar) {
        throw new apiError(400, "Failed to upload avatar image");
    }

    // Step 6: Create user object - create entry in DB
    const user = await User.create({
        fullName,
        username: username.toLowerCase(),
        email,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || ""
    });

    // Step 7: Remove sensitive fields
    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    // Step 8: Check for user creation
    if (!createdUser) {
        throw new apiError(500, "Something went wrong while registering user");
    }

    // Step 9: Return response
    return res.status(201).json(
        new apiResponse(200, createdUser, "User registered successfully")
    );
});

// =============================
// Login User
// Steps:
// 1. req body -> data
// 2. username or email
// 3. find the user
// 4. password check
// 5. access and refresh token generate
// 6. send cookie
// =============================
const loginUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;

    // Step 2: Validate username or email
    if (!(username || email)) {
        throw new apiError(400, "Username or email is required");
    }

    // Step 3: Find the user
    const user = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (!user) {
        throw new apiError(404, "User doesn't exist");
    }

    // Step 4: Check password
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new apiError(401, "Password is incorrect");
    }

    // Step 5: Generate tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    // Remove sensitive fields
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    // Step 6: Send cookie
    const options = {
        httpOnly: true,
        secure: true
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new apiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken
                },
                "User logged in successfully"
            )
        );
});

// =============================
// Logout User
// =============================
const logOutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        { $set: { refreshToken: undefined } },
        { new: true }
    );

    const options = {
        httpOnly: true,
        secure: true
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new apiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async( req, res ) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken


    if (!incomingRefreshToken) {
        throw new apiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new apiError(401, "Invalid refresh token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new apiError(401, "Refresh token is expired or used")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken)
        .cookie("refreshToken", newRefreshToken)
        .json(
            new apiResponse(
                200,
                {accessToken, "refreshToken": newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new apiError(401, error?.message || "Invalid refresh token")
    }
})


export {
    registerUser,
    loginUser,
    logOutUser,
    refreshAccessToken
};
