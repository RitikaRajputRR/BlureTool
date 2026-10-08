// =====================================================
// IMAGE BLUR TOOL
// SELECTED AREA + BACKGROUND + ENTIRE IMAGE
// =====================================================


// =====================================================
// RENDER BACKEND URL
// =====================================================

const API_URL = "https://bluretool.onrender.com";


// =====================================================
// DOM ELEMENTS
// =====================================================

const imageInput =
    document.getElementById("imageInput");

const uploadBtn =
    document.getElementById("uploadBtn");

const originalImage =
    document.getElementById("originalImage");

const imageContainer =
    document.getElementById("imageContainer");

const selectionLayer =
    document.getElementById("selectionLayer");

const blurBtn =
    document.getElementById("blurBtn");

const clearSelectionBtn =
    document.getElementById("clearSelectionBtn");

const processedImage =
    document.getElementById("processedImage");

const processedPlaceholder =
    document.getElementById("processedPlaceholder");

const downloadBtn =
    document.getElementById("downloadBtn");

const editorSection =
    document.getElementById("editorSection");

const message =
    document.getElementById("message");

const commandInput =
    document.getElementById("commandInput");

const selectModeBtn =
    document.getElementById("selectModeBtn");

const selectedAreaControls =
    document.getElementById("selectedAreaControls");

const selectionHint =
    document.getElementById("selectionHint");


// =====================================================
// INTENSITY
// =====================================================

const blurIntensity =
    document.getElementById("blurIntensity");

const intensityValue =
    document.getElementById("intensityValue");


// =====================================================
// VARIABLES
// =====================================================

let uploadedFilename = null;

let selectedAreas = [];

let isSelecting = false;

let startX = 0;

let startY = 0;

let temporaryBox = null;


// =====================================================
// INITIAL INTENSITY
// =====================================================

if (
    blurIntensity &&
    intensityValue
) {

    intensityValue.textContent =
        blurIntensity.value;


    blurIntensity.addEventListener(
        "input",
        () => {

            intensityValue.textContent =
                blurIntensity.value;

        }
    );

}


// =====================================================
// GET BLUR TYPE
// =====================================================

function getBlurType() {

    const selected =
        document.querySelector(
            'input[name="blurType"]:checked'
        );


    if (!selected) {

        return "selected";

    }


    return selected.value;

}


// =====================================================
// BLUR TYPE CHANGE
// =====================================================

const blurTypeRadios =
    document.querySelectorAll(
        'input[name="blurType"]'
    );


blurTypeRadios.forEach(
    (radio) => {

        radio.addEventListener(
            "change",
            handleBlurTypeChange
        );

    }
);


function handleBlurTypeChange() {

    const blurType =
        getBlurType();


    if (blurType === "selected") {

        if (selectedAreaControls) {

            selectedAreaControls.classList.remove(
                "hidden"
            );

        }


        if (selectionHint) {

            selectionHint.textContent =
                "Drag to select an area. Drag again for another area.";

        }


        blurBtn.textContent =
            "Blur Selected Areas";


        imageContainer.style.cursor =
            "crosshair";


        updateButtons();


        showMessage(
            "Selected Area mode: drag over one or more areas."
        );


        return;

    }


    clearAllSelections();


    if (selectedAreaControls) {

        selectedAreaControls.classList.add(
            "hidden"
        );

    }


    if (blurType === "background") {

        if (selectionHint) {

            selectionHint.textContent =
                "Background will be detected automatically.";

        }


        blurBtn.textContent =
            "Blur Background";


        imageContainer.style.cursor =
            "default";


        blurBtn.disabled =
            !uploadedFilename;


        showMessage(
            "Background mode selected. The app will detect the foreground and blur the background."
        );


        return;

    }


    if (blurType === "entire") {

        if (selectionHint) {

            selectionHint.textContent =
                "The complete image will be blurred.";

        }


        blurBtn.textContent =
            "Blur Entire Image";


        imageContainer.style.cursor =
            "default";


        blurBtn.disabled =
            !uploadedFilename;


        showMessage(
            "Entire Image mode selected."
        );

    }

}


// =====================================================
// UPLOAD IMAGE
// =====================================================

