# AddressablesToolsJs

[AddressablesToolsPy](https://github.com/anosu/AddressablesToolsPy) 的 JavaScript/Web 移植版本，用于解析 Unity Addressables 目录文件。

**仅实现读取功能**

## 安装

```bash
npm install
```

## 使用方法

### 浏览器 (ES Module)

```html
<script type="module">
    import { parse } from './src/index.js'

    // 解析 JSON 格式的 catalog
    const catalogJson = await fetch('catalog.json').then((r) => r.text())
    const catalog = parse(catalogJson)

    for (const [key, locs] of Object.entries(catalog.Resources)) {
        if (typeof key === 'string' && key.endsWith('.bundle')) {
            const res = locs[0]
            console.log(`Bundle ${key}, Crc: ${res.Data?.Object?.Crc}, Hash: ${res.Data?.Object?.Hash}`)
        }
    }
</script>
```

### Node.js

```javascript
import { parse, parseJson, parseBinary } from './src/index.js'
import { readFileSync } from 'fs'

// JSON 格式
const catalogJson = readFileSync('catalog.json', 'utf-8')
const catalog = parse(catalogJson)

// 或直接解析二进制
const catalogBin = readFileSync('catalog.bin')
const catalog2 = parse(catalogBin)
```

### 演示

1. 启动本地服务器: `npx serve .`
2. 打开 `index.html`，拖放 catalog.json 或 catalog.bin 文件进行解析

## API

- `parse(data)` - 根据数据类型自动选择 JSON 或二进制解析
- `parseJson(data)` - 解析 JSON 字符串
- `parseBinary(data, patcher?, handler?)` - 解析二进制数据，支持自定义 patcher 和 handler
- `AddressablesCatalogFileParser` - 解析器类

## 自定义对象解析

与 Python 版本类似，对于不支持的二进制对象类型，可提供 patcher 和 handler：

```javascript
import { parseBinary } from './src/index.js'
import { SerializedObjectDecoder } from './src/index.js'

function patcher(matchName) {
    if (matchName === 'Custom; System.Int32') return null
    return matchName
}

function handler(reader, offset, isDefault) {
    if (isDefault) return 0
    reader.seek(offset)
    return reader.readInt32()
}

const catalog = parseBinary(binaryData, patcher, handler)
```

## 项目结构

```
AddressablesToolsJs/
├── src/
│   ├── index.js           # 主入口
│   ├── parser.js          # 解析器
│   ├── constants.js       # 常量
│   ├── utils.js           # 工具函数
│   ├── Reader/            # 二进制读取
│   ├── Classes/           # 数据类
│   ├── Catalog/           # 目录相关
│   ├── JSON/              # JSON 数据结构
│   └── Binary/            # 二进制头
├── index.html             # 演示页面
├── package.json
└── README.md
```

## 许可证

MIT (与原 AddressablesToolsPy 保持一致)
