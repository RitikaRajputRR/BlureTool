from fastapi import FastAPI, File, UploadFile, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

import os
import shutil
import uuid
import cv2
import json
import numpy as np


# =========================================================
# APP
# =========================================================

app = FastAPI(
    title="Image Blur Tool"
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# FOLDERS
# =========================================================

UPLOAD_DIR = "uploads"

PROCESSED_DIR = "processed"

STATIC_DIR = "static"


# =========================================================
# CREATE FOLDERS
# =========================================================

os.makedirs(
    UPLOAD_DIR,
    exist_ok=True
)

os.makedirs(
    PROCESSED_DIR,
    exist_ok=True
)


# =========================================================
# STATIC FILES
# =========================================================

app.mount(
    "/static",
    StaticFiles(
        directory=STATIC_DIR
    ),
    name="static"
)


app.mount(
    "/uploads",
    StaticFiles(
        directory=UPLOAD_DIR
    ),
    name="uploads"
)


app.mount(
    "/processed",
    StaticFiles(
        directory=PROCESSED_DIR
    ),
    name="processed"
)


# =========================================================
# HOME
# =========================================================

@app.get("/")
async def home():

    return FileResponse(
        "static/index.html"
    )


# =========================================================
# UPLOAD IMAGE
# =========================================================

@app.post("/api/upload")
async def upload_image(
    file: UploadFile = File(...)
):

    # -----------------------------------------------------
    # ALLOWED IMAGE TYPES
    # -----------------------------------------------------

    allowed_types = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ]


    if file.content_type not in allowed_types:

        return {
            "success": False,
            "message":
                "Only JPG, PNG and WEBP images are allowed."
        }


    # -----------------------------------------------------
    # GET EXTENSION
    # -----------------------------------------------------

    extension = os.path.splitext(
        file.filename or ""
    )[1].lower()


    # -----------------------------------------------------
    # CREATE UNIQUE FILE NAME
    # -----------------------------------------------------

    filename = (
        f"{uuid.uuid4().hex}"
        f"{extension}"
    )


    file_path = os.path.join(
        UPLOAD_DIR,
        filename
    )


    # -----------------------------------------------------
    # SAVE UPLOADED FILE
    # -----------------------------------------------------

    try:

        with open(
            file_path,
            "wb"
        ) as buffer:

            shutil.copyfileobj(
                file.file,
                buffer
            )


    except Exception as error:

        print(
            "Upload error:",
            error
        )


        return {
            "success": False,
            "message":
                "Unable to save uploaded image."
        }


    # -----------------------------------------------------
    # RESPONSE
    # -----------------------------------------------------

    return {
        "success": True,

        "message":
            "Image uploaded successfully.",

        "filename":
            filename,

        "image_url":
            f"/uploads/{filename}"
    }


# =========================================================
# GET SAFE BLUR KERNEL
# =========================================================

def get_safe_kernel_size(
    size: int,
    intensity: int
):

    """
    Creates a valid odd Gaussian blur kernel.

    intensity:
        1 = low blur
        10 = high blur
    """

    # -----------------------------------------------------
    # KEEP INTENSITY BETWEEN 1 AND 10
    # -----------------------------------------------------

    intensity = max(
        1,
        min(
            intensity,
            10
        )
    )


    # -----------------------------------------------------
    # CALCULATE KERNEL
    # -----------------------------------------------------

    kernel = (
        5 +
        (intensity * 6)
    )


    # Make sure kernel is odd

    if kernel % 2 == 0:

        kernel += 1


    # -----------------------------------------------------
    # KERNEL CANNOT BE LARGER THAN IMAGE REGION
    # -----------------------------------------------------

    if size <= 1:

        return 1


    max_kernel = (
        size
        if size % 2 == 1
        else size - 1
    )


    kernel = min(
        kernel,
        max_kernel
    )


    # -----------------------------------------------------
    # MINIMUM VALID KERNEL
    # -----------------------------------------------------

    if kernel < 3:

        return 1


    return kernel


