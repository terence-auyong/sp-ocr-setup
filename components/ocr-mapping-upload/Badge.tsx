const Badge = ({
    children,
    variant = "default",
}: {
    children: React.ReactNode;
    variant?: "default" | "blue" | "green" | "amber" | "red";
}) => {
    const styles: Record<string, string> = {
        default: "bg-gray-100 text-gray-700",
        blue: "bg-blue-50 text-blue-700",
        green: "bg-green-50 text-green-700",
        amber: "bg-amber-50 text-amber-700",
        red: "bg-red-50 text-red-700",
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[variant]}`}>
            {children}
        </span>
    );
}

export default Badge;