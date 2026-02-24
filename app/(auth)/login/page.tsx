"use client"
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { STAGE_COOKIE_NAME, EDTR_STAGES, STAGE_LABELS, type EdtrStage } from "@/lib/edtr-stage-constants";
import { useAuth } from "@/contexts/AuthProvider";

function setStageCookie(stage: EdtrStage) {
	document.cookie = `${STAGE_COOKIE_NAME}=${stage}; path=/; max-age=2592000; samesite=lax`;
}

export default function LoginPage() {
	const { login } = useAuth();
	const router = useRouter();
	const [environment, setEnvironment] = useState<EdtrStage>("qa");
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [isShowPassword, setIsShowPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setStageCookie(environment);
	}, [environment]);

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
				login({ accessToken: data.accessToken, idToken: data.idToken });
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

					<div>
						<label className="block text-sm font-medium mb-1">
							Environment
						</label>
						<select
							value={environment}
							onChange={(e) => {
								const stage = e.target.value as EdtrStage;
								setEnvironment(stage);
								setStageCookie(stage);
							}}
							className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
							disabled={isLoading}
						>
							{EDTR_STAGES.map((stage) => (
								<option key={stage} value={stage}>
									{STAGE_LABELS[stage]}
								</option>
							))}
						</select>
					</div>

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

					<div>
						<div className="flex justify-between items-center mb-1">
							<label className="block text-sm font-medium">
								Password
							</label>
							<button
								type="button"
								className="text-sm text-blue-400 hover:underline"
								onClick={() => setIsShowPassword((prev) => !prev)}
							>
								{isShowPassword ? "Hide" : "Show"}
							</button>
						</div>
						<input
							type={isShowPassword ? "text" : "password"}
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
							placeholder="Enter password"
							required
							disabled={isLoading}
						/>
					</div>

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