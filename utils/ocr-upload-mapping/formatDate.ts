export const formatDate = (val: any): string | null => {
    if (val === undefined || val === null || String(val).trim() === "") return "";

    // 1. If it's already a JS Date object
    if (val instanceof Date) {
        return val.toISOString().split('T')[0];
    }

    // 2. If it's a Number (Excel Serial)
    const num = Number(val);
    if (!isNaN(num) && typeof val !== 'boolean') {
        const date = new Date(Math.round((num - 25569) * 86400 * 1000));
        return date.toISOString().split('T')[0];
    }

    // 3. If it's a string, validate it strictly
    const dateAttempt = new Date(val);
    if (!isNaN(dateAttempt.getTime())) {
        return dateAttempt.toISOString().split('T')[0];
    }

    return null; 
};