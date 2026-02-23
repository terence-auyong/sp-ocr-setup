"use client"
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
	const router = useRouter();
	const [environment, setEnvironment] = useState("qa");
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		if (!username || !password) {
			setError("Please enter both username and password");
			return;
		}

		setIsLoading(true);

		try {
			const response = await fetch("/api/auth/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ username, password }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Login failed");
			}

			if (data.success && data.accessToken && data.idToken) {
				// Store tokens in localStorage
				localStorage.setItem("accessToken", data.accessToken);
				localStorage.setItem("idToken", data.idToken);
				
				// Redirect to main page or dashboard
				router.push("/");
			} else {
				throw new Error("Invalid response from server");
			}
		} catch (err: any) {
			setError(err.message || "An error occurred during login");
		} finally {
			setIsLoading(false);
		}
	};

  return (
    <div className="min-h-screen bg-gray-300 flex items-center justify-center">
		{/* Login Card */}
		<div className="bg-white w-full max-w-md p-8 rounded shadow-lg">	
			<h1 className="text-2xl font-bold mb-6 text-center">
				Login
			</h1>
			<form onSubmit={handleSubmit} className="space-y-4">
				{error && (
					<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded text-sm">
						{error}
					</div>
				)}

				{/* Environment Dropdown */}
				<div>
					<label className="block text-sm font-medium mb-1">
						Environment
					</label>
					<select
						value={environment}
						onChange={(e) => setEnvironment(e.target.value)}
						className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
						disabled={isLoading}
					>
					<option value="qa">QA</option>
					<option value="dev">Development</option>
					<option value="prod">Production</option>
					</select>
				</div>

				{/* Username */}
				<div>
					<label className="block text-sm font-medium mb-1">
						Username
					</label>
					<input
						type="text"
						value={username}
						onChange={(e) => setUsername(e.target.value)}
						className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
						placeholder="Enter username"
						required
						disabled={isLoading}
					/>
				</div>

				{/* Password */}
				<div>
					<label className="block text-sm font-medium mb-1">
						Password
					</label>
					<input
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
						placeholder="Enter password"
						required
						disabled={isLoading}
					/>
				</div>

				{/* Submit */}
				<button
					type="submit"
					className="w-full bg-blue-300 text-white py-2 rounded font-semibold hover:bg-blue-400 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
					disabled={isLoading}
				>
					{isLoading ? "Signing in..." : "Sign In"}
				</button>
			</form>
		</div>
    </div>
  );
}