# =========================================================
# BLUR COMPLETE IMAGE
# =========================================================

def blur_entire_image(
    image,
    intensity
):

    height, width = image.shape[:2]


    # -----------------------------------------------------
    # CREATE KERNEL
    # -----------------------------------------------------

    kernel = get_safe_kernel_size(
        min(
            width,
            height
        ),
        intensity
    )


    # -----------------------------------------------------
    # VERY SMALL IMAGE
    # -----------------------------------------------------

    if kernel < 3:

        if (
            width >= 3
            and
            height >= 3
        ):

            return cv2.blur(
                image,
                (
                    3,
                    3
                )
            )


        return image.copy()


    # -----------------------------------------------------
    # GAUSSIAN BLUR
    # -----------------------------------------------------

    return cv2.GaussianBlur(
        image,
        (
            kernel,
            kernel
        ),
        0
    )


# =========================================================
# BLUR SELECTED AREAS
# =========================================================

def blur_selected_areas(
    image,
    selected_areas,
    intensity
):

    image_height, image_width = \
        image.shape[:2]


    processed_count = 0


    # =====================================================
    # PROCESS EVERY SELECTED AREA
    # =====================================================

    for area in selected_areas:

        # -------------------------------------------------
        # READ AREA VALUES
        # -------------------------------------------------

        try:

            x = int(
                area["x"]
            )

            y = int(
                area["y"]
            )

            width = int(
                area["width"]
            )

            height = int(
                area["height"]
            )


        except (
            KeyError,
            TypeError,
            ValueError
        ):

            continue


        # -------------------------------------------------
        # BASIC VALIDATION
        # -------------------------------------------------

        if (
            width <= 0
            or
            height <= 0
        ):

            continue


        # -------------------------------------------------
        # KEEP X INSIDE IMAGE
        # -------------------------------------------------

        x = max(
            0,
            min(
                x,
                image_width - 1
            )
        )


        # -------------------------------------------------
        # KEEP Y INSIDE IMAGE
        # -------------------------------------------------

        y = max(
            0,
            min(
                y,
                image_height - 1
            )
        )


        # -------------------------------------------------
        # KEEP WIDTH INSIDE IMAGE
        # -------------------------------------------------

        width = min(
            width,
            image_width - x
        )


        # -------------------------------------------------
        # KEEP HEIGHT INSIDE IMAGE
        # -------------------------------------------------

        height = min(
            height,
            image_height - y
        )


        # -------------------------------------------------
        # FINAL VALIDATION
        # -------------------------------------------------

        if (
            width <= 0
            or
            height <= 0
        ):

            continue


        # =================================================
        # REGION OF INTEREST
        # =================================================

        roi = image[
            y:y + height,
            x:x + width
        ]


        if roi.size == 0:

            continue


        # =================================================
        # CREATE KERNEL
        # =================================================

        kernel_width = get_safe_kernel_size(
            width,
            intensity
        )


        kernel_height = get_safe_kernel_size(
            height,
            intensity
        )


        # =================================================
        # APPLY BLUR
        # =================================================

        if (
            kernel_width < 3
            or
            kernel_height < 3
        ):

            # ------------------------------------------------
            # SMALL AREA FALLBACK
            # ------------------------------------------------

            if (
                width >= 3
                and
                height >= 3
            ):

                blurred_roi = cv2.blur(
                    roi,
                    (
                        min(
                            3,
                            width
                        ),
                        min(
                            3,
                            height
                        )
                    )
                )


            else:

                blurred_roi = roi.copy()


        else:

            # ------------------------------------------------
            # NORMAL GAUSSIAN BLUR
            # ------------------------------------------------

            blurred_roi = cv2.GaussianBlur(
                roi,
                (
                    kernel_width,
                    kernel_height
                ),
                0
            )


        # =================================================
        # PUT BLURRED ROI BACK
        # =================================================

        image[
            y:y + height,
            x:x + width
        ] = blurred_roi


        processed_count += 1


    return (
        image,
        processed_count
    )


