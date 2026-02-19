export const isServiceWorkerContext = () => {
    try {
        const SWGS = globalThis?.ServiceWorkerGlobalScope;
        return typeof SWGS !== "undefined" && globalThis instanceof SWGS;
    }
    catch {
        return false;
    }
};
export const isChromeExtensionContext = () => {
    try {
        // eslint-disable-next-line no-undef
        return typeof chrome !== "undefined" && !!chrome?.runtime?.id;
    }
    catch {
        return false;
    }
};
/**
 * Detect the current runtime context.
 *
 * NOTE: In MV3, the background is a Service Worker but still part of the
 * extension runtime. We treat it as "chrome-extension" for API compatibility.
 */
export const detectExecutionContext = () => {
    if (isChromeExtensionContext())
        return "chrome-extension";
    if (isServiceWorkerContext())
        return "service-worker";
    // best-effort heuristic: if we have DOM, call it "main"
    try {
        if (typeof document !== "undefined")
            return "main";
    }
    catch {
        // ignore
    }
    return "unknown";
};
export const supportsDedicatedWorkers = () => {
    if (isServiceWorkerContext())
        return false;
    try {
        return typeof Worker !== "undefined";
    }
    catch {
        return false;
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRW52LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiRW52LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQU1BLE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUFHLEdBQVksRUFBRTtJQUNoRCxJQUFJLENBQUM7UUFDRCxNQUFNLElBQUksR0FBSSxVQUFrQixFQUFFLHdCQUF3QixDQUFDO1FBQzNELE9BQU8sT0FBTyxJQUFJLEtBQUssV0FBVyxJQUFLLFVBQWtCLFlBQVksSUFBSSxDQUFDO0lBQzlFLENBQUM7SUFBQyxNQUFNLENBQUM7UUFDTCxPQUFPLEtBQUssQ0FBQztJQUNqQixDQUFDO0FBQ0wsQ0FBQyxDQUFDO0FBRUYsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQUcsR0FBWSxFQUFFO0lBQ2xELElBQUksQ0FBQztRQUNELG9DQUFvQztRQUNwQyxPQUFPLE9BQU8sTUFBTSxLQUFLLFdBQVcsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxFQUFFLENBQUM7SUFDbEUsQ0FBQztJQUFDLE1BQU0sQ0FBQztRQUNMLE9BQU8sS0FBSyxDQUFDO0lBQ2pCLENBQUM7QUFDTCxDQUFDLENBQUM7QUFFRjs7Ozs7R0FLRztBQUNILE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUFHLEdBQXFCLEVBQUU7SUFDekQsSUFBSSx3QkFBd0IsRUFBRTtRQUFFLE9BQU8sa0JBQWtCLENBQUM7SUFDMUQsSUFBSSxzQkFBc0IsRUFBRTtRQUFFLE9BQU8sZ0JBQWdCLENBQUM7SUFFdEQsd0RBQXdEO0lBQ3hELElBQUksQ0FBQztRQUNELElBQUksT0FBTyxRQUFRLEtBQUssV0FBVztZQUFFLE9BQU8sTUFBTSxDQUFDO0lBQ3ZELENBQUM7SUFBQyxNQUFNLENBQUM7UUFDTCxTQUFTO0lBQ2IsQ0FBQztJQUVELE9BQU8sU0FBUyxDQUFDO0FBQ3JCLENBQUMsQ0FBQztBQUVGLE1BQU0sQ0FBQyxNQUFNLHdCQUF3QixHQUFHLEdBQVksRUFBRTtJQUNsRCxJQUFJLHNCQUFzQixFQUFFO1FBQUUsT0FBTyxLQUFLLENBQUM7SUFDM0MsSUFBSSxDQUFDO1FBQ0QsT0FBTyxPQUFPLE1BQU0sS0FBSyxXQUFXLENBQUM7SUFDekMsQ0FBQztJQUFDLE1BQU0sQ0FBQztRQUNMLE9BQU8sS0FBSyxDQUFDO0lBQ2pCLENBQUM7QUFDTCxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgdHlwZSBFeGVjdXRpb25Db250ZXh0ID1cbiAgICB8IFwibWFpblwiXG4gICAgfCBcInNlcnZpY2Utd29ya2VyXCJcbiAgICB8IFwiY2hyb21lLWV4dGVuc2lvblwiXG4gICAgfCBcInVua25vd25cIjtcblxuZXhwb3J0IGNvbnN0IGlzU2VydmljZVdvcmtlckNvbnRleHQgPSAoKTogYm9vbGVhbiA9PiB7XG4gICAgdHJ5IHtcbiAgICAgICAgY29uc3QgU1dHUyA9IChnbG9iYWxUaGlzIGFzIGFueSk/LlNlcnZpY2VXb3JrZXJHbG9iYWxTY29wZTtcbiAgICAgICAgcmV0dXJuIHR5cGVvZiBTV0dTICE9PSBcInVuZGVmaW5lZFwiICYmIChnbG9iYWxUaGlzIGFzIGFueSkgaW5zdGFuY2VvZiBTV0dTO1xuICAgIH0gY2F0Y2gge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufTtcblxuZXhwb3J0IGNvbnN0IGlzQ2hyb21lRXh0ZW5zaW9uQ29udGV4dCA9ICgpOiBib29sZWFuID0+IHtcbiAgICB0cnkge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tdW5kZWZcbiAgICAgICAgcmV0dXJuIHR5cGVvZiBjaHJvbWUgIT09IFwidW5kZWZpbmVkXCIgJiYgISFjaHJvbWU/LnJ1bnRpbWU/LmlkO1xuICAgIH0gY2F0Y2gge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufTtcblxuLyoqXG4gKiBEZXRlY3QgdGhlIGN1cnJlbnQgcnVudGltZSBjb250ZXh0LlxuICpcbiAqIE5PVEU6IEluIE1WMywgdGhlIGJhY2tncm91bmQgaXMgYSBTZXJ2aWNlIFdvcmtlciBidXQgc3RpbGwgcGFydCBvZiB0aGVcbiAqIGV4dGVuc2lvbiBydW50aW1lLiBXZSB0cmVhdCBpdCBhcyBcImNocm9tZS1leHRlbnNpb25cIiBmb3IgQVBJIGNvbXBhdGliaWxpdHkuXG4gKi9cbmV4cG9ydCBjb25zdCBkZXRlY3RFeGVjdXRpb25Db250ZXh0ID0gKCk6IEV4ZWN1dGlvbkNvbnRleHQgPT4ge1xuICAgIGlmIChpc0Nocm9tZUV4dGVuc2lvbkNvbnRleHQoKSkgcmV0dXJuIFwiY2hyb21lLWV4dGVuc2lvblwiO1xuICAgIGlmIChpc1NlcnZpY2VXb3JrZXJDb250ZXh0KCkpIHJldHVybiBcInNlcnZpY2Utd29ya2VyXCI7XG5cbiAgICAvLyBiZXN0LWVmZm9ydCBoZXVyaXN0aWM6IGlmIHdlIGhhdmUgRE9NLCBjYWxsIGl0IFwibWFpblwiXG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gXCJ1bmRlZmluZWRcIikgcmV0dXJuIFwibWFpblwiO1xuICAgIH0gY2F0Y2gge1xuICAgICAgICAvLyBpZ25vcmVcbiAgICB9XG5cbiAgICByZXR1cm4gXCJ1bmtub3duXCI7XG59O1xuXG5leHBvcnQgY29uc3Qgc3VwcG9ydHNEZWRpY2F0ZWRXb3JrZXJzID0gKCk6IGJvb2xlYW4gPT4ge1xuICAgIGlmIChpc1NlcnZpY2VXb3JrZXJDb250ZXh0KCkpIHJldHVybiBmYWxzZTtcbiAgICB0cnkge1xuICAgICAgICByZXR1cm4gdHlwZW9mIFdvcmtlciAhPT0gXCJ1bmRlZmluZWRcIjtcbiAgICB9IGNhdGNoIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn07XG5cbiJdfQ==