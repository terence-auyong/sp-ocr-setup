export const fetchAppStoreChannel = async () => {
    const res = await fetch("/api/app-store-channel");
    if (!res.ok) throw new Error("Failed to fetch app store channel.")
    const data = await res.json();
    return data;
}