uploadBtn.addEventListener(
    "click",
    async () => {

        const file =
            imageInput.files[0];


        if (!file) {

            showMessage(
                "Please select an image first."
            );

            return;

        }


        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];


        if (
            !allowedTypes.includes(
                file.type
            )
        ) {

            showMessage(
                "Only JPG, PNG and WEBP images are allowed."
            );

            return;

        }


        const formData =
            new FormData();


        formData.append(
            "file",
            file
        );


        uploadBtn.disabled =
            true;

        uploadBtn.textContent =
            "Uploading...";


        showMessage(
            "Uploading image..."
        );


        try {

            const response =
                await fetch(
                    `${API_URL}/api/upload`,
                    {
                        method: "POST",
                        body: formData
                    }
                );


            if (!response.ok) {

                throw new Error(
                    `Upload failed: ${response.status}`
                );

            }


            const data =
                await response.json();


            if (!data.success) {

                showMessage(
                    data.message ||
                    "Image upload failed."
                );

                resetUploadButton();

                return;

            }


            uploadedFilename =
                data.filename;


            originalImage.src =
                `${API_URL}${data.image_url}?t=${Date.now()}`;


            originalImage.onload =
                () => {

                    editorSection.classList.remove(
                        "hidden"
                    );


                    clearAllSelections();


                    processedImage.src =
                        "";


                    processedImage.style.display =
                        "none";


                    processedPlaceholder.style.display =
                        "block";


                    downloadBtn.classList.add(
                        "hidden"
                    );


                    downloadBtn.removeAttribute(
                        "href"
                    );


                    resetUploadButton();


                    handleBlurTypeChange();


                    showMessage(
                        "Image uploaded successfully. Choose a blur type."
                    );

                };


        } catch (error) {

            console.error(
                "Upload error:",
                error
            );


            showMessage(
                "Something went wrong while uploading."
            );


            resetUploadButton();

        }

    }
);


// =====================================================
// RESET UPLOAD BUTTON
// =====================================================

function resetUploadButton() {

    uploadBtn.disabled =
        false;

    uploadBtn.textContent =
        "Upload Image";

}


// =====================================================
// IMAGE POINTER DOWN
// =====================================================

imageContainer.addEventListener(
    "pointerdown",
    (event) => {

        if (
            !uploadedFilename
        ) {

            return;

        }


        if (
            getBlurType() !== "selected"
        ) {

            return;

        }


        event.preventDefault();


        const imageRect =
            originalImage.getBoundingClientRect();


        const containerRect =
            imageContainer.getBoundingClientRect();


        const x =
            event.clientX -
            imageRect.left;


        const y =
            event.clientY -
            imageRect.top;


        if (
            x < 0 ||
            y < 0 ||
            x > imageRect.width ||
            y > imageRect.height
        ) {

            return;

        }


        startX = x;

        startY = y;

        isSelecting = true;


        try {

            imageContainer.setPointerCapture(
                event.pointerId
            );

        } catch (error) {

            console.log(
                "Pointer capture unavailable."
            );

        }


        removeTemporaryBox();


        temporaryBox =
            document.createElement(
                "div"
            );


        temporaryBox.className =
            "selection-box";


        temporaryBox.style.left =
            `${imageRect.left - containerRect.left + startX}px`;


        temporaryBox.style.top =
            `${imageRect.top - containerRect.top + startY}px`;


        temporaryBox.style.width =
            "0px";


        temporaryBox.style.height =
            "0px";


        selectionLayer.appendChild(
            temporaryBox
        );


        showMessage(
            "Drag over the area you want to blur."
        );

    }
);


// =====================================================
// POINTER MOVE
// =====================================================

imageContainer.addEventListener(
    "pointermove",
    (event) => {

        if (
            !isSelecting ||
            !temporaryBox
        ) {

            return;

        }


        event.preventDefault();


        const imageRect =
            originalImage.getBoundingClientRect();


        const containerRect =
            imageContainer.getBoundingClientRect();


        let currentX =
            event.clientX -
            imageRect.left;


        let currentY =
            event.clientY -
            imageRect.top;


        currentX =
            Math.max(
                0,
                Math.min(
                    currentX,
                    imageRect.width
                )
            );


        currentY =
            Math.max(
                0,
                Math.min(
                    currentY,
                    imageRect.height
                )
            );


        const left =
            Math.min(
                startX,
                currentX
            );


        const top =
            Math.min(
                startY,
                currentY
            );


        const width =
            Math.abs(
                currentX -
                startX
            );


        const height =
            Math.abs(
                currentY -
                startY
            );


        temporaryBox.style.left =
            `${imageRect.left - containerRect.left + left}px`;


        temporaryBox.style.top =
            `${imageRect.top - containerRect.top + top}px`;


        temporaryBox.style.width =
            `${width}px`;


        temporaryBox.style.height =
            `${height}px`;

    }
);


