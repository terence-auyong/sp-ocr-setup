"use client"
import { useState } from 'react';
import AppStepper from '../../components/stepper/AppStepper';
import AddOcrTemplate from '../../components/stepper/steps/AddOcrTemplate';
import StoreChannel from '../../components/stepper/steps/StoreChannel';
import ModuleCode from '../../components/stepper/steps/ModuleCode';
import SetStoreUsageLimits from '../../components/stepper/steps/SetStoreUsageLimits';
import { OcrTemplateProvider } from '../../contexts/OcrTemplateContexts';

const page = () => {
	const [currentStep, setCurrentStep] = useState(1);

	const steps = [
		{ 
			value: 1, 
			content: 
			<AddOcrTemplate 
				setCurrentStep={setCurrentStep} 
				currentStep={currentStep}
				stepsLength={6}
			/>
		},
		{ 
			value: 2, 
			content: 
			<ModuleCode 
				setCurrentStep={setCurrentStep} 
				currentStep={currentStep}
				stepsLength={6}
			/>
		},
		{ 
			value: 3, 
			content: 
			<StoreChannel 
				setCurrentStep={setCurrentStep} 
				currentStep={currentStep}
				stepsLength={6}
			/>
		},
		{ 
			value: 4, 
			content: 
			<SetStoreUsageLimits 
				setCurrentStep={setCurrentStep}
			/>
		}
	];

	return (
		<OcrTemplateProvider>
			<div className='flex justify-center items-center h-screen w-full bg-gray-200'>
				<div className="bg-[#FAFAFA] rounded p-4 h-224 w-320">
					<AppStepper steps={steps} currentStep={currentStep} setCurrentStep={setCurrentStep}/>
				</div>
			</div>
		</OcrTemplateProvider>
	)
}

export default page;