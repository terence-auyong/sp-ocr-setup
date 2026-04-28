interface LoadingModalProps {
    isLoading: boolean;
    setLoading: (loading: boolean) => void;
}

const LoadingModal = ({ isLoading, setLoading }: LoadingModalProps) => {
  return (
    <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 bg-black/30"></div>
        <div className="flex flex-col gap-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded bg-[#F1F1F1] shadow-md p-4 z-10">
            
        </div>
    </div>
  )
}

export default LoadingModal;