import { BatchForm } from '@/components/sitegroup-store/BatchForm';
import { BatchTable } from '@/components/sitegroup-store/BatchTable';
import PreviewOcrTemplate from '@/components/PreviewOcrTemlate';
import { useOcrTemplate } from '@/contexts/OcrTemplateContexts';
import { AppChannel, AppStore, BatchEntry, OcrTemplateStepsProps } from '@/types/OcrTemplate';
import { useCallback, useState } from 'react'

type BatchFormState = {
    siteGroups: AppChannel[];
    stores: AppStore[];
    maxScan: string;
}

const emptyForm = (): BatchFormState => ({ siteGroups: [], stores: [], maxScan: "" });

const StoreChannel = ({ setCurrentStep }: OcrTemplateStepsProps) => {
    const { formData, updateFormData } = useOcrTemplate();

    const selectionType = formData.batchSelectionType;
    const setSelectionType = (type: 'siteGroup' | 'store') => {
        updateFormData({ batchSelectionType: type, batches: [] });
        setFormErrors({});
        setEditErrors({});
        setSubmitError('');
        setForm(emptyForm());
        setEditingId(null);
    };

    // Batches live in context — survive Previous/Next navigation
    const batches = formData.batches;
    const setBatches = (updater: BatchEntry[] | ((prev: BatchEntry[]) => BatchEntry[])) => {
        const next = typeof updater === 'function' ? updater(formData.batches) : updater;
        updateFormData({ batches: next });
    };

    const [form, setForm] = useState<BatchFormState>(emptyForm());
    const [formErrors, setFormErrors] = useState<Partial<Record<keyof BatchFormState, string>>>({});

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<BatchFormState>(emptyForm());
    const [editErrors, setEditErrors] = useState<Partial<Record<keyof BatchFormState, string>>>({});

    const [submitError, setSubmitError] = useState('');
    const [previewChanges, setPreviewChanges] = useState(false);

    // Convert flat form state -> BatchEntry
    // Site Group mode: each site group gets its own group entry (stores filtered by channel_id)
    // Store mode: site groups may repeat across batches — all stores go under one shared group
    //             since stores are already pre-filtered per site group in the form
    const toBatchEntry = (id: string, v: BatchFormState): BatchEntry => ({
        id,
        maxScan: v.maxScan,
        groups: selectionType === 'siteGroup'
            ? v.siteGroups.map(sg => ({
                siteGroup: sg,
                stores: [], // site group mode has no stores
            }))
            : v.siteGroups.map(sg => ({
                siteGroup: sg,
                stores: v.stores.filter(s => s.channel_id === sg.id),
            })),
    });

    // Convert BatchEntry -> flat form state for editing
    const toFormState = (entry: BatchEntry): BatchFormState => ({
        siteGroups: entry.groups.map(g => g.siteGroup),
        stores: entry.groups.flatMap(g => g.stores),
        maxScan: entry.maxScan,
    });

    const validateForm = useCallback((v: BatchFormState, setErrors: (e: Partial<Record<keyof BatchFormState, string>>) => void): boolean => {
        const e: Partial<Record<keyof BatchFormState, string>> = {};
        if (v.siteGroups.length === 0) e.siteGroups = 'At least one site group is required';
        if (selectionType === 'store' && v.stores.length === 0) e.stores = 'At least one store is required';
        if (!v.maxScan || Number(v.maxScan) < 1) e.maxScan = 'Enter a valid max scan value';
        setErrors(e);
        return Object.keys(e).length === 0;
    }, [selectionType]);

    const handleAddBatch = () => {
        if (!validateForm(form, setFormErrors)) return;
        setBatches(prev => [...prev, toBatchEntry(crypto.randomUUID(), form)]);
        setForm(emptyForm());
        setFormErrors({});
        setSubmitError('');
    };

    const handleEdit = (id: string) => {
        const entry = batches.find(b => b.id === id);
        if (!entry) return;
        setEditingId(id);
        setEditForm(toFormState(entry));
        setEditErrors({});
        setSubmitError('');
    };

    const handleSaveEdit = () => {
        if (!validateForm(editForm, setEditErrors)) return;
        setBatches(prev => prev.map(b =>
            b.id === editingId ? toBatchEntry(editingId, editForm) : b
        ));
        setEditingId(null);
        setEditForm(emptyForm());
        setEditErrors({});
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditForm(emptyForm());
        setEditErrors({});
    };

    const handleDelete = (id: string) => {
        if (editingId === id) handleCancelEdit();
        setBatches(prev => prev.filter(b => b.id !== id));
    };

    const handleNext = () => {
        if (batches.length === 0) {
            setSubmitError('Add at least one batch before submitting.');
            return;
        }
        setSubmitError('');
        setPreviewChanges(true);
    };

    return (
        <div className="flex flex-col items-center justify-center gap-4 w-280 h-208">
            {previewChanges && (
                <PreviewOcrTemplate
                    onClose={() => setPreviewChanges(false)}
                    setCurrentStep={setCurrentStep}
                />
            )}
            <div className="w-full flex flex-col gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Map Templates</h1>
                </div>

                <div className="flex gap-4">
                    <div className="w-1/2 flex flex-col gap-8 border-r border-gray-200 pr-4">
                        <div className="flex gap-4 text-sm">
                            {(['siteGroup', 'store'] as const).map(type => (
                                <label key={type} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="selectionType"
                                        checked={selectionType === type}
                                        onChange={() => setSelectionType(type)}
                                        className="accent-blue-500"
                                    />
                                    <span className={`font-medium ${selectionType === type ? 'text-blue-700' : 'text-gray-600'}`}>
                                        {type === 'siteGroup' ? 'Site Group' : 'Store'}
                                    </span>
                                </label>
                            ))}
                        </div>

                        {editingId ? (
                            <BatchForm
                                isEditing={true}
                                value={editForm}
                                onChange={(v) => {
                                    setEditForm(v);
                                    setEditErrors(prev => ({
                                        ...prev,
                                        ...(v.siteGroups.length > 0 && { siteGroups: undefined }),
                                        ...(v.stores.length > 0 && { stores: undefined }),
                                        ...(v.maxScan && Number(v.maxScan) >= 1 && { maxScan: undefined }),
                                    }));
                                }}
                                onSubmit={handleSaveEdit}
                                onCancel={handleCancelEdit}
                                selectionType={selectionType}
                                errors={editErrors}
                                existingRows={batches}
                                editingId={editingId}
                            />
                        ) : (
                            <BatchForm
                                isEditing={false}
                                value={form}
                                onChange={(v) => {
                                    setForm(v);
                                    setFormErrors(prev => ({
                                        ...prev,
                                        ...(v.siteGroups.length > 0 && { siteGroups: undefined }),
                                        ...(v.stores.length > 0 && { stores: undefined }),
                                        ...(v.maxScan && Number(v.maxScan) >= 1 && { maxScan: undefined }),
                                    }));
                                    setSubmitError('');
                                }}
                                onSubmit={handleAddBatch}
                                selectionType={selectionType}
                                errors={formErrors}
                                existingRows={batches}
                                editingId={null}
                            />
                        )}

                        {submitError && <p className="text-sm text-red-500 text-right">{submitError}</p>}
                    </div>

                    <div className="flex w-1/2">
                        <div className="space-y-2 w-full">
                            <p>{batches.length} items</p>
                            <BatchTable
                                batches={batches}
                                selectionType={selectionType}
                                editingId={editingId}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-between pt-2">
                    <button
                        className="px-5 py-2 rounded text-sm bg-gray-200 hover:bg-gray-300 transition-colors font-medium"
                        onClick={() => setCurrentStep(s => Math.max(s - 1, 1))}
                    >
                        Previous
                    </button>
                    <button
                        className="px-6 py-2 rounded text-sm font-semibold text-white bg-blue-300 hover:bg-blue-400 transition-colors shadow-sm"
                        onClick={handleNext}
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StoreChannel;