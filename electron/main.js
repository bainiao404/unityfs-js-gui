const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron')
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

// 注册选择对话框的 IPC 监听
ipcMain.handle('show-open-dialog', async (event, options) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    return await dialog.showOpenDialog(win, options)
})

app.whenReady().then(() => {
    // 隐藏/移除默认的菜单栏
    Menu.setApplicationMenu(null)
    
    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})