# =========================================================
# BACKGROUND BLUR
# =========================================================

def blur_background(
    image,
    intensity
):

    """
    Uses OpenCV GrabCut to estimate foreground
    and background.

    The detected background is blurred while
    the detected foreground remains mostly sharp.
    """

    image_height, image_width = \
        image.shape[:2]


    # -----------------------------------------------------
    # IMAGE TOO SMALL
    # -----------------------------------------------------

    if (
        image_width < 30
        or
        image_height < 30
    ):

        return (
            image,
            False
        )


    # =====================================================
    # INITIAL GRABCUT MASK
    # =====================================================

    mask = np.zeros(
        (
            image_height,
            image_width
        ),
        dtype=np.uint8
    )


    # =====================================================
    # INITIALIZE EVERYTHING AS PROBABLE BACKGROUND
    # =====================================================

    mask[:] = cv2.GC_PR_BGD


    # =====================================================
    # CENTRAL RECTANGLE
    # =====================================================

    margin_x = max(
        10,
        int(
            image_width * 0.08
        )
    )


    margin_y = max(
        10,
        int(
            image_height * 0.08
        )
    )


    rect_width = max(
        1,
        image_width -
        (
            2 *
            margin_x
        )
    )


    rect_height = max(
        1,
        image_height -
        (
            2 *
            margin_y
        )
    )


    rect = (
        margin_x,
        margin_y,
        rect_width,
        rect_height
    )


    # =====================================================
    # GRABCUT MODELS
    # =====================================================

    background_model = np.zeros(
        (
            1,
            65
        ),
        dtype=np.float64
    )


    foreground_model = np.zeros(
        (
            1,
            65
        ),
        dtype=np.float64
    )


    # =====================================================
    # RUN GRABCUT
    # =====================================================

    try:

        cv2.grabCut(
            image,
            mask,
            rect,
            background_model,
            foreground_model,
            5,
            cv2.GC_INIT_WITH_RECT
        )


    except Exception as error:

        print(
            "GrabCut error:",
            error
        )


        return (
            image,
            False
        )


    # =====================================================
    # CREATE FOREGROUND MASK
    # =====================================================

    foreground_mask = np.where(
        (
            mask ==
            cv2.GC_FGD
        )
        |
        (
            mask ==
            cv2.GC_PR_FGD
        ),
        255,
        0
    ).astype(
        np.uint8
    )


    # =====================================================
    # SMOOTH MASK
    # =====================================================

    foreground_mask = cv2.GaussianBlur(
        foreground_mask,
        (
            9,
            9
        ),
        0
    )


    # =====================================================
    # CREATE BLURRED IMAGE
    # =====================================================

    blurred_image = blur_entire_image(
        image,
        intensity
    )


    # =====================================================
    # CONVERT MASK TO FLOAT
    # =====================================================

    foreground_alpha = (
        foreground_mask.astype(
            np.float32
        )
        /
        255.0
    )


    # =====================================================
    # MAKE 3 CHANNEL MASK
    # =====================================================

    foreground_alpha = cv2.merge(
        [
            foreground_alpha,
            foreground_alpha,
            foreground_alpha
        ]
    )


    # =====================================================
    # COMBINE ORIGINAL + BLURRED
    # =====================================================

    result = (
        image.astype(
            np.float32
        )
        *
        foreground_alpha

        +

        blurred_image.astype(
            np.float32
        )
        *
        (
            1.0 -
            foreground_alpha
        )
    )


    # =====================================================
    # CONVERT BACK TO UINT8
    # =====================================================

    result = np.clip(
        result,
        0,
        255
    ).astype(
        np.uint8
    )


    return (
        result,
        True
    )


# =========================================================
# BLUR API
# =========================================================

