export const fetchAppOcrApi = async () => {
    const res = await fetch("/api/app-ocr-api");
    if (!res.ok) throw new Error("Failed to fetch app ocr api.")
    const data = await res.json();
    return data;
}
