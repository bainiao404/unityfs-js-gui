import { parse } from './src/index.js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const catalogPath = join(__dirname, '..', 'tests', 'samples', 'catalog.json')

const data = readFileSync(catalogPath, 'utf-8')
const catalog = parse(data)
console.log('解析成功!')
console.log('LocatorId:', catalog.LocatorId)
console.log('Resources 数量:', Object.keys(catalog.Resources).length)
let count = 0
for (const [key, locs] of Object.entries(catalog.Resources)) {
    if (typeof key === 'string' && key.endsWith('.bundle') && count < 3) {
        const res = locs[0]
        const obj = res.Data?.Object || res.Data
        console.log('Bundle:', key, 'Crc:', obj?.Crc, 'Hash:', obj?.Hash)
        count++
    }
}
