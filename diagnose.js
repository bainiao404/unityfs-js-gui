import fs from 'fs';
import { load } from './src/assets/unityfs-js/index.js';
import { processLive2DModel } from './src/assets/unityfs-js/exporters/live2dExporter.js';

async function main() {
    const dir = 'c:\\Users\\Administrator\\Desktop\\BaiNiaoGKD\\appOriginal\\UnityJS-GUI\\src\\assets\\cacheFile';
    const files = fs.readdirSync(dir).map(f => `${dir}\\${f}`);
    
    const managers = [];
    for (const file of files) {
        const data = fs.readFileSync(file);
        const manager = await load(data.buffer);
        if (manager) managers.push(manager);
    }
    
    let modelObjInfo = null;
    let modelManager = null;
    for (const manager of managers) {
        const infos = manager.getObjectInfos();
        for (const info of infos) {
            if (info.getClassName() === 'MonoBehaviour') {
                const fields = info.assetFile.getObjectUsingTreeJSON(info);
                if (fields && (fields._moc !== undefined || fields.m_Moc !== undefined)) {
                    modelObjInfo = info;
                    modelManager = manager;
                    break;
                }
            }
        }
        if (modelObjInfo) break;
    }
    
    if (modelObjInfo) {
        console.log(`Found model: ${modelObjInfo.name}`);
        const result = await processLive2DModel(modelObjInfo, modelManager);
        console.log(`Successfully generated files:`, Object.keys(result.files));
        
        // Print first 20 lines of model3.json
        const model3Filename = Object.keys(result.files).find(f => f.endsWith('.model3.json'));
        if (model3Filename) {
            console.log(`\n${model3Filename} first 20 lines:`);
            console.log(result.files[model3Filename].split('\n').slice(0, 20).join('\n'));
        }
    } else {
        console.error("No CubismModel MonoBehaviour found!");
    }
}

main().catch(err => {
    console.error('Error:', err);
});
