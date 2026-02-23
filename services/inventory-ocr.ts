type AreaUpdate = {
    areaName: string;
    ocrCode: string;
    ocr_area_status: number
    ocr_code_status: number
};

type InventoryOcrPayload = {
    inventoryGroupCode: string;
    areas: AreaUpdate[];
};

export const submitInventoryOcr = async (payload: InventoryOcrPayload) => {
  const response = await fetch('/api/inventory-ocr', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to submit inventory OCR');
  }

  return response.json();
};