import { action, computed, makeObservable, observable } from 'mobx';
import { digit_scanner_service, VOLATILITY_SYMBOLS, TDigitStats } from '@/services/scanner/digit-scanner-service';
import RootStore from './root-store';

export default class ScannerStore {
    root_store: RootStore;
    is_scanning = false;

    constructor(root_store: RootStore) {
        makeObservable(this, {
            is_scanning: observable,
            startScanning: action,
            stopScanning: action,
            symbol_stats: computed,
        });
        this.root_store = root_store;
    }

    startScanning = () => {
        digit_scanner_service.start();
        this.is_scanning = true;
    };

    stopScanning = () => {
        digit_scanner_service.stop();
        this.is_scanning = false;
    };

    get symbol_stats(): TDigitStats[] {
        return VOLATILITY_SYMBOLS.map(symbol => digit_scanner_service.stats[symbol]);
    }

    getPercentages = (symbol: string) => digit_scanner_service.getDigitPercentages(symbol);
}