export const fetchUom = async () => {
    const res = await fetch("/api/uom");
    if (!res.ok) throw new Error("Failed to fetch inventory group areas.")
    const data = await res.json();
    return data;
}