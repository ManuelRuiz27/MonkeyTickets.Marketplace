const OPENPAY_SCRIPT = 'https://js.openpay.mx/openpay.v1.min.js';
const OPENPAY_DATA_SCRIPT = 'https://js.openpay.mx/openpay-data.v1.min.js';

type OpenpayInstance = NonNullable<typeof window['OpenPay']>;

let openpayLoader: Promise<OpenpayInstance> | null = null;

function injectScript(src: string) {
    return new Promise<HTMLScriptElement>((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
        if (existing) {
            if (existing.dataset.loaded === 'true') {
                resolve(existing);
                return;
            }

            existing.addEventListener('load', () => resolve(existing));
            existing.addEventListener('error', () => reject(new Error(`No se pudo cargar ${src}`)));
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.addEventListener('load', () => {
            script.dataset.loaded = 'true';
            resolve(script);
        });
        script.addEventListener('error', () => reject(new Error(`No se pudo cargar ${src}`)));
        document.body.appendChild(script);
    });
}

export function loadOpenpayScripts(): Promise<OpenpayInstance> {
    if (typeof window === 'undefined') {
        return Promise.reject(new Error('Openpay no está disponible en este entorno'));
    }

    if (window.OpenPay) {
        return Promise.resolve(window.OpenPay);
    }

    if (!openpayLoader) {
        openpayLoader = injectScript(OPENPAY_SCRIPT)
            .then(() => injectScript(OPENPAY_DATA_SCRIPT))
            .then(() => {
                if (!window.OpenPay) {
                    throw new Error('Openpay no se inicializó correctamente');
                }
                return window.OpenPay;
            })
            .catch((error) => {
                openpayLoader = null;
                throw error;
            });
    }

    return openpayLoader;
}
