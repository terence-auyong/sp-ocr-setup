import OcrExcelUploader from "@/components/ocr-mapping-upload/OcrExcelUploader";

export default function OcrMappingUploadPage() {
    return (
        <main>
            <OcrExcelUploader apiUrl="/api/ocr-upload" />
        </main>
    );
}