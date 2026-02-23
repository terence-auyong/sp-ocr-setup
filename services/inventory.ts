export const fetchInventoryGroup = async () => {
    const res = await fetch("/api/inventory-group-codes");
    if (!res.ok) throw new Error("Failed to fetch inventory group codes.")
    const data = await res.json();
    return data;
}

export const fetchInventoryArea = async () => {
    const res = await fetch("/api/inventory-group-areas");
    if (!res.ok) throw new Error("Failed to fetch inventory group areas.")
    const data = await res.json();
    console.log("Inventory areas: ", data)
    return data;
}

export const fetchConfigurationPerInv = async () => {
        const res = await fetch("/api/config-per-inv-area");
        if (!res.ok) throw new Error("Failed to fetch configuration per inventory areas.")
        const data = await res.json();
        return data;
}