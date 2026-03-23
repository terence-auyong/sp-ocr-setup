import { useState } from "react";
import { LuX } from "react-icons/lu";
import { STAGE_COOKIE_NAME, EDTR_STAGES, STAGE_LABELS, type EdtrStage } from "@/lib/edtr-stage-constants";

type DbCredentialsProps = {
    onClose: () => void;
    onLoginSuccess?: (tokens: { accessToken: string; idToken: string }) => void;
}

function setStageCookie(stage: EdtrStage) {
    document.cookie = `${STAGE_COOKIE_NAME}=${stage}; path=/; max-age=2592000; samesite=lax`;
}

const DbCredentials = ({onClose, onLoginSuccess}: DbCredentialsProps) => {
    const [isShowPassword, setIsShowPassword] = useState(false);
    const [selectedEnv, setSelectEnv] = useState<EdtrStage | "">("");
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
                // Store tokens in localStorage (or you can use a more secure method)
                localStorage.setItem("accessToken", data.accessToken);
                localStorage.setItem("idToken", data.idToken);
                
                // Call success callback if provided
                if (onLoginSuccess) {
                    onLoginSuccess({
                        accessToken: data.accessToken,
                        idToken: data.idToken,
                    });
                }
                
                // Close the popup
                onClose();
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
    <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 bg-black/50"></div>
          <div className="flex flex-col gap-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-[#F1F1F1] shadow-md p-4 z-10">
            <div className="flex justify-between items-center">
                <h1 className="font-bold">
                    LOGIN
                </h1>
                <button 
                    className="p-1 rounded-full hover:bg-gray-300"
                    onClick={onClose}
                    disabled={isLoading}
                >
                    <LuX size={20} color="gray"/>
                </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded text-sm">
                        {error}
                    </div>
                )}
                
                <div className="flex flex-col items-center gap-4 w-full">
                    <div>
                        <p>Environment</p>
                        <select 
                            className="h-8 w-80 bg-gray-200 rounded"
                            value={selectedEnv}
                            onChange={(e) => {
                                const stage = e.target.value as EdtrStage;
                                setSelectEnv(stage);
                                if (stage) setStageCookie(stage);
                            }}
                        >
                            <option value="">Select an option</option>
                            {EDTR_STAGES.map((stage) => (
                                <option key={stage} value={stage}>
                                    {STAGE_LABELS[stage]}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <p>Username</p>
                        <input 
                            className="h-8 w-80 px-2 bg-gray-200 rounded" 
                            type="text" 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <div className="flex justify-between">
                            <p>Password</p>
                            <button 
                                type="button"
                                className="text-sm text-blue-400 hover:underline cursor-pointer"
                                onClick={() => setIsShowPassword(prev => !prev)}
                            >
                                {isShowPassword ? "Hide" : "Show"}
                            </button>
                        </div>
                        <input 
                            className="h-8 w-80 px-2 bg-gray-200 rounded" 
                            type={isShowPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                    </div> 
                </div>
                <div className="flex justify-end">
                    <button 
                        type="submit"
                        className="bg-blue-300 rounded p-1 hover:bg-blue-400 disabled:bg-gray-300 disabled:cursor-not-allowed min-w-[80px]"
                        disabled={isLoading}
                    >
                        {isLoading ? "Loading..." : "Submit"}
                    </button>
                </div>
            </form>
        </div>
    </div>
    
  )
}

export default DbCredentials;