export const fetchAppStore= async () => {
    const res = await fetch("/api/app-store");
    if (!res.ok) throw new Error("Failed to fetch app store.")
    const data = await res.json();
    console.log("app store: ", data);
    return data;
}