// =====================================================
// POINTER UP
// =====================================================

imageContainer.addEventListener(
    "pointerup",
    (event) => {

        if (!isSelecting) {

            return;

        }


        event.preventDefault();


        isSelecting =
            false;


        const imageRect =
            originalImage.getBoundingClientRect();


        let currentX =
            event.clientX -
            imageRect.left;


        let currentY =
            event.clientY -
            imageRect.top;


        currentX =
            Math.max(
                0,
                Math.min(
                    currentX,
                    imageRect.width
                )
            );


        currentY =
            Math.max(
                0,
                Math.min(
                    currentY,
                    imageRect.height
                )
            );


        const left =
            Math.min(
                startX,
                currentX
            );


        const top =
            Math.min(
                startY,
                currentY
            );


        const width =
            Math.abs(
                currentX -
                startX
            );


        const height =
            Math.abs(
                currentY -
                startY
            );


        if (
            width < 10 ||
            height < 10
        ) {

            removeTemporaryBox();


            showMessage(
                "Selection is too small. Please drag a larger area."
            );


            return;

        }


        const area = {

            x: left,

            y: top,

            width: width,

            height: height

        };


        selectedAreas.push(
            area
        );


        if (temporaryBox) {

            addSelectionNumber(
                temporaryBox,
                selectedAreas.length
            );


            temporaryBox = null;

        }


        updateButtons();


        showMessage(
            `${selectedAreas.length} area(s) selected. Drag again for another area.`
        );


        try {

            imageContainer.releasePointerCapture(
                event.pointerId
            );

        } catch (error) {

            // Ignore

        }

    }
);


// =====================================================
// POINTER CANCEL
// =====================================================

imageContainer.addEventListener(
    "pointercancel",
    () => {

        isSelecting =
            false;

        removeTemporaryBox();

    }
);


// =====================================================
// CLEAR SELECTIONS
// =====================================================

clearSelectionBtn.addEventListener(
    "click",
    () => {

        clearAllSelections();


        showMessage(
            "All selections cleared."
        );

    }
);


// =====================================================
// CLEAR ALL
// =====================================================

function clearAllSelections() {

    selectedAreas =
        [];


    isSelecting =
        false;


    removeTemporaryBox();


    if (selectionLayer) {

        selectionLayer.innerHTML =
            "";

    }


    updateButtons();

}


// =====================================================
// REMOVE TEMPORARY BOX
// =====================================================

function removeTemporaryBox() {

    if (temporaryBox) {

        temporaryBox.remove();

        temporaryBox =
            null;

    }

}


// =====================================================
// SELECTION NUMBER
// =====================================================

function addSelectionNumber(
    box,
    number
) {

    const label =
        document.createElement(
            "div"
        );


    label.className =
        "selection-number";


    label.textContent =
        number;


    box.appendChild(
        label
    );

}


// =====================================================
// UPDATE BUTTONS
// =====================================================

function updateButtons() {

    const blurType =
        getBlurType();


    if (!uploadedFilename) {

        blurBtn.disabled =
            true;

        clearSelectionBtn.disabled =
            true;

        return;

    }


    if (blurType === "selected") {

        blurBtn.disabled =
            selectedAreas.length === 0;

        clearSelectionBtn.disabled =
            selectedAreas.length === 0;

        return;

    }


    blurBtn.disabled =
        false;

    clearSelectionBtn.disabled =
        true;

}


// =====================================================
// BLUR BUTTON
// =====================================================

