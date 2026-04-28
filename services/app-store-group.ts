export const fetchAppStoreGroup = async () => {
    const res = await fetch("/api/app-store-group");
    if (!res.ok) throw new Error("Failed to fetch app store group.")
    const data = await res.json();
    return data;
}