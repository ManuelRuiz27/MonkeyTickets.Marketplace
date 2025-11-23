import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';

export function EventPdfTemplate() {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const [file, setFile] = useState<File | null>(null);
    const [fileType, setFileType] = useState<'pdf' | 'image' | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [coordinates, setCoordinates] = useState({
        qrCodeX: 400,
        qrCodeY: 100,
        qrCodeWidth: 150,
    });
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const [dragPosition, setDragPosition] = useState({ x: 400, y: 100 });
    const [isDragging, setIsDragging] = useState(false);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

        if (validTypes.includes(selectedFile.type)) {
            setFile(selectedFile);
            setPreviewUrl(URL.createObjectURL(selectedFile));

            // Determine file type
            if (selectedFile.type === 'application/pdf') {
                setFileType('pdf');
            } else {
                setFileType('image');
            }

            setError('');
        } else {
            setError('Por favor selecciona un archivo PDF, JPG o PNG');
        }
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Check if click is near the QR placeholder
        const qrX = dragPosition.x;
        const qrY = dragPosition.y;

        // Scale QR size to preview
        const container = previewContainerRef.current;
        if (!container) return;

        const scaleX = container.clientWidth / 595;
        const scaleY = container.clientHeight / 842;
        const displayQrSize = coordinates.qrCodeWidth * Math.min(scaleX, scaleY);

        if (x >= qrX && x <= qrX + displayQrSize && y >= qrY && y <= qrY + displayQrSize) {
            setIsDragging(true);
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDragging) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

        setDragPosition({ x, y });
    };

    const handleMouseUp = () => {
        if (isDragging) {
            // Convert display coordinates to PDF points
            const container = previewContainerRef.current;
            if (container) {
                // Get scale factors
                const scaleX = 595 / container.clientWidth;
                const scaleY = 842 / container.clientHeight;

                const pdfX = Math.round(dragPosition.x * scaleX);
                // PDF coordinates start from bottom-left, we need to flip Y
                const pdfY = Math.round(842 - (dragPosition.y * scaleY) - coordinates.qrCodeWidth);

                setCoordinates({
                    ...coordinates,
                    qrCodeX: Math.max(0, Math.min(pdfX, 595 - coordinates.qrCodeWidth)),
                    qrCodeY: Math.max(0, Math.min(pdfY, 842 - coordinates.qrCodeWidth)),
                });
            }
            setIsDragging(false);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setError('Selecciona un archivo primero');
            return;
        }

        setUploading(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('qrCodeX', coordinates.qrCodeX.toString());
            formData.append('qrCodeY', coordinates.qrCodeY.toString());
            formData.append('qrCodeWidth', coordinates.qrCodeWidth.toString());

            await apiClient.uploadPdfTemplate(eventId!, formData);
            setSuccess(true);
            setTimeout(() => navigate('/organizer/dashboard'), 2000);
        } catch (err: any) {
            setError(err.message || 'Error al subir la plantilla');
        } finally {
            setUploading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-xl shadow-lg text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold mb-2">¡Plantilla Guardada!</h2>
                    <p className="text-gray-600">Redirigiendo al dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="container mx-auto px-4 max-w-6xl">
                <button
                    onClick={() => navigate(-1)}
                    className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Volver
                </button>

                <h1 className="text-3xl font-bold mb-2">Personalizar Plantilla de Boletos</h1>
                <p className="text-gray-600 mb-8">
                    Sube tu diseño de boleto (PDF, JPG o PNG) y arrastra el cuadro rojo para posicionar el código QR
                </p>

                {error && (
                    <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Upload Section */}
                    <div className="bg-white p-6 rounded-xl shadow-sm">
                        <h2 className="text-xl font-bold mb-4">1. Subir Plantilla</h2>

                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
                            <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={handleFileSelect}
                                className="hidden"
                                id="pdf-upload"
                            />
                            <label
                                htmlFor="pdf-upload"
                                className="cursor-pointer flex flex-col items-center"
                            >
                                <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                <p className="text-sm font-medium text-gray-700">
                                    {file ? file.name : 'Click para seleccionar diseño'}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Máximo 10MB
                                </p>
                            </label>
                        </div>

                        <h2 className="text-xl font-bold mb-4">2. Configurar Código QR</h2>

                        <div className="space-y-4">
                            {/* QR Size Slider */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tamaño del QR (puntos)
                                </label>
                                <input
                                    type="range"
                                    min="50"
                                    max="300"
                                    value={coordinates.qrCodeWidth}
                                    onChange={(e) => setCoordinates({ ...coordinates, qrCodeWidth: +e.target.value })}
                                    className="w-full"
                                />
                                <p className="text-sm text-gray-500 mt-1">{coordinates.qrCodeWidth} puntos</p>
                            </div>

                            {/* Manual Inputs */}
                            <div className="border-t pt-4">
                                <p className="text-sm font-medium text-gray-700 mb-3">Ajuste Manual</p>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">
                                            Coordenada X
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="595"
                                            value={coordinates.qrCodeX}
                                            onChange={(e) => setCoordinates({ ...coordinates, qrCodeX: +e.target.value })}
                                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">
                                            Coordenada Y
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="842"
                                            value={coordinates.qrCodeY}
                                            onChange={(e) => setCoordinates({ ...coordinates, qrCodeY: +e.target.value })}
                                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">
                                            Tamaño QR
                                        </label>
                                        <input
                                            type="number"
                                            min="50"
                                            max="300"
                                            value={coordinates.qrCodeWidth}
                                            onChange={(e) => setCoordinates({ ...coordinates, qrCodeWidth: +e.target.value })}
                                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    💡 Arrastra el QR en la vista previa o ajusta manualmente
                                </p>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-sm font-medium text-gray-700 mb-2">Coordenadas Actuales:</p>
                                <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                                    <div>X: {coordinates.qrCodeX}</div>
                                    <div>Y: {coordinates.qrCodeY}</div>
                                    <div>Tamaño: {coordinates.qrCodeWidth}</div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleUpload}
                            disabled={!file || uploading}
                            className="w-full mt-6 bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {uploading ? 'Subiendo...' : 'Guardar Plantilla'}
                        </button>
                    </div>

                    {/* Preview Section */}
                    <div className="bg-white p-6 rounded-xl shadow-sm">
                        <h2 className="text-xl font-bold mb-4">Vista Previa</h2>
                        <p className="text-sm text-gray-600 mb-4">
                            Arrastra el cuadro rojo para posicionar el código QR
                        </p>

                        {previewUrl ? (
                            <div
                                ref={previewContainerRef}
                                className="relative border border-gray-200 rounded-lg overflow-hidden bg-gray-100"
                                style={{ aspectRatio: '595 / 842' }}
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                            >
                                {fileType === 'image' ? (
                                    <img
                                        src={previewUrl}
                                        alt="Template preview"
                                        className="w-full h-full object-contain pointer-events-none"
                                    />
                                ) : (
                                    <iframe
                                        src={previewUrl}
                                        className="w-full h-full pointer-events-none"
                                        title="PDF Preview"
                                    />
                                )}

                                {/* QR Placeholder Overlay */}
                                <div
                                    className={`absolute border-4 ${isDragging ? 'border-red-600' : 'border-red-500'} bg-red-500 bg-opacity-30 cursor-move transition-colors`}
                                    style={{
                                        left: `${dragPosition.x}px`,
                                        top: `${dragPosition.y}px`,
                                        width: `${coordinates.qrCodeWidth * (previewContainerRef.current?.clientWidth || 595) / 595}px`,
                                        height: `${coordinates.qrCodeWidth * (previewContainerRef.current?.clientHeight || 842) / 842}px`,
                                    }}
                                >
                                    <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-red-700">
                                        QR
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="border-2 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center text-gray-400">
                                <div className="text-center">
                                    <svg className="w-16 h-16 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p>Selecciona un archivo para ver la vista previa</p>
                                    <p className="text-sm mt-1">PDF, JPG o PNG</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
