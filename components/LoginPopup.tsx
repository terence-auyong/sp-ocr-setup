import { useState } from "react";
import { LuX } from "react-icons/lu";

type DbCredentialsProps = {
    onClose: () => void;
}

type Environment = "QA" | "Development" | "Production";

const DbCredentials = ({onClose}: DbCredentialsProps) => {
    const [isShowPassword, setIsShowPassword] = useState(false);
    const [selectedEnv, setSelectEnv] = useState<Environment | string>("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const environment= [
        {id: 1, name: "QA" },
        {id: 2, name: "Development"},
        {id: 3, name: "Production"}
    ];

  return (
    <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 bg-black/50"></div>
          <div className="flex flex-col gap-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded bg-[#F1F1F1] shadow-md p-4 z-10">
            <div className="flex justify-between items-center">
                <h1 className="font-bold">
                    LOGIN
                </h1>
                <button 
                    className="p-1 rounded-full hover:bg-gray-300"
                    onClick={onClose}
                >
                    <LuX size={20} color="gray"/>
                </button>
            </div>
            
            <div className="flex flex-col items-center gap-4 w-full">
                <div>
                    <p>Environment</p>
                    <select 
                        className="h-8 w-80 bg-gray-200 rounded"
                        onChange={(e) => setSelectEnv(e.target.value)}
                    >
                        <option value="">Select an option</option>
                        {environment.map((env) => (
                            <option key={env.id} value={env.name}>
                                {env.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <p>Username</p>
                    <input 
                        className="h-8 w-80 px-2 bg-gray-200 rounded" 
                        type="text" 
                        onChange={(e) => setUsername(e.target.value)}
                    />
                </div>
                <div>
                    <div className="flex justify-between">
                        <p>Password</p>
                        <button 
                            className="text-sm text-blue-400 hover:underline cursor-pointer"
                            onClick={() => setIsShowPassword(prev => !prev)}
                        >
                            {isShowPassword ? "Hide" : "Show"}
                        </button>
                    </div>
                    <input 
                        className="h-8 w-80 px-2 bg-gray-200 rounded" 
                        type={isShowPassword ? "text" : "password"}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div> 
            </div>
            <div className="flex justify-end">
                <button className="bg-blue-300 rounded p-1 hover:bg-blue-400">
                    Submit
                </button>
            </div>
        </div>
    </div>
    
  )
}

export default DbCredentials;