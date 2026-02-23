export const fetchAppChannel = async () => {
    const res = await fetch("/api/app-channel");
    if (!res.ok) throw new Error("Failed to fetch app channel.")
    const data = await res.json();
    console.log("app channel: ", data);
    return data;
}
