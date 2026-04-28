export const fetchAppStoreType = async () => {
    const res = await fetch("/api/app-store-type");
    if (!res.ok) throw new Error("Failed to fetch app store type.")
    const data = await res.json();
    return data;
}