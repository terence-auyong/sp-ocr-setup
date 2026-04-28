export const fetchAppRegion = async () => {
    const res = await fetch("/api/app-region");
    if (!res.ok) throw new Error("Failed to fetch app region.")
    const data = await res.json();
    return data;
}