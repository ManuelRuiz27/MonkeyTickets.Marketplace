import { AsyncLocalStorage } from 'node:async_hooks';
import request from 'request';
import OpenpaySdk from 'openpay';

type RequestModule = typeof request;

const requestModulePath = require.resolve('request');
const originalRequest: RequestModule = request;

export const forwardedForContext = new AsyncLocalStorage<string>();

const patchedRequest: RequestModule = ((options: any, callback: any) => {
    const clientIp = forwardedForContext.getStore();
    const nextOptions = clientIp
        ? {
            ...options,
            headers: {
                ...(options?.headers ?? {}),
                'X-Forwarded-For': clientIp,
            },
        }
        : options;
    return originalRequest(nextOptions, callback);
}) as RequestModule;

Object.assign(patchedRequest, originalRequest);

if (typeof originalRequest.defaults === 'function') {
    patchedRequest.defaults = originalRequest.defaults.bind(originalRequest);
}

const cachedModule = require.cache?.[requestModulePath];
if (cachedModule) {
    cachedModule.exports = patchedRequest;
}
export type OpenpayClient = InstanceType<typeof OpenpaySdk>;
export type OpenpayConstructor = new (merchantId: string, privateKey: string, isProduction?: boolean) => OpenpayClient;

export const Openpay: OpenpayConstructor = OpenpaySdk as OpenpayConstructor;
