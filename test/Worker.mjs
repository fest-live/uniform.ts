//
let ctx = {}, utils = {};
//export const $importContext$ = (U)=>({ctx, utils} = U);
export const $importContext$ = Promise.withResolvers();
export const $importUtils$ = Promise.withResolvers();

// after sync you can register
export class TestClass {
    //clips: number;
    constructor() {
        console.log("Chips");
        this.clips = 0;
    }
    static get lab() {
        return 5;
    }
    callback(n = 0) {
        console.log("Crispy:" + (this.clips + n));
    }
}

// after, prefers sync with receiver
export const regrets = new ArrayBuffer(64);
export const workerAction = async ()=>{
    const {transferCheck} = await $importContext$.promise;
    const {transfer} = await $importUtils$.promise;

    // (sending as argument, unusual here)
    const bravery = new ArrayBuffer(64);

    //\
    await (transferCheck?.(await transfer(bravery)));

    // should to be detached
    console.warn(bravery);
}
