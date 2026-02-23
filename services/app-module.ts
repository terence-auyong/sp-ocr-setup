export const fetchAppModule = async () => {
    const res = await fetch("/api/app-module");
    if (!res.ok) throw new Error("Failed to fetch app ocr api.")
    const data = await res.json();
    return data;
}
