import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

interface QRScannerProps {
    onScan: (result: string) => void;
    disabled?: boolean;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan, disabled = false }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState<string>('');
    const [isScanning, setIsScanning] = useState(false);
    const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

    useEffect(() => {
        if (!videoRef.current) return;

        if (disabled) {
            codeReaderRef.current?.reset();
            setIsScanning(false);
            return;
        }

        const codeReader = new BrowserMultiFormatReader();
        codeReaderRef.current = codeReader;
        setIsScanning(true);

        const startScanning = async () => {
            try {
                const videoInputDevices = await codeReader.listVideoInputDevices();

                if (videoInputDevices.length === 0) {
                    setError('No camera found');
                    return;
                }

                // Prefer back camera on mobile
                const selectedDevice = videoInputDevices.find(device =>
                    device.label.toLowerCase().includes('back')
                ) || videoInputDevices[0];

                await codeReader.decodeFromVideoDevice(
                    selectedDevice.deviceId,
                    videoRef.current!,
                    (result, err) => {
                        if (result) {
                            const text = result.getText();
                            if (text) {
                                onScan(text);
                            }
                        }
                        if (err && !(err instanceof NotFoundException)) {
                            console.error('Scanner error:', err);
                        }
                    }
                );
            } catch (err) {
                console.error('Camera initialization error:', err);
                setError('Camera access denied. Please allow camera permissions.');
            }
        };

        startScanning();

        return () => {
            codeReader.reset();
            setIsScanning(false);
        };
    }, [onScan, disabled]);

    return (
        <div className="qr-scanner">
            <div className="scanner-container">
                <video
                    ref={videoRef}
                    className="scanner-video"
                    playsInline
                />
                <div className="scanner-overlay">
                    <div className="scanner-frame"></div>
                </div>
            </div>
            {error && (
                <div className="scanner-error">
                    <p>{error}</p>
                </div>
            )}
            {isScanning && !error && !disabled && (
                <div className="scanner-status">
                    <div className="pulse"></div>
                    <span>Scanning for QR codes...</span>
                </div>
            )}
            {!error && disabled && (
                <div className="scanner-status paused">
                    <div className="pulse paused"></div>
                    <span>Camera paused</span>
                </div>
            )}
        </div>
    );
};

export default QRScanner;
