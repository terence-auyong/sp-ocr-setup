type UomOcrPayload = {
    shortName: string;
    ocrCode: string;
};

export const submitUomOcr = async (payload: UomOcrPayload) => {
    const response = await fetch('/api/uom-ocr', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit UOM OCR');
    }

    return response.json();
};