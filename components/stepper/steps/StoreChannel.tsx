import { BatchForm } from '@/components/sitegroup-store/BatchForm';
import { BatchTable } from '@/components/sitegroup-store/BatchTable';
import PreviewOcrTemplate from '@/components/PreviewOcrTemlate';
import { useOcrTemplate } from '@/contexts/OcrTemplateContexts';
import { AppChannel, AppStore, SiteGroupRow, OcrTemplateStepsProps } from '@/types/OcrTemplate';
import { useCallback, useState } from 'react'

type BatchFormState = {
    siteGroups: AppChannel[];
    stores: AppStore[];
    maxScan: string;
}

const emptyForm = (): BatchFormState => ({ siteGroups: [], stores: [], maxScan: "" });

type EditFormState = {
    stores: AppStore[];
    maxScan: string;
}

const StoreChannel = ({ setCurrentStep }: OcrTemplateStepsProps) => {
    const { formData, updateFormData } = useOcrTemplate();

    // Both selectionType and rows live in context — survive Previous/Next navigation
    const selectionType = formData.batchSelectionType;
    const setSelectionType = (type: 'siteGroup' | 'store') => {
        updateFormData({ batchSelectionType: type, batches: [] });
        setFormErrors({});
        setEditErrors({});
        setSubmitError('');
        setForm(emptyForm());
        setEditingId(null);
    };

    const rows = formData.batches;
    const setRows = (updater: SiteGroupRow[] | ((prev: SiteGroupRow[]) => SiteGroupRow[])) => {
        const next = typeof updater === 'function' ? updater(formData.batches) : updater;
        updateFormData({ batches: next });
    };

    const [form, setForm] = useState<BatchFormState>(emptyForm());
    const [formErrors, setFormErrors] = useState<Partial<Record<keyof BatchFormState, string>>>({});

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<EditFormState>({ stores: [], maxScan: '' });
    const [editErrors, setEditErrors] = useState<Partial<Record<keyof EditFormState, string>>>({});

    const [submitError, setSubmitError] = useState('');
    const [previewChanges, setPreviewChanges] = useState(false);

    const validateAdd = useCallback((v: BatchFormState): boolean => {
        const e: Partial<Record<keyof BatchFormState, string>> = {};
        if (v.siteGroups.length === 0) e.siteGroups = 'At least one site group is required';
        if (selectionType === 'store' && v.stores.length === 0) e.stores = 'At least one store is required';
        if (!v.maxScan || Number(v.maxScan) < 1) e.maxScan = 'Enter a valid max scan value';
        setFormErrors(e);
        return Object.keys(e).length === 0;
    }, [selectionType]);

    const validateEdit = (v: EditFormState): boolean => {
        const e: Partial<Record<keyof EditFormState, string>> = {};
        if (selectionType === 'store' && v.stores.length === 0) e.stores = 'At least one store is required';
        if (!v.maxScan || Number(v.maxScan) < 1) e.maxScan = 'Enter a valid max scan value';
        setEditErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleAddBatch = () => {
        if (!validateAdd(form)) return;

        const newRows: SiteGroupRow[] = form.siteGroups.map(sg => ({
            id: crypto.randomUUID(),
            siteGroup: sg,
            stores: form.stores.filter(s => s.channel_id === sg.id),
            maxScan: form.maxScan,
        }));

        setRows(prev => [...prev, ...newRows]);
        setForm(emptyForm());
        setFormErrors({});
        setSubmitError("")
    };

    const handleEdit = (id: string) => {
        const row = rows.find(r => r.id === id);
        if (!row) return;
        setEditingId(id);
        setEditForm({ stores: row.stores, maxScan: row.maxScan });
        setEditErrors({});
        setSubmitError("");
    };

    const handleSaveEdit = () => {
        if (!validateEdit(editForm)) return;
        setRows(prev => prev.map(r =>
            r.id === editingId
                ? { ...r, stores: editForm.stores, maxScan: editForm.maxScan }
                : r
        ));
        setEditingId(null);
        setEditForm({ stores: [], maxScan: '' });
        setEditErrors({});
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditForm({ stores: [], maxScan: '' });
        setEditErrors({});
    };

    const handleDelete = (id: string) => {
        if (editingId === id) handleCancelEdit();
        setRows(prev => prev.filter(r => r.id !== id));
    };

    const handleNext = () => {
        if (rows.length === 0) {
            setSubmitError('Add at least one site group before submitting.');
            return;
        }
        setSubmitError('');
        setPreviewChanges(true);
    };

    return (
        <div className="flex flex-col items-center justify-center gap-4 h-208 w-full">
            {previewChanges && (
                <PreviewOcrTemplate
                    onClose={() => setPreviewChanges(false)}
                    setCurrentStep={setCurrentStep}
                />
            )}
            <div className="flex flex-col gap-4 w-full max-w-6xl">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Map Templates</h1>
                </div>

                <div className="flex w-full gap-4">
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
                                value={{
                                    siteGroups: [rows.find(r => r.id === editingId)!.siteGroup],
                                    stores: editForm.stores,
                                    maxScan: editForm.maxScan
                                }}
                                onChange={(v) => setEditForm({ stores: v.stores, maxScan: v.maxScan })}
                                onSubmit={handleSaveEdit}
                                onCancel={handleCancelEdit}
                                selectionType={selectionType}
                                errors={editErrors}
                            />
                        ) : (
                            <BatchForm
                                isEditing={false}
                                value={form}
                                onChange={(newForm) => {
                                    setForm(newForm);
                                    // Clear errors for fields that are now being touched
                                    setFormErrors(prev => ({ ...prev, siteGroups: undefined, stores: undefined, maxScan: undefined }));
                                    setSubmitError("")
                                }}
                                onSubmit={handleAddBatch}
                                selectionType={selectionType}
                                errors={formErrors}
                            />
                        )}

                        {submitError && <p className="text-sm text-red-500 text-right">{submitError}</p>}
                    </div>

                    <div className="flex w-1/2">
                        <div className="space-y-2 w-full">
                            <p>
                                {rows.length} items
                            </p>
                            <BatchTable
                                rows={rows}
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
                        Submit
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StoreChannel;