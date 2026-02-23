export const fetchAppModuleExtended = async () => {
    const res = await fetch("/api/app-module-extended");
    if (!res.ok) throw new Error("Failed to fetch app ocr api.")
    const data = await res.json();
    return data;
}
