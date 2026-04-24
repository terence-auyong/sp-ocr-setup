'use client';
import { useState } from 'react';
import AddOcrTemplate from '../../components/ocr-template/AddOcrTemplate';
import StoreChannel from '../../components/ocr-template/StoreChannel';
import { OcrTemplateProvider } from '../../contexts/OcrTemplateContexts';

const page = () => {
    const [currentStep, setCurrentStep] = useState(1);

    const steps = [
        {
            id: 1,
            component: (
                <AddOcrTemplate
                    setCurrentStep={setCurrentStep}
                    currentStep={currentStep}
                    stepsLength={6}
                />
            ),
        },
        {
            id: 2,
            component: (
                <StoreChannel
                    setCurrentStep={setCurrentStep}
                    currentStep={currentStep}
                    stepsLength={6}
                />
            ),
        },
    ];

    const activeStep = steps.find((step) => step.id === currentStep);

    return (
        <OcrTemplateProvider>
            <div className="flex justify-center items-center h-screen w-full bg-gray-200">
                <div className="flex justify-center items-center bg-[#FAFAFA] rounded-sm p-4 lg:h-200 lg:w-280 2xl:h-224 2xl:w-320">
                    {activeStep ? (
                        <div key={activeStep.id}>{activeStep.component}</div>
                    ) : (
                        <div>Step not found</div>
                    )}
                </div>
            </div>
        </OcrTemplateProvider>
    );
};

export default page;
