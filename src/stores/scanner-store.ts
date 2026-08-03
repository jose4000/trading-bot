import { action, computed, makeObservable, observable } from 'mobx';
import { scanner_engine } from '@/services/scanner/ScannerEngine';
import { VOLATILITY_SYMBOLS, TSymbolAnalysis } from '@/services/scanner/types';
import RootStore from './root-store';

export default class ScannerStore {
    root_store: RootStore;
    is_scanning = false;

    constructor(root_store: RootStore) {
        makeObservable(this, {
            is_scanning: observable,
            startScanning: action,
            stopScanning: action,
            setWindowSize: action,
            symbol_stats: computed,
        });
        this.root_store = root_store;
    }

    startScanning = () => {
        scanner_engine.start();
        this.is_scanning = true;
    };

    stopScanning = () => {
        scanner_engine.stop();
        this.is_scanning = false;
    };

    setWindowSize = (size: number) => {
        scanner_engine.setWindowSize(size);
    };

    getWindowSize = () => scanner_engine.getWindowSize();

    get symbol_stats(): TSymbolAnalysis[] {
        return VOLATILITY_SYMBOLS.map(symbol => scanner_engine.getAnalysis(symbol));
    }

    getAnalysis = (symbol: string): TSymbolAnalysis => scanner_engine.getAnalysis(symbol);

    getPercentages = (symbol: string): number[] => scanner_engine.getAnalysis(symbol).frequency.percentages;
}