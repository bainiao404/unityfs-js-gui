const fs = require('fs-extra')
const path = require('path')

async function main() {
    const srcElectron = path.join(__dirname, '..', 'electron')
    const destApp = path.join(__dirname, '..', 'dist', 'electron', 'resources', 'app')

    console.log('[Build Electron] Copying Electron runner files...')
    await fs.copy(path.join(srcElectron, 'main.js'), path.join(destApp, 'main.js'))
    await fs.copy(path.join(srcElectron, 'package.json'), path.join(destApp, 'package.json'))

    console.log('[Build Electron] Electron app package assembled successfully!')
}

main().catch(err => {
    console.error('[Build Electron] Copy failed:', err.message)
    process.exit(1)
})