blurBtn.addEventListener(
    "click",
    async () => {

        if (!uploadedFilename) {

            showMessage(
                "Please upload an image first."
            );

            return;

        }


        const blurType =
            getBlurType();


        if (
            blurType === "selected" &&
            selectedAreas.length === 0
        ) {

            showMessage(
                "Please select at least one area."
            );

            return;

        }


        let intensity =
            parseInt(
                blurIntensity.value,
                10
            );


        if (
            Number.isNaN(
                intensity
            )
        ) {

            intensity = 5;

        }


        intensity =
            Math.max(
                1,
                Math.min(
                    intensity,
                    10
                )
            );


        blurBtn.disabled =
            true;

        clearSelectionBtn.disabled =
            true;


        const oldText =
            blurBtn.textContent;


        blurBtn.textContent =
            "Processing...";


        showMessage(
            `Processing ${getBlurTypeLabel(blurType)} with intensity ${intensity}/10...`
        );


        try {

            const formData =
                new FormData();


            formData.append(
                "filename",
                uploadedFilename
            );


            formData.append(
                "blur_type",
                blurType
            );


            formData.append(
                "intensity",
                intensity
            );


            if (
                blurType === "selected"
            ) {

                const imageRect =
                    originalImage.getBoundingClientRect();


                const originalAreas =
                    selectedAreas.map(
                        (area) => {

                            const scaleX =
                                originalImage.naturalWidth /
                                imageRect.width;


                            const scaleY =
                                originalImage.naturalHeight /
                                imageRect.height;


                            return {

                                x: Math.round(
                                    area.x *
                                    scaleX
                                ),

                                y: Math.round(
                                    area.y *
                                    scaleY
                                ),

                                width: Math.round(
                                    area.width *
                                    scaleX
                                ),

                                height: Math.round(
                                    area.height *
                                    scaleY
                                )

                            };

                        }
                    );


                formData.append(
                    "areas",
                    JSON.stringify(
                        originalAreas
                    )
                );

            } else {

                formData.append(
                    "areas",
                    "[]"
                );

            }


            const response =
                await fetch(
                    `${API_URL}/api/blur`,
                    {
                        method: "POST",
                        body: formData
                    }
                );


            if (!response.ok) {

                throw new Error(
                    `Server returned ${response.status}`
                );

            }


            const data =
                await response.json();


            if (!data.success) {

                showMessage(
                    data.message ||
                    "Unable to process image."
                );


                blurBtn.disabled =
                    false;


                updateButtons();


                blurBtn.textContent =
                    oldText;


                return;

            }


            const processedUrl =
                `${API_URL}${data.processed_url}`;


            processedImage.src =
                `${processedUrl}?t=${Date.now()}`;


            processedImage.onload =
                () => {

                    processedImage.style.display =
                        "block";


                    processedPlaceholder.style.display =
                        "none";


                    downloadBtn.href =
                        processedUrl;


                    downloadBtn.download =
                        "blurred-image.jpg";


                    downloadBtn.classList.remove(
                        "hidden"
                    );


                    showMessage(
                        `${data.message} Check the preview before downloading.`
                    );


                    blurBtn.textContent =
                        oldText;


                    updateButtons();

                };


        } catch (error) {

            console.error(
                "Blur error:",
                error
            );


            showMessage(
                "Something went wrong while processing the image."
            );


            blurBtn.textContent =
                oldText;


            updateButtons();

        }

    }
);


// =====================================================
// SELECT AREA BUTTON
// =====================================================

selectModeBtn.addEventListener(
    "click",
    () => {

        if (!uploadedFilename) {

            showMessage(
                "Please upload an image first."
            );

            return;

        }


        if (getBlurType() !== "selected") {

            showMessage(
                "Please select 'Selected Area' mode first."
            );

            return;

        }


        showMessage(
            "Now drag over the image. You can select multiple areas."
        );


        imageContainer.scrollIntoView(
            {
                behavior: "smooth",
                block: "center"
            }
        );

    }
);


// =====================================================
// COMMAND INPUT
// =====================================================

commandInput.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key === "Enter"
        ) {

            event.preventDefault();

            selectModeBtn.click();

        }

    }
);


// =====================================================
// BLUR TYPE LABEL
// =====================================================

function getBlurTypeLabel(
    type
) {

    if (
        type === "background"
    ) {

        return "background";

    }


    if (
        type === "entire"
    ) {

        return "entire image";

    }


    return "selected areas";

}


// =====================================================
// MESSAGE
// =====================================================

function showMessage(
    text
) {

    message.textContent =
        text;

}