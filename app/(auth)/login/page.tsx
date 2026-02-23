"use client"
import { useState } from "react";

export default function LoginPage() {
	const [environment, setEnvironment] = useState("qa");
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		console.log({ environment, username, password });
	};

  return (
    <div className="min-h-screen bg-gray-300 flex items-center justify-center">
		{/* Login Card */}
		<div className="bg-white w-full max-w-md p-8 rounded shadow-lg">	
			<h1 className="text-2xl font-bold mb-6 text-center">
				Login
			</h1>
			<form onSubmit={handleSubmit} className="space-y-4">
				{/* Environment Dropdown */}
				<div>
					<label className="block text-sm font-medium mb-1">
						Environment
					</label>
					<select
						value={environment}
						onChange={(e) => setEnvironment(e.target.value)}
						className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
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
					/>
				</div>

				{/* Submit */}
				<button
					type="submit"
					className="w-full bg-blue-300 text-white py-2 rounded font-semibold hover:bg-blue-400 transition"
				>
					Sign In
				</button>
			</form>
		</div>
    </div>
  );
}