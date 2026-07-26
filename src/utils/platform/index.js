import { WebPlatform } from './WebPlatform'
import { ElectronPlatform } from './ElectronPlatform'
import { CordovaPlatform } from './CordovaPlatform'

function detectPlatform() {
    if (typeof window !== 'undefined' && !!window.cordova) {
        return new CordovaPlatform()
    }
    if (
        typeof window !== 'undefined' &&
        (!!window.__dirname || (window.process && window.process.versions && window.process.versions.electron))
    ) {
        return new ElectronPlatform()
    }
    // Fallback/standard browser
    return new WebPlatform()
}

export const platform = detectPlatform()
export default platform
