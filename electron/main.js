const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,     // 允许渲染进程使用 Node.js APIs
            contextIsolation: false,   // 禁用上下文隔离
            webSecurity: false         // 允许读取本地伴生资源
        }
    })

    // 读取解压同目录下的 index.html
    win.loadFile(path.join(__dirname, 'dist', 'index.html'))
}

app.whenReady().then(() => {
    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})
