import { useOcrTemplate } from '@/contexts/OcrTemplateContexts';
import { fetchAppChannel } from '@/services/app-channel';
import { fetchAppStore } from '@/services/app-store';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react'

const StoreChannel = ({ setCurrentStep, stepsLength }: OcrTemplateStepsProps) => {
    const { formData, updateFormData } = useOcrTemplate();
    const [showStoreError, setShowStoreError] = useState(false);
    const [showChannelError, setShowChannelError] = useState(false);

    const { data: appStore = [], isLoading: isAppStoreLoading } = useQuery<AppStore[]>({
        queryKey: ['appStore'],
        queryFn: fetchAppStore,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });

    const { data: appChannel = [], isLoading: isAppChannelLoading } = useQuery<AppChannel[]>({
        queryKey: ['appChannel'],
        queryFn: fetchAppChannel,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });

    const handleStoreChange = (id: string) => {
        if (id === "") {
            updateFormData({ store: null });
        } else {
            setShowStoreError(false);
            const selectedStore = appStore.find(store => store.id === Number(id));
            updateFormData({ store: selectedStore || null });
        }
    };

    const handleChannelChange = (id: string) => {
        if (id === "") {
            updateFormData({ channel: null });
        } else {
            setShowChannelError(false);
            const selectedChannel = appChannel.find(channel => channel.id === Number(id));
            updateFormData({ channel: selectedChannel || null });
        }
    };

    const handleNext = () => {
        const canProceed = formData.store || formData.channel;

        if (!canProceed) {
            setShowStoreError(!formData.store);
            setShowChannelError(!formData.channel);
            return;
        }

        setShowStoreError(false);
        setShowChannelError(false);

        setCurrentStep((s) => Math.min(s + 1, stepsLength!));
    };


  return (
    <div className="flex flex-col items-center justify-center gap-4 h-208 w-full rounded">
        <div className="w-120 font-bold">
            <p className="text-xl">Map Templates to Application Modules</p>
        </div>
        <div className="flex flex-col gap-8 w-120 border-t border-b border-gray-300 pb-8 pt-8">
            <div className="flex justify-between">
                <p className="text-lg">Store</p>
                <div className="flex flex-col">
                    <select 
                        className="p-2 w-64 bg-gray-200 rounded"
                        onChange={(e) => handleStoreChange(e.target.value)}
                        value={formData.store?.id ?? ""}
                    >
                        <option value="">Select</option>
                        {appStore.map((store) => (
                            <option key={store.id} value={store.id}>
                                {store.name}
                            </option>
                        ))}
                    </select>
                    {showStoreError && (
                        <div className="flex justify-end mt-1">
                            <span className="text-sm text-red-500">
                                Please select a store
                            </span>
                        </div>
                    )}
                </div>
                
            </div>
            <div className="flex justify-between">
                <p className="text-lg">Channel</p>
                <div className="flex flex-col">
                    <select 
                        className="p-2 w-64 bg-gray-200 rounded"
                        onChange={(e) => handleChannelChange(e.target.value)}
                        value={formData.channel?.id ?? ""}
                    >
                        <option value="">Select</option>
                        {appChannel.map((channel) => (
                            <option key={channel.id} value={channel.id}>
                                {channel.name}
                            </option>
                        ))}
                    </select>
                    {showChannelError && (
                        <div className="flex justify-end mt-1">
                            <span className="text-sm text-red-500">
                                Please select a channel
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
        <div className="flex justify-between w-120 mt-4">
            <button
                className="px-4 py-2 bg-gray-300 rounded"
                onClick={() => setCurrentStep((s) => Math.max(s - 1, 1))}
            >
                Previous
            </button>
            <button
                className="px-4 py-2 bg-blue-300 rounded text-white font-bold"
                onClick={handleNext}
            >
                Next
            </button>
        </div>
    </div>
  )
}

export default StoreChannel;