@app.post("/api/blur")
async def blur_image_api(

    filename: str = Form(...),

    blur_type: str = Form(
        "selected"
    ),

    areas: str = Form(
        "[]"
    ),

    intensity: int = Form(
        5
    )

):

    # =====================================================
    # SECURITY
    # =====================================================

    safe_filename = os.path.basename(
        filename
    )


    input_path = os.path.join(
        UPLOAD_DIR,
        safe_filename
    )


    # =====================================================
    # CHECK ORIGINAL IMAGE
    # =====================================================

    if not os.path.exists(
        input_path
    ):

        return {
            "success": False,
            "message":
                "Original image not found."
        }


    # =====================================================
    # VALIDATE INTENSITY
    # =====================================================

    try:

        intensity = int(
            intensity
        )


    except (
        TypeError,
        ValueError
    ):

        intensity = 5


    intensity = max(
        1,
        min(
            intensity,
            10
        )
    )


    # =====================================================
    # READ IMAGE
    # =====================================================

    image = cv2.imread(
        input_path
    )


    if image is None:

        return {
            "success": False,
            "message":
                "Unable to read image."
        }


    # =====================================================
    # SELECTED AREA MODE
    # =====================================================

    if blur_type == "selected":

        # -------------------------------------------------
        # READ AREAS JSON
        # -------------------------------------------------

        try:

            selected_areas = json.loads(
                areas
            )


        except (
            json.JSONDecodeError,
            TypeError
        ):

            return {
                "success": False,
                "message":
                    "Invalid selected areas."
            }


        # -------------------------------------------------
        # VALIDATE LIST
        # -------------------------------------------------

        if not isinstance(
            selected_areas,
            list
        ):

            return {
                "success": False,
                "message":
                    "Selected areas must be a list."
            }


        # -------------------------------------------------
        # REQUIRE AREA
        # -------------------------------------------------

        if len(
            selected_areas
        ) == 0:

            return {
                "success": False,
                "message":
                    "Please select at least one area."
            }


        # -------------------------------------------------
        # BLUR AREAS
        # -------------------------------------------------

        image, processed_count = \
            blur_selected_areas(
                image,
                selected_areas,
                intensity
            )


        # -------------------------------------------------
        # CHECK
        # -------------------------------------------------

        if processed_count == 0:

            return {
                "success": False,
                "message":
                    "No valid areas were selected."
            }


        message = (
            f"{processed_count} "
            f"area(s) blurred successfully "
            f"with intensity "
            f"{intensity}/10."
        )


    # =====================================================
    # BACKGROUND MODE
    # =====================================================

    elif blur_type == "background":

        image, success = \
            blur_background(
                image,
                intensity
            )


        if not success:

            return {
                "success": False,
                "message":
                    (
                        "Unable to detect the "
                        "background automatically."
                    )
            }


        processed_count = 1


        message = (
            "Background blurred successfully "
            f"with intensity {intensity}/10."
        )


    # =====================================================
    # ENTIRE IMAGE MODE
    # =====================================================

    elif blur_type == "entire":

        image = blur_entire_image(
            image,
            intensity
        )


        processed_count = 1


        message = (
            "Entire image blurred successfully "
            f"with intensity {intensity}/10."
        )


    # =====================================================
    # INVALID BLUR TYPE
    # =====================================================

    else:

        return {
            "success": False,
            "message":
                (
                    "Invalid blur type. "
                    "Use selected, background or entire."
                )
        }


    # =====================================================
    # OUTPUT FILE NAME
    # =====================================================

    output_filename = (
        f"blurred_"
        f"{uuid.uuid4().hex}"
        f".jpg"
    )


    output_path = os.path.join(
        PROCESSED_DIR,
        output_filename
    )


    # =====================================================
    # SAVE PROCESSED IMAGE
    # =====================================================

    success = cv2.imwrite(
        output_path,
        image
    )


    if not success:

        return {
            "success": False,
            "message":
                "Unable to save processed image."
        }


    # =====================================================
    # FINAL RESPONSE
    # =====================================================

    return {
        "success": True,

        "message":
            message,

        "processed_filename":
            output_filename,

        "processed_url":
            f"/processed/{output_filename}",

        "areas_processed":
            processed_count,

        "blur_type":
            blur_type,

        "intensity":
            intensity
    }