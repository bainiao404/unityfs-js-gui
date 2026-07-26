var SimpleSpine = {}
/**
 * Spine 版本映射配置
 * 用于定义原始版本、目标解析版本以及转换处理器
 * @type {Object.<number, {target: string, handler: string|null}>}
 */
SimpleSpine.versionMap = {
    20: { target: '38', handler: 'readSkeletonData21' },
    21: { target: '38', handler: 'readSkeletonData21' },
    34: { target: '38', handler: 'readSkeletonData34And35' },
    35: { target: '38', handler: 'readSkeletonData34And35' },
    36: { target: '38', handler: 'readSkeletonData36And37' },
    37: { target: '38', handler: 'readSkeletonData36And37' },
    38: { target: '38', handler: null },
    40: { target: '40', handler: null },
    41: { target: '41', handler: null },
    42: { target: '42', handler: null },
}

/**
 * 主加载入口：异步加载并处理 Spine 资源
 * @param {string|Object} src - 资源地址或资源配置对象
 * @param {Object} [options={}] - 加载配置
 * @param {string} [options.atlasPath] - 强制指定 atlas 文件路径
 * @param {string} [options.texturePath] - 强制指定纹理目录路径
 * @param {Function} [options.onProgress] - 加载进度回调
 * @returns {Promise<Object>} 返回包含解析后的 spine 对象和相关元数据
 */
SimpleSpine.load = async function (src, options = {}) {
    const srcs = this.getSpineSrc(src, options)
    const skelFileType = srcs.type === 'skel' ? 'arraybuffer' : 'text'

    try {
        const [skelRes, atlasRes] = await Promise.all([
            this.loadFile(srcs.path[0], skelFileType),
            this.loadFile(srcs.atlasPath || srcs.path[1], 'text'),
        ])

        const textureData = this.prepareTextureData(atlasRes.data, srcs.texturePath || srcs.path[2])

        const version = this.detectSpineVersion({
            data: skelRes.data,
            type: srcs.type,
            fallbackVersion: srcs.version,
        })

        if (!version) throw new Error('未知版本号或者非spine文件')

        const processedData = await this.processSpineData({
            version,
            skelData: skelRes.data,
            atlasData: atlasRes.data,
            textureData,
            fileType: srcs.type,
        })

        return { ...processedData, info: srcs }
    } catch (error) {
        console.error('加载Spine资源失败:', error)
        throw error
    }
}

/**
 * 实例化 Spine 对象并附加调试渲染器
 * @param {Object} spineData - 由 load 方法返回的已处理数据对象
 * @returns {Object} 包含 { spine: PIXI.spine.Spine, debug: SpineDebugRenderer, setDebug: Function }
 */
SimpleSpine.spine = function (spineData) {
    const isV42 = spineData.version == 42
    const sdk = isV42 ? PIXI.spine.spine42 : PIXI.spine

    const spine = isV42 ? new sdk.Spine({ skeletonData: spineData.spine }) : new sdk.Spine(spineData.spine)

    const debug = new sdk.SpineDebugRenderer()

    return {
        spine,
        debug,
        setDebug: function () {
            this.spine.debug = this.debug
        },
    }
}

/**
 * 数据预处理：执行版本检测、格式转换（skel -> json）以及跨版本兼容处理
 * @param {Object} params
 * @param {string} params.version - 检测到的版本号
 * @param {ArrayBuffer|string} params.skelData - 原始骨骼数据
 * @param {string} params.atlasData - Atlas 文本内容
 * @param {Object|Array} params.textureData - 纹理相关信息
 * @param {string} params.fileType - 文件类型 ('skel' | 'json')
 * @returns {Promise<Object>}
 */
SimpleSpine.processSpineData = async function (params) {
    const { version, skelData, atlasData, textureData } = params
    const config = this.versionMap[version]
    if (!config) throw new Error(`不受支持的spine版本: ${version}`)

    let skeletonData = skelData
    let originalSpine = null

    const checkType = (val) => {
        if (val instanceof ArrayBuffer) return 'skel'
        if (typeof val === 'string') return 'json'
        return 'obj'
    }

    if (config.handler && this.skelToJson) {
        let currentType = checkType(skeletonData)
        if (currentType === 'skel') {
            skeletonData = this.skelToJson[config.handler](skelData)
        }

        currentType = checkType(skeletonData)
        if (currentType === 'json') {
            skeletonData = JSON.parse(skeletonData)
        }

        if (checkType(skeletonData) === 'obj') {
            originalSpine = skeletonData
            skeletonData = this.skelToJson.spine36To38(skeletonData)
        }
    }

    return this.readSpineSpineData({
        version: config.target,
        type: checkType(skeletonData),
        skeletonData,
        atlasData,
        textureData: Array.isArray(textureData) ? textureData : [textureData],
        originalSpine,
    })
}

/**
 * 核心解析方法：绑定纹理并调用对应版本的 Spine SDK 进行解析
 * @param {Object} config
 * @param {string} config.version - 目标 SDK 版本
 * @param {string} config.type - 数据格式 ('skel' | 'json' | 'obj')
 * @param {any} config.skeletonData - 处理后的骨架数据
 * @param {string} config.atlasData - 图集文本数据
 * @param {Array} config.textureData - 纹理对象列表
 * @returns {Promise<Object>} 包含最终生成的 skeletonData 和控制方法
 */
SimpleSpine.readSpineSpineData = async function (config) {
    const { version, type, skeletonData, atlasData, textureData, originalSpine } = config
    const spineSdk = PIXI.spine[`spine${version}`]

    // 建立纹理索引 Map，优化查询效率
    const atlasInfoList = this.getTextureAtlasInfo(atlasData)
    const atlasInfoMap = new Map(atlasInfoList.map((item) => [item.name, item]))

    // 1. 准备所有 BaseTexture
    await Promise.all(
        textureData.map(async (tex) => {
            if (!tex.name.includes('.')) tex.name += '.png'
            const info = atlasInfoMap.get(tex.name)
            if (!info) return

            // 加载 BaseTexture
            if (tex.src) {
                tex.texture = await this._loadBaseTexture(tex.src)
            } else if (tex.data) {
                let buffer = tex.data
                if (tex.width !== info.width || tex.height !== info.height) {
                    if (this.isPremultipliedAlpha(buffer)) {
                        tex.texture.isPremultipliedToStraight = true
                        buffer = this.premultipliedToStraight(buffer)
                    }
                    buffer = this.resizeRgbaBuffer(buffer, tex.width, tex.height, info.width, info.height)
                }
                tex.texture = PIXI.BaseTexture.fromBuffer(buffer, info.width, info.height)
            }

            // 强行校正尺寸以匹配 atlas 定义
            if (tex.texture && (tex.texture.width !== info.width || tex.texture.height !== info.height)) {
                tex.texture.setSize(info.width, info.height)
            }
        }),
    )

    // 2. 创建 TextureAtlas
    let spineAtlas
    if (parseInt(version) < 42) {
        spineAtlas = new PIXI.spine.TextureAtlas(atlasData, (line, callback) => {
            const found = textureData.find((t) => t.name === line)
            callback(found ? found.texture : null)
        })
    } else {
        spineAtlas = new spineSdk.TextureAtlas(atlasData)
        for (const page of spineAtlas.pages) {
            const found = textureData.find((t) => t.name === page.name)
            if (found) page.setTexture(spineSdk.SpineTexture.from(found.texture))
        }
    }

    // 3. 解析骨架数据
    const attachmentLoader = new spineSdk.AtlasAttachmentLoader(spineAtlas)
    let parser,
        finalData = skeletonData

    if (type === 'skel') {
        parser = new spineSdk.SkeletonBinary(attachmentLoader)
        finalData = new Uint8Array(skeletonData)
    } else {
        parser = new spineSdk.SkeletonJson(attachmentLoader)
        if (typeof skeletonData === 'string') finalData = JSON.parse(skeletonData)
    }

    const spineResult = {
        spine: parser.readSkeletonData ? parser.readSkeletonData(finalData) : parser.SkeletonData(finalData),
        atlas: attachmentLoader,
        texture: textureData.map((t) => t.texture).filter(Boolean),
        originalSpine,
        version,
        setPremultiplied: function (isP) {
            //如果内部已经进行过转换，则跳过
            const needsP = isP || SimpleSpine.isPremultiplied(this.texture[0])
            this.texture.forEach((t) => {
                if (t.isPremultipliedToStraight) return
                t.isPremultipliedToStraight = true
                t.alphaMode = needsP ? PIXI.ALPHA_MODES.PREMULTIPLIED_ALPHA : PIXI.ALPHA_MODES.NO_PREMULTIPLIED_ALPHA
            })
        },
    }

    return spineResult
}

/**
 * 内部辅助：Promise 化的 BaseTexture 加载器
 * @private
 * @param {string} url - 图片地址
 * @returns {Promise<PIXI.BaseTexture>}
 */
SimpleSpine._loadBaseTexture = function (url) {
    return new Promise((resolve, reject) => {
        const bt = PIXI.BaseTexture.from(url)
        if (bt.valid) return resolve(bt)
        bt.once('loaded', () => resolve(bt))
        bt.once('error', () => reject(new Error(`纹理加载失败: ${url}`)))
    })
}

/**
 * 基于 XMLHttpRequest 加载文件
 * @param {string} url - 目标 URL
 * @param {string} [responseType='text'] - 响应类型 (text, arraybuffer等)
 * @param {Object} [options] - 包含 onProgress 回调
 * @returns {Promise<{data: any, status: number}>}
 */
SimpleSpine.loadFile = function (url, responseType = 'text', options = {}) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('GET', url, true)
        xhr.responseType = responseType
        xhr.onload = () => {
            if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 0) {
                resolve({ data: xhr.response, status: xhr.status })
            } else {
                reject(new Error(`HTTP ${xhr.status} : ${url}`))
            }
        }
        if (options.onProgress) {
            xhr.onprogress = (e) => {
                if (e.lengthComputable) options.onProgress(Math.round((e.loaded / e.total) * 100))
            }
        }
        xhr.onerror = () => reject(new Error('网络错误'))
        xhr.send()
    })
}

/**
 * 解析 Atlas 文本，获取纹理文件名及其定义的原始尺寸
 * @param {string} atlasData - Atlas 字符串内容
 * @returns {Array<{name: string, width: number, height: number}>}
 */
SimpleSpine.getTextureAtlasInfo = function (atlasData) {
    const lines = atlasData.split(/\r?\n/)
    const list = []
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (line.toLowerCase().endsWith('.png')) {
            const sizeLine = lines[i + 1] || ''
            const sizeMatch = sizeLine.match(/size\s*:\s*(\d+)\s*,\s*(\d+)/)
            list.push({
                name: line,
                width: sizeMatch ? parseInt(sizeMatch[1]) : 0,
                height: sizeMatch ? parseInt(sizeMatch[2]) : 0,
            })
        }
    }
    return list
}

/**
 * 解析输入路径，提取骨骼、图集和纹理的完整访问路径
 * @param {string|Object} src - 原始输入
 * @param {Object} options - 外部配置项
 * @returns {Object} 包含 type, path, atlasPath, texturePath
 */
SimpleSpine.getSpineSrc = function (src, options = {}) {
    if (!src) throw new Error('地址不存在')

    if (typeof src === 'string') {
        const isSkel = src.endsWith('.skel')
        if (!isSkel && !src.endsWith('.json')) throw new Error(`格式不支持: ${src}`)

        return {
            type: isSkel ? 'skel' : 'json',
            path: [
                src,
                options.atlasPath || src.replace(/\.(skel|json)$/, '.atlas'),
                options.texturePath || this.getFileDirectory(src),
            ],
            atlasPath: options.atlasPath,
            texturePath: options.texturePath,
        }
    }
    return {
        ...src,
        atlasPath: options.atlasPath || src.atlasPath || src.path[1],
        texturePath: options.texturePath || src.texturePath || src.path[2] || this.getFileDirectory(src.path[0]),
    }
}

SimpleSpine.prepareTextureData = function (atlasData, textureBasePath) {
    return this.getTextureAtlasInfo(atlasData).map((item) => ({
        name: item.name,
        src: textureBasePath + item.name,
    }))
}

/**
 * 从二进制或 JSON 数据中自动识别 Spine 编辑器版本
 * @param {Object} param
 * @param {ArrayBuffer|string} param.data - 文件数据
 * @param {string} param.type - 'skel' 或 'json'
 * @param {string} [param.fallbackVersion] - 识别失败时的回退版本
 * @returns {string|null} 版本号字符串 (如 "38")
 */
SimpleSpine.detectSpineVersion = function ({ data, type, fallbackVersion }) {
    let versionStr = ''
    if (type === 'skel') {
        versionStr = this.uint8ArrayToString(new Uint8Array(data).slice(0, 40))
    } else {
        try {
            versionStr = JSON.parse(data)
        } catch {}
    }
    return this.isVersion(versionStr) || fallbackVersion
}

SimpleSpine.isPremultiplied = function (baseTexture) {
    if (Array.isArray(baseTexture)) {
        baseTexture = baseTexture[0]
    }
    if (baseTexture.texture) {
        baseTexture = baseTexture.texture
    }
    if (baseTexture.resource.source) {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d', { premultiplyAlpha: 'none' })
        canvas.width = baseTexture.width
        canvas.height = baseTexture.height
        ctx.drawImage(baseTexture.resource.source, 0, 0)

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data

        return this.isPremultipliedAlpha(data, 20)
    } else {
        return this.isPremultipliedAlpha(baseTexture.resource.data, 20)
    }
}

/**
 * 判断rgba数组是否为预乘
 * @param {*} imageData
 * @param {*} tolerance
 * @returns
 */
SimpleSpine.isPremultipliedAlpha = function (imageData, tolerance = 10) {
    for (let i = 0; i < imageData.length; i += 4) {
        const red = imageData[i]
        const green = imageData[i + 1]
        const blue = imageData[i + 2]
        const alpha = imageData[i + 3] + tolerance

        if (red > alpha || green > alpha || blue > alpha) {
            return false // 如果有任何一个像素的RGB值大于Alpha值，则不是预乘纹理
        }
    }
    return true // 所有像素的RGB值都小于等于Alpha值，是预乘纹理
}

SimpleSpine.getFileDirectory = function (src) {
    // 处理空值或非法输入
    if (typeof src !== 'string' || !src) return ''

    // 标准化路径分隔符（兼容Windows和Unix）
    const normalizedPath = src.replace(/\\/g, '/')

    // 提取目录部分（通过最后一个'/'分割）
    const lastSlashIndex = normalizedPath.lastIndexOf('/')
    if (lastSlashIndex === -1) return '' // 无目录结构

    return normalizedPath.substring(0, lastSlashIndex + 1)
}
/**
 * 图像重采样：将 RGBA Buffer 调整为目标尺寸
 * 用于解决实际纹理尺寸与 Atlas 定义尺寸不一致的问题
 * @param {Uint8Array} buffer - 原始 RGBA 数据
 * @param {number} oldW - 原宽
 * @param {number} oldH - 原高
 * @param {number} newW - 新宽
 * @param {number} newH - 新高
 * @returns {Uint8Array}
 */
SimpleSpine.resizeRgbaBuffer = function (buffer, oldW, oldH, newW, newH) {
    const newBuffer = new Uint8Array(newW * newH * 4)
    // 使用双线性插值算法重采样（示例伪代码）
    for (let y = 0; y < newH; y++) {
        for (let x = 0; x < newW; x++) {
            const srcX = Math.floor(x * (oldW / newW))
            const srcY = Math.floor(y * (oldH / newH))
            const srcIdx = (srcY * oldW + srcX) * 4
            const dstIdx = (y * newW + x) * 4
            // RGBA通道复制
            newBuffer.set(buffer.subarray(srcIdx, srcIdx + 4), dstIdx)
        }
    }
    return newBuffer
}

// 预计算查找表：将除法转为乘法
SimpleSpine.INV_ALPHA_TABLE = (() => {
    const INV_ALPHA_TABLE = new Float32Array(256)
    for (let i = 1; i < 256; i++) {
        INV_ALPHA_TABLE[i] = 255 / i
    }
    INV_ALPHA_TABLE[0] = 0
    return INV_ALPHA_TABLE
})()

SimpleSpine.premultipliedToStraight = function (rgbaArray) {
    const len = rgbaArray.length
    // 使用 Uint8ClampedArray 自动处理 Math.round 和 Math.min(255)
    const result = new Uint8ClampedArray(len)

    const INV_ALPHA_TABLE = this.INV_ALPHA_TABLE

    // 快速拷贝 Alpha 通道及不需要转换的像素点
    result.set(rgbaArray)

    for (let i = 0; i < len; i += 4) {
        const a = rgbaArray[i + 3]

        // 只有当 Alpha 在 (0, 255) 区间时才需要重新计算 RGB
        if (a > 0 && a < 255) {
            const invAlpha = INV_ALPHA_TABLE[a]

            // 利用 Uint8ClampedArray 的特性，直接赋值
            // 自动完成：Math.max(0, Math.min(255, Math.round(val)))
            result[i] = rgbaArray[i] * invAlpha
            result[i + 1] = rgbaArray[i + 1] * invAlpha
            result[i + 2] = rgbaArray[i + 2] * invAlpha
        }
    }

    // 返回其视图
    return new Uint8Array(result.buffer)
}

SimpleSpine.uint8ArrayToString = function (u8Arr, encoding = 'ascii') {
    return new TextDecoder(encoding).decode(u8Arr)
}
/**
 * 判断字符串或对象是否符合 Spine 版本特征，并返回标准化版本号
 * @param {string|Object} str - 待检测的字符串或 JSON 对象
 * @returns {string|null}
 */
SimpleSpine.isVersion = function (str) {
    if (!str) {
        return null
    }
    if (typeof str == 'object') {
        if (str.skeleton && str.skeleton.spine) {
            if (str.skeleton.spine.length <= 3) {
                return str.skeleton.spine.replace('.', '')
            }
            return str.skeleton.spine.slice(0, 3).replace('.', '')
        }
        return null
    }
    if (typeof str == 'string') {
        let list = [
            [9, '4.0'],
            [8, '4.1'],
            [9, '4.2'],
            [29, '3.8'],
            [29, '3.7'],
            [29, '3.6'],
            [29, '3.5'],
            [29, '3.4'],
            [29, '2.1'],
        ]
        for (var i = 0; i < list.length; i++) {
            let a = str.slice(list[i][0], list[i][0] + 6).match(/\d\.\d\.\d\d/g)
            if (a && a[0].startsWith(list[i][1])) {
                return a[0].slice(0, 3).replace('.', '')
            }
        }
    }
    return null
}

SimpleSpine.skelToJson = {}

SimpleSpine.skelToJson.BinaryInput = (function () {
    function BinaryInput(buffer) {
        this.index = 0
        this.buffer = new DataView(buffer)
    }
    BinaryInput.prototype.readByte = function () {
        return this.buffer.getUint8(this.index++)
    }
    BinaryInput.prototype.readSByte = function () {
        return this.readByte()
    }
    BinaryInput.prototype.readShort = function () {
        var value = this.buffer.getInt16(this.index)
        this.index += 2
        return value
    }
    BinaryInput.prototype.readInt32 = function () {
        var value = this.buffer.getInt32(this.index)
        this.index += 4
        return value
    }
    BinaryInput.prototype.readVarint = function (optimizePositive) {
        let result = 0
        let shift = 0
        let b

        do {
            b = this.readByte()
            result |= (b & 0x7f) << shift
            shift += 7
        } while ((b & 0x80) !== 0 && shift < 35)

        return optimizePositive ? result : (result >>> 1) ^ -(result & 1)
    }
    BinaryInput.prototype.readColor = function () {
        return {
            r: this.readByte(),
            g: this.readByte(),
            b: this.readByte(),
            a: this.readByte(),
        }
    }
    BinaryInput.prototype.readColorHex = function () {
        let color = this.readColor()
        return Hex(color.r) + Hex(color.g) + Hex(color.b) + Hex(color.a)
        function Hex(e) {
            let a = e.toString(16)
            return a.length == 2 ? a : '0' + a
        }
    }
    BinaryInput.prototype.readStringRef = function () {
        var index = this.readVarint(true)
        return index == 0 ? null : this.strings[index - 1]
    }
    BinaryInput.prototype.readString = function () {
        let byteCount = this.readVarint(true)
        switch (byteCount) {
            case 0:
                return null
            case 1:
                return ''
        }
        byteCount--
        let chars = ''
        for (let i = 0; i < byteCount; ) {
            let b = this.readByte()
            switch (b >> 4) {
                case 12:
                case 13:
                    chars += String.fromCharCode(((b & 0x1f) << 6) | (this.readByte() & 0x3f))
                    i += 2
                    break
                case 14:
                    chars += String.fromCharCode(
                        ((b & 0x0f) << 12) | ((this.readByte() & 0x3f) << 6) | (this.readByte() & 0x3f),
                    )
                    i += 3
                    break
                default:
                    chars += String.fromCharCode(b)
                    i++
            }
        }
        return chars
    }
    BinaryInput.prototype.readFloat = function () {
        var value = this.buffer.getFloat32(this.index)
        this.index += 4
        return value
    }
    BinaryInput.prototype.readFloat21 = function () {
        return (this.readByte() << 24) + (this.readByte() << 16) + (this.readByte() << 8) + (this.readByte() << 0)
    }
    BinaryInput.prototype.readBoolean = function () {
        return this.readByte() != 0
    }
    BinaryInput.prototype.readIntArray = function () {
        var n = this.readVarint(true)
        var array = new Array(n)
        for (var i = 0; i < n; i++) array[i] = this.readVarint(true)
        return array
    }
    BinaryInput.prototype.readCurve = function () {
        switch (this.readByte()) {
            case 1: //CURVE_STEPPED
                return 'stepped'
            case 2: //CURVE_BEZIER
                var cx1 = this.readFloat()
                var cy1 = this.readFloat()
                var cx2 = this.readFloat()
                var cy2 = this.readFloat()
                return [cx1, cy1, cx2, cy2]
        }
    }
    BinaryInput.prototype.readFloatArray = function (n) {
        if (!n) {
            n = this.readVarint(true)
        }
        var array = new Array(n)
        for (var i = 0; i < n; i++) {
            array[i] = this.readFloat()
        }
        return array
    }
    BinaryInput.prototype.readAnimation = function (skeletonData, skins, version = 36) {
        input = this
        let animationData = {}
        let duration = 0
        // Slot timelines.
        let slotData = {}
        const slotCount = input.readVarint(1)
        for (let i = 0, n = slotCount; i < n; ++i) {
            const slotIndex = input.readVarint(1)
            let slotMap = {}
            for (let ii = 0, nn = input.readVarint(1); ii < nn; ++ii) {
                const timelineType = input.readByte()
                const frameCount = input.readVarint(1)
                switch (timelineType) {
                    case 0: {
                        //SLOT_ATTACHMENT
                        const timeline = []
                        for (let frameIndex = 0; frameIndex < frameCount; ++frameIndex) {
                            let data = {
                                time: input.readFloat(),
                                name: input.readString(),
                            }
                            timeline.push(data)
                        }
                        slotMap.attachment = timeline
                        duration = Math.max(duration, timeline[frameCount - 1].time)
                        break
                    }
                    case 1: {
                        //SLOT_COLOR
                        const timeline = []
                        for (let frameIndex = 0; frameIndex < frameCount; ++frameIndex) {
                            let data = {
                                time: input.readFloat(),
                                color: input.readColorHex(),
                            }
                            if (frameIndex < frameCount - 1) {
                                data.curve = input.readCurve()
                            }
                            timeline.push(data)
                        }
                        slotMap.color = timeline
                        duration = Math.max(duration, timeline[frameCount - 1].time)
                        break
                    }
                    case 2: {
                        //SLOT_TWO_COLOR
                        let timeline = []
                        timeline.slotIndex = slotIndex
                        for (let frameIndex = 0; frameIndex < frameCount; ++frameIndex) {
                            let data = {
                                time: input.readFloat(),
                                light: input.readColorHex(),
                                dark: input.readColorHex(),
                            }
                            if (frameIndex < frameCount - 1) {
                                data.curve = input.readCurve()
                            }
                            timeline.push(data)
                        }
                        slotMap.twoColor = timeline
                        duration = Math.max(duration, timeline[frameCount - 1].time)
                        break
                    }
                    default:
                        return null
                }
            }
            slotData[skeletonData.slots[slotIndex].name] = slotMap
        }
        animationData.slots = slotData

        // Bone timelines
        const boneData = {}

        const boneCount = input.readVarint(1)
        for (let i = 0; i < boneCount; i++) {
            const boneIndex = input.readVarint(1)
            const boneMap = {}
            const timelineCount = input.readVarint(1)

            for (let ii = 0; ii < timelineCount; ii++) {
                const timelineType = input.readByte()
                const frameCount = input.readVarint(1)

                const processFrame = (frameHandler) => {
                    const timeline = []
                    for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
                        const data = frameHandler()
                        if (frameIndex < frameCount - 1) {
                            const curve = input.readCurve(data)
                            if (curve) data.curve = curve
                        }
                        timeline.push(data)
                    }
                    return timeline
                }

                switch (timelineType) {
                    case 0: {
                        // BONE_ROTATE
                        const timeline = processFrame(() => ({
                            time: input.readFloat(),
                            angle: input.readFloat(),
                        }))
                        boneMap.rotate = timeline
                        duration = Math.max(duration, timeline[frameCount - 1].time)
                        break
                    }

                    case 1: // BONE_TRANSLATE
                    case 2: // BONE_SCALE
                    case 3: {
                        // BONE_SHEAR
                        const typeNames = ['', 'translate', 'scale', 'shear']
                        const timeline = processFrame(() => ({
                            time: input.readFloat(),
                            x: input.readFloat(),
                            y: input.readFloat(),
                        }))
                        boneMap[typeNames[timelineType]] = timeline
                        break
                    }

                    default:
                        return null
                }
            }

            boneData[skeletonData.bones[boneIndex].name] = boneMap
        }

        animationData.bones = boneData

        let ikData = {}
        // IK constraint timelines.
        for (let i = 0, n = input.readVarint(1); i < n; ++i) {
            const index = input.readVarint(1)
            const frameCount = input.readVarint(1)
            const timeline = []
            for (let frameIndex = 0; frameIndex < frameCount; ++frameIndex) {
                let data = {
                    time: input.readFloat(),
                    mix: input.readFloat(),
                    bendPositive: input.readByte() != 255,
                }
                switch (version) {
                    case 37:
                        data.compress = input.readBoolean()
                        data.stretch = input.readBoolean()
                        break
                }
                if (frameIndex < frameCount - 1) {
                    let curve = input.readCurve()
                    if (curve) {
                        data.curve = curve
                    }
                }
                timeline.push(data)
            }
            ikData[skeletonData.ik[index].name] = timeline
        }
        animationData.ik = ikData

        let transformData = {}
        // Transform constraint timelines.
        for (let i = 0, n = input.readVarint(1); i < n; ++i) {
            const index = input.readVarint(1)
            const frameCount = input.readVarint(1)
            const timeline = []

            for (let frameIndex = 0; frameIndex < frameCount; ++frameIndex) {
                let data = {
                    time: input.readFloat(),
                    rotateMix: input.readFloat(),
                    translateMix: input.readFloat(),
                    scaleMix: input.readFloat(),
                    shearMix: input.readFloat(),
                }
                if (frameIndex < frameCount - 1) {
                    data.curve = input.readCurve()
                }
                timeline.push(data)
            }
            transformData[skeletonData.transform[index].name] = timeline //暂时不知道名称来自那个键
        }
        animationData.transform = transformData

        // Path constraint timelines
        const pathData = {}

        const pathCount = input.readVarint(1)
        for (let i = 0; i < pathCount; i++) {
            const pathIndex = input.readVarint(1)
            const timelineCount = input.readVarint(1)
            const pathName = skeletonData.path[pathIndex].name

            pathData[pathName] = {}

            for (let ii = 0; ii < timelineCount; ii++) {
                const timelineType = input.readByte()
                const frameCount = input.readVarint(1)
                const timelineTypeNames = ['position', 'spacing', 'mix']
                const timelineTypeName = timelineTypeNames[timelineType]

                const processFrame = (frameHandler) => {
                    const timeline = []
                    for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
                        const data = frameHandler()
                        if (frameIndex < frameCount - 1) {
                            const curve = input.readCurve()
                            if (curve) data.curve = curve
                        }
                        timeline.push(data)
                    }
                    return timeline
                }

                let timeline
                switch (timelineType) {
                    case 0: // PATH_POSITION
                    case 1: // PATH_SPACING
                        timeline = processFrame(() => ({
                            time: input.readFloat(),
                            position: input.readFloat(),
                        }))
                        break

                    case 2: // PATH_MIX
                        timeline = processFrame(() => ({
                            time: input.readFloat(),
                            rotateMix: input.readFloat(),
                            translateMix: input.readFloat(),
                        }))
                        break

                    default:
                        return null // Invalid timeline type
                }

                pathData[pathName][timelineTypeName] = timeline
                duration = Math.max(duration, timeline[frameCount - 1].time)
            }
        }

        animationData.paths = pathData

        // Deform timelines
        const deformData = {}

        const processDeformFrames = (frameCount) => {
            const timeline = []
            for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
                const data = { time: input.readFloat() }
                const vertexCount = input.readVarint(1)

                if (vertexCount > 0) {
                    const startOffset = input.readVarint(1)
                    const vertices = Array.from({ length: vertexCount }, () => input.readFloat())
                    data.vertices = vertices
                    data.offset = startOffset
                }

                if (frameIndex < frameCount - 1) {
                    data.curve = input.readCurve(input, data, frameIndex)
                }

                timeline.push(data)
            }
            return timeline
        }

        function getAttachment(attachments, meshName) {
            for (var attachmentName in attachments) {
                if (attachments[attachmentName].name == meshName) return (attachment = attachments[attachmentName])
            }
        }

        const skinCount = input.readVarint(1)
        for (let i = 0; i < skinCount; i++) {
            const skinIndex = input.readVarint(1)
            const skin = skins[skinIndex].data
            const skinMap = {}

            const slotCount = input.readVarint(1)
            for (let ii = 0; ii < slotCount; ii++) {
                const slotIndex = input.readVarint(1)
                const slotName = skeletonData.slots[slotIndex].name
                const slot = {}

                const attachmentCount = input.readVarint(1)
                for (let iii = 0; iii < attachmentCount; iii++) {
                    const attachmentName = input.readString()
                    let attachments = skin[slotName]
                    let attachment = getAttachment(attachments, attachmentName)
                    if (!attachment) throw new Error('匹配deform中的attachment失败')

                    const frameCount = input.readVarint(1)
                    const timeline = processDeformFrames(frameCount)

                    slot[attachmentName] = timeline
                    duration = Math.max(duration, timeline[frameCount - 1].time)
                }

                skinMap[slotName] = slot
            }

            deformData[skins[skinIndex].name] = skinMap
        }

        animationData.deform = deformData

        // Draw order timeline.
        const drawOrderCount = input.readVarint(1)
        if (drawOrderCount) {
            let drawOrders = []
            for (let i = 0; i < drawOrderCount; ++i) {
                let drawOrderMap = {}
                let time = input.readFloat()
                let offsetCount = input.readVarint(1)
                let offsets = []
                for (let ii = 0; ii < offsetCount; ++ii) {
                    const slotIndex = input.readVarint(1)

                    let data = {
                        slot: skeletonData.slots[slotIndex].name,
                        offset: input.readVarint(1),
                    }
                    offsets.push(data)
                }
                drawOrderMap.offsets = offsets
                drawOrderMap.time = time

                drawOrders.push(drawOrderMap)
            }
            duration = Math.max(duration, drawOrders[drawOrderCount - 1].time)
            animationData.drawOrder = drawOrders
        }

        // Event timeline.
        //let events = {}
        const eventCount = input.readVarint(1)
        if (eventCount) {
            const timeline = []
            for (let i = 0; i < eventCount; ++i) {
                let time = input.readFloat()
                let name = Object.keys(skeletonData.events)[input.readVarint(1)]
                const event = {} //spEvent_create(time, eventData);
                event.int = input.readVarint(0)
                event.float = input.readFloat()
                event.string = input.readBoolean() ? input.readString() : name
                event.time = time
                event.name = name
                timeline.push(event)
            }
            animationData.events = timeline
            duration = Math.max(duration, timeline[eventCount - 1].time)
        }
        //animationData.events = events
        Object.keys(animationData).forEach((key) => {
            if (Object.keys(animationData[key]).length === 0) {
                delete animationData[key]
            }
        })

        return animationData
    }
    BinaryInput.prototype.readAnimation21 = function (skeletonData, skins) {
        input = this
        let animationData = {}
        let duration = 0

        // Slot timelines
        const slotData = {}
        const slotCount = input.readVarint(true)

        for (let i = 0; i < slotCount; i++) {
            const slotIndex = input.readVarint(true)
            const timelineMap = {}
            const timelineCount = input.readVarint(true)

            for (let ii = 0; ii < timelineCount; ii++) {
                const timelineType = input.readByte()
                const frameCount = input.readVarint(true)
                const timeline = new Array(frameCount)

                // 统一帧数据处理逻辑
                for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
                    const time = input.readFloat()
                    timeline[frameIndex] = { time }

                    switch (timelineType) {
                        case 3: // TIMELINE_ATTACHMENT
                            timeline[frameIndex].name = input.readString()
                            break

                        case 4: // TIMELINE_COLOR
                            timeline[frameIndex].color = input.readColorHex()
                            if (frameIndex < frameCount - 1) {
                                input.readCurve(frameIndex, timeline)
                            }
                            break

                        default:
                            console.error(
                                `Invalid  timeline type ${timelineType} for slot: ${skeletonData.slots[slotIndex].name}`,
                            )
                            return null
                    }
                }
                timelineMap[timelineType === 3 ? 'attachment' : 'color'] = timeline
                duration = Math.max(duration, timeline[frameCount - 1].time)
            }

            slotData[skeletonData.slots[slotIndex].name] = timelineMap
        }

        animationData.slots = slotData

        // Bone timelines
        const boneData = {}
        const boneCount = input.readVarint(true)

        for (let i = 0; i < boneCount; i++) {
            const boneIndex = input.readVarint(true)
            const timelines = {}
            const timelineCount = input.readVarint(true)

            for (let ii = 0; ii < timelineCount; ii++) {
                const type = input.readByte()
                const frameCount = input.readVarint(true)
                const timeline = new Array(frameCount)

                // 统一帧数据读取逻辑
                for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
                    const frame = { time: input.readFloat() }

                    switch (type) {
                        case 1: // ROTATE
                            frame.angle = input.readFloat()
                            break

                        case 2: // TRANSLATE
                        case 0: // SCALE
                            frame.x = input.readFloat()
                            frame.y = input.readFloat()
                            break

                        case 5: // FLIPX
                        case 6: // FLIPY
                            frame[type === 5 ? 'x' : 'y'] = input.readBoolean()
                            break

                        default:
                            console.error(
                                `Invalid  bone timeline type ${type} for: ${skeletonData.bones[boneIndex].name}`,
                            )
                            return null
                    }

                    if (frameIndex < frameCount - 1) {
                        const curve = input.readCurve(frameIndex, timeline)
                        if (curve) frame.curve = curve
                    }

                    timeline[frameIndex] = frame
                    duration = Math.max(duration, frame.time)
                }
                timelines[
                    type === 1
                        ? 'rotate'
                        : type === 0
                          ? 'scale'
                          : type === 2
                            ? 'translate'
                            : type === 5
                              ? 'flipX'
                              : 'flipY'
                ] = timeline
            }

            boneData[skeletonData.bones[boneIndex].name] = timelines
        }

        animationData.bones = boneData

        const ikData = {}
        const ikCount = input.readVarint(true)

        for (let i = 0; i < ikCount; i++) {
            const constraintIndex = input.readVarint(true)
            const frameCount = input.readVarint(true)
            const timeline = new Array(frameCount)
            for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
                const frame = {
                    time: input.readFloat(),
                    mix: input.readFloat(),
                    bendPositive: input.readByte() !== 0xff, // 255转布尔
                }
                if (frameIndex < frameCount - 1) {
                    const curve = input.readCurve(frameIndex, timeline)
                    if (curve) frame.curve = curve
                }
                timeline[frameIndex] = frame
            }
            if (skeletonData.ik[constraintIndex]) {
                ikData[skeletonData.ik[constraintIndex].name] = timeline
            } else {
                console.warn(`Missing  IK constraint index: ${constraintIndex}`)
            }
        }

        // FFD timelines.
        var ffd = {}
        for (var i = 0, n = input.readVarint(true); i < n; i++) {
            var skinIndex = input.readVarint(true)
            var slotMap = {}
            for (var ii = 0, nn = input.readVarint(true); ii < nn; ii++) {
                var slotIndex = input.readVarint(true)
                var meshMap = {}
                for (var iii = 0, nnn = input.readVarint(true); iii < nnn; iii++) {
                    var meshName = input.readString()
                    var frameCount = input.readVarint(true)
                    var attachment
                    var attachments = skeletonData.skins[skins[skinIndex].name][skeletonData.slots[slotIndex].name]
                    for (var attachmentName in attachments) {
                        if (attachments[attachmentName].name == meshName) attachment = attachments[attachmentName]
                    }
                    if (!attachment) console.log('FFD attachment not found: ' + meshName)
                    var timeline = new Array(frameCount)
                    for (var frameIndex = 0; frameIndex < frameCount; frameIndex++) {
                        var time = input.readFloat()
                        var vertexCount
                        if (attachment.type == 'mesh') {
                            vertexCount = attachment.vertices.length
                        } else {
                            vertexCount = attachment.uvs.length * 3 * 3
                            // This maybe wrong
                        }

                        var vertices = new Array(vertexCount)
                        for (var verticeIdx = 0; verticeIdx < vertexCount; verticeIdx++) {
                            vertices[verticeIdx] = 0.0
                        }
                        var bugFixMultiplicator = 0.1

                        var end = input.readVarint(true)
                        if (end == 0) {
                            if (attachment.type == 'mesh') {
                                for (var verticeIdx = 0; verticeIdx < vertexCount; verticeIdx++) {
                                    vertices[verticeIdx] += attachment.vertices[verticeIdx] * bugFixMultiplicator
                                }
                            }
                        } else {
                            var start = input.readVarint(true)
                            end += start

                            for (var v = start; v < end; v++) {
                                vertices[v] = input.readFloat() * scale
                            }

                            if (attachment.type == 'mesh') {
                                var meshVertices = attachment.vertices
                                for (var v = 0, vn = vertices.length; v < vn; v++) {
                                    vertices[v] += meshVertices[v] * bugFixMultiplicator
                                }
                            }
                        }
                        timeline[frameIndex] = {}
                        timeline[frameIndex].time = time
                        timeline[frameIndex].vertices = vertices
                        if (frameIndex < frameCount - 1) input.readCurve(frameIndex, timeline)
                    }
                    meshMap[meshName] = timeline
                    duration = Math.max(duration, timeline[frameCount - 1].time)
                }
                slotMap[skeletonData.slots[slotIndex].name] = meshMap
            }
            ffd[skins[skinIndex].name] = slotMap
        }
        animationData.ffd = ffd

        // Draw order timeline.
        const drawOrderCount = input.readVarint(1)
        if (drawOrderCount) {
            let drawOrders = []
            for (let i = 0; i < drawOrderCount; ++i) {
                let drawOrderMap = {}

                let offsetCount = input.readVarint(1)
                let offsets = []
                for (let ii = 0; ii < offsetCount; ++ii) {
                    const slotIndex = input.readVarint(1)

                    let data = {
                        slot: skeletonData.slots[slotIndex].name,
                        offset: input.readVarint(1),
                    }
                    offsets.push(data)
                }
                drawOrderMap.offsets = offsets
                let time = input.readFloat()
                drawOrderMap.time = time

                drawOrders.push(drawOrderMap)
            }
            duration = Math.max(duration, drawOrders[drawOrderCount - 1].time)
            animationData.drawOrder = drawOrders
        }

        // Event timeline.
        //let events = {}
        const eventCount = input.readVarint(1)
        if (eventCount) {
            const timeline = []
            for (let i = 0; i < eventCount; ++i) {
                let time = input.readFloat()
                let name = Object.keys(skeletonData.events)[input.readVarint(1)]
                const event = {} //spEvent_create(time, eventData);
                event.int = input.readVarint(0)
                event.float = input.readFloat()
                event.string = input.readBoolean() ? input.readString() : name
                event.time = time
                event.name = name
                timeline.push(event)
            }
            animationData.events = timeline
            duration = Math.max(duration, timeline[eventCount - 1].time)
        }
        //animationData.events = events
        Object.keys(animationData).forEach((key) => {
            if (Object.keys(animationData[key]).length === 0) {
                delete animationData[key]
            }
        })

        return animationData
    }
    BinaryInput.prototype.readSkin = function (skeletonData, nonessential) {
        let input = this
        const slotCount = input.readVarint(1)
        if (slotCount === 0) {
            return null
        }
        let skin = {}
        for (let i = 0; i < slotCount; ++i) {
            const slotIndex = input.readVarint(1)
            const nn = input.readVarint(1)
            let slot = {}
            for (let ii = 0; ii < nn; ++ii) {
                const name = input.readString()
                const attachment = spSkeletonBinary_readAttachment(name, skeletonData, nonessential)
                if (attachment) {
                    slot[name] = attachment
                }
                skin[skeletonData.slots[slotIndex].name] = slot
            }
        }
        return skin
        function spSkeletonBinary_readAttachment(attachmentName, skeletonData, nonessential) {
            let name = input.readString()
            //console.log(attachmentName,name)
            let freeName = name !== null

            if (!name) {
                freeName = false
                name = attachmentName
            }

            const type = input.readByte()

            let typeMode = ['region', 'boundingbox', 'mesh', 'linkedmesh', 'path', 'point', 'clipping']
            let attachment
            switch (type) {
                case 0: {
                    //SP_ATTACHMENT_REGION
                    let path = input.readString()
                    let region
                    if (!path) {
                        path = name
                    }
                    attachment = {
                        //name: name,
                    }
                    region = attachment
                    region.path = path
                    region.rotation = input.readFloat()
                    region.x = input.readFloat()
                    region.y = input.readFloat()
                    region.scaleX = input.readFloat()
                    region.scaleY = input.readFloat()
                    region.width = input.readFloat()
                    region.height = input.readFloat()
                    region.color = input.readColorHex()
                    break
                }
                case 1: {
                    //SP_ATTACHMENT_BOUNDING_BOX
                    const vertexCount = input.readVarint(1)
                    attachment = {
                        //name: name,
                        type: 'boundingbox',
                        vertexCount: vertexCount,
                    }
                    input.readVertices(attachment, vertexCount)

                    if (nonessential) {
                        attachment.color = input.readColorHex()
                    }
                    break
                }
                case 2: {
                    //SP_ATTACHMENT_MESH
                    let mesh
                    let path = input.readString()

                    if (!path) {
                        path = name
                    }
                    mesh = {
                        //name: name,
                        path: path,
                        color: input.readColorHex(),
                        vertexCount: input.readVarint(1),
                    }
                    mesh.uvs = input.readFloatArray(mesh.vertexCount * 2, 1)
                    mesh.triangles = input.readShortArray(input, mesh.trianglesCount)
                    input.readVertices(mesh, mesh.vertexCount)
                    mesh.hull = input.readVarint(1) // * 2;

                    if (nonessential) {
                        mesh.edges = input.readShortArray(input, mesh.edgesCount)
                        mesh.width = input.readFloat()
                        mesh.height = input.readFloat()
                    }
                    attachment = mesh
                    break
                }
                case 3: {
                    //SP_ATTACHMENT_LINKED_MESH
                    attachment = {}
                    let mesh = attachment
                    let path = input.readString()
                    if (!path) {
                        path = name
                    }

                    mesh.path = path
                    mesh.color = input.readColorHex()
                    mesh.skin = input.readString()
                    mesh.parent = input.readString()
                    mesh.inheritDeform = input.readBoolean()

                    if (nonessential) {
                        mesh.width = input.readFloat(input)
                        mesh.height = input.readFloat(input)
                    }
                    break
                }
                case 4: {
                    //SP_ATTACHMENT_PATH
                    attachment = {}
                    let path = attachment
                    path.closed = input.readBoolean()
                    path.constantSpeed = input.readBoolean()
                    let vertexCount = input.readVarint(1)
                    path.vertexCount = vertexCount
                    input.readVertices(path, vertexCount)
                    let lengthsLength = vertexCount / 3
                    path.lengths = new Array(lengthsLength)
                    for (let i = 0; i < lengthsLength; ++i) {
                        path.lengths[i] = input.readFloat()
                    }
                    if (nonessential) {
                        path.color = input.readColorHex()
                    }
                    break
                }
                case 5: {
                    //SP_ATTACHMENT_POINT
                    attachment = {}
                    let point = attachment
                    point.rotation = input.readFloat()
                    point.x = input.readFloat()
                    point.y = input.readFloat()
                    if (nonessential) {
                        point.color = input.readColorHex()
                    }
                    break
                }
                case 6: {
                    //SP_ATTACHMENT_CLIPPING
                    let endSlotIndex = input.readVarint(input, 1)
                    let vertexCount = input.readVarint(input, 1)
                    attachment = {}
                    attachment.vertexCount = vertexCount
                    let clip = attachment
                    input.readVertices(clip, vertexCount)

                    if (nonessential) {
                        clip.color = input.readColorHex()
                    }
                    clip.end = skeletonData.slots[endSlotIndex].name
                    break
                }
            }
            attachment.type = typeMode[type]
            if (!attachment.name) {
                attachment.name = attachmentName
            }
            return attachment
        }
    }
    BinaryInput.prototype.readSkin21 = function (skeletonData, nonessential) {
        let input = this
        const slotCount = input.readVarint(1)
        if (slotCount === 0) {
            return null
        }
        let skin = {}
        for (let i = 0; i < slotCount; ++i) {
            const slotIndex = input.readVarint(1)
            const nn = input.readVarint(1)
            let slot = {}
            for (let ii = 0; ii < nn; ++ii) {
                const name = input.readString()
                const attachment = readAttachment(name, skeletonData, nonessential)
                if (attachment) {
                    slot[name] = attachment
                }
                skin[skeletonData.slots[slotIndex].name] = slot
            }
        }
        return skin
        function readAttachment(attachmentName, skeletonData, nonessential) {
            const ATTACHMENT_TYPES = ['region', 'boundingbox', 'mesh', 'linkedmesh', 'path', 'point', 'clipping']
            const name = input.readString() || attachmentName
            const type = input.readByte()
            if (type >= ATTACHMENT_TYPES.length) {
                console.warn(`Invalid  attachment type: ${type}`)
                return null
            }
            const attachment = {
                name,
                type: ATTACHMENT_TYPES[type],
                path: type <= 3 ? input.readString() || name : undefined,
            }
            switch (type) {
                case 0: // REGION
                    Object.assign(attachment, {
                        x: input.readFloat(),
                        y: input.readFloat(),
                        scaleX: input.readFloat(),
                        scaleY: input.readFloat(),
                        rotation: input.readFloat(),
                        width: input.readFloat(),
                        height: input.readFloat(),
                        color: input.readColorHex(),
                    })
                    break

                case 1: // BOUNDING_BOX
                    attachment.vertices = input.readFloatArray()
                    break

                case 2: // MESH
                    Object.assign(attachment, {
                        uvs: input.readFloatArray(),
                        triangles: input.readShortArray(),
                        vertices: input.readFloatArray(),
                        color: input.readColorHex(),
                        hull: input.readVarint(true),
                        ...(nonessential && {
                            edges: input.readIntArray(),
                            width: input.readFloat(),
                            height: input.readFloat(),
                        }),
                    })
                    break

                case 3: // SKINNED_MESH
                    attachment.uvs = input.readFloatArray()
                    attachment.triangles = input.readShortArray()
                    attachment.vertices = readSkinnedVertices(input)
                    attachment.color = input.readColorHex()
                    attachment.hull = input.readVarint(true)
                    if (nonessential) {
                        attachment.edges = input.readIntArray()
                        attachment.size = {
                            width: input.readFloat(),
                            height: input.readFloat(),
                        }
                    }
                    break

                case 4: // PATH
                    Object.assign(attachment, {
                        closed: input.readBoolean(),
                        constantSpeed: input.readBoolean(),
                        vertices: input.readVertices(input.readVarint(true)),
                        lengths: input.readFloatArray(Math.ceil(attachment.vertices.length / 3)),
                        ...(nonessential && { color: input.readColorHex() }),
                    })
                    break

                case 6: // CLIPPING
                    const endSlotIndex = input.readVarint(true)
                    attachment.vertices = input.readVertices(input.readVarint(true))
                    attachment.end = skeletonData.slots[endSlotIndex].name
                    if (nonessential) attachment.color = input.readColorHex()
                    break
            }

            return attachment
        }
        function readSkinnedVertices(input) {
            const vertices = []
            const vertexCount = input.readVarint(true)

            for (let i = 0; i < vertexCount; ) {
                const boneCount = Math.floor(input.readFloat())
                vertices[i++] = boneCount

                for (let end = i + boneCount * 4; i < end; i += 4) {
                    vertices[i] = Math.floor(input.readFloat()) // boneIndex
                    vertices[i + 1] = input.readFloat() // x
                    vertices[i + 2] = input.readFloat() // y
                    vertices[i + 3] = input.readFloat() // weight
                }
            }
            return vertices
        }
    }
    BinaryInput.prototype.readVertices = function (attachment, vertexCount) {
        let input = this
        const verticesLength = vertexCount * 2
        const weights = []
        if (!input.readBoolean()) {
            attachment.verticesCount = verticesLength
            attachment.vertices = input.readFloatArray(verticesLength)
            attachment.bonesCount = 0
            return
        }

        for (let i = 0; i < vertexCount; ++i) {
            const boneCount = input.readVarint(1)
            weights.push(boneCount)
            for (let ii = 0; ii < boneCount; ++ii) {
                weights.push(input.readVarint(1)) // 骨骼索引
                weights.push(input.readFloat()) // 权重 x
                weights.push(input.readFloat()) // 权重 y
                weights.push(input.readFloat()) // 权重 z
            }
        }
        attachment.vertices = weights
    }
    BinaryInput.prototype.readShortArray = function () {
        let n = this.readVarint(1)
        let array = []
        for (i = 0; i < n; ++i) {
            array[i] = this.readByte() << 8
            array[i] |= this.readByte()
        }
        return array
    }
    return BinaryInput
})()
SimpleSpine.skelToJson.spine36To38 = function (obj) {
    // 1. 深拷贝原始数据，优先使用原生 structuredClone
    const skel = typeof structuredClone === 'function' ? structuredClone(obj) : JSON.parse(JSON.stringify(obj))

    skel.skeleton = skel.skeleton || {}
    skel.skeleton.spine = '3.8.95'

    // 2. 处理 Skins (从对象格式转为数组格式)
    if (skel.skins && !Array.isArray(skel.skins)) {
        skel.skins = Object.entries(skel.skins).map(([name, attachments]) => {
            // 顺便处理 skinnedmesh 转换
            for (const slotName in attachments) {
                for (const attachmentName in attachments[slotName]) {
                    const attachment = attachments[slotName][attachmentName]
                    if (attachment.type === 'skinnedmesh') {
                        attachment.type = 'mesh'
                    }
                }
            }
            return { name, attachments }
        })
    }

    // 3. 处理 Bones
    if (skel.bones) {
        skel.bones.forEach((bone) => {
            bone.transform = bone.transform || 'normal'
            delete bone.inheritScale
            delete bone.inheritRotation
        })
    }

    // 4. 辅助函数：角度规范化
    const normalizeAngle = (angle) => ((angle % 360) + 360) % 360

    // 5. 递归处理动画 Curve 和 Flip
    const processAnimations = (node, nodeName) => {
        if (!node || typeof node !== 'object') return

        for (const [key, value] of Object.entries(node)) {
            if (Array.isArray(value)) {
                // 处理 Curve 数组转 c2, c3, c4
                value.forEach((frame) => {
                    if (Array.isArray(frame.curve)) {
                        const [c1, c2, c3, c4] = frame.curve
                        frame.curve = c1 ?? 0
                        if (c2 !== undefined) frame.c2 = c2
                        if (c3 !== undefined) frame.c3 = c3
                        if (c4 !== undefined) frame.c4 = c4
                    }
                })

                // 处理 3.8 不再支持的 flipX / flipY
                if (key === 'flipX' || key === 'flipY') {
                    if (value.length > 0) {
                        const isFlipX = key === 'flipX'
                        // 处理缩放
                        if (node.scale) {
                            node.scale.forEach((s) => {
                                if (isFlipX) s.x = (s.x || 1) * -1
                                else s.y = (s.y || 1) * -1
                            })
                        }
                        // 处理旋转
                        if (node.rotate) {
                            const boneBase = skel.bones.find((b) => b.name === nodeName)
                            const baseRotation = boneBase?.rotation || 0
                            node.rotate.forEach((r) => {
                                r.angle_old = r.angle
                                // 逻辑：镜像后的角度偏移计算
                                let newAngle = -(r.angle + baseRotation * 2) + 180
                                r.angle = normalizeAngle(newAngle)
                            })
                        }
                    }
                    delete node[key]
                }
            } else {
                processAnimations(value, key)
            }
        }
    }

    // 执行动画和路径名称转换
    if (skel.animations) {
        processAnimations(skel.animations)
        // 转换 paths 关键字为 path
        Object.values(skel.animations).forEach((anim) => {
            if (anim.paths) {
                anim.path = anim.paths
                delete anim.paths
            }
        })
    }

    // 6. 处理 IK 和 Path 排序
    const setOrder = (items, defaultOrder = 0) => {
        if (Array.isArray(items)) {
            items.forEach((item, i) => {
                if (item.order === undefined) item.order = defaultOrder === 'index' ? i : defaultOrder
            })
        }
    }

    setOrder(skel.ik, 'index')
    setOrder(skel.path, 2)

    return skel
}
SimpleSpine.skelToJson.readSkeletonData36And37 = function (binary) {
    let skeletonData = {}
    var input = new this.BinaryInput(binary)
    let skeleton = {
        hash: input.readString(),
        spine: input.readString(),
        width: input.readFloat(),
        height: input.readFloat(),
    }
    let version = skeleton.spine.startsWith(3.7) ? 37 : 36

    var nonessential = input.readBoolean()
    if (nonessential) {
        skeleton.fps = input.readFloat()
        skeleton.images = input.readString()
        if (version == 37) {
            input.readString()
        }
    }
    skeletonData.skeleton = skeleton
    /* Bones. */
    bonesCount = input.readVarint(true)
    skeletonData.bones = []
    for (var i = 0; i < bonesCount; i++) {
        let data = {
            name: input.readString(),
            parent: null,
        }
        const parentIndex = i === 0 ? null : input.readVarint(true)
        if (parentIndex != null) {
            data.parent = skeletonData.bones[parentIndex].name
        }
        // 读取骨骼属性
        data.rotation = input.readFloat()
        data.x = input.readFloat()
        data.y = input.readFloat()
        data.scaleX = input.readFloat()
        data.scaleY = input.readFloat()
        data.shearX = input.readFloat()
        data.shearY = input.readFloat()
        data.length = input.readFloat()

        let key = ['rotation', 'x', 'y', 'shearX', 'shearY', 'length']
        key.forEach((e) => {
            if (data[e] === 0) {
                delete data[e]
            }
        })
        let key2 = ['scaleX', 'scaleY']
        key2.forEach((e) => {
            if (data[e] === 1) {
                delete data[e]
            }
        })

        // 读取变换模式
        let transformMode = ['normal', 'onlytranslation', 'norotationorreflection', 'noscale', 'noscaleorreflection']
        data.transform = transformMode[input.readVarint(true)]

        if (nonessential) {
            data.color = input.readColorHex() // 跳过骨骼颜色
        }
        skeletonData.bones.push(data)
    }

    /* Slots. */
    skeletonData.slots = []
    slotsCount = input.readVarint(1)
    for (let i = 0; i < slotsCount; ++i) {
        const slotName = input.readString()
        const boneIndex = input.readVarint(1)
        const boneData = skeletonData.bones[boneIndex]

        let slotData = {
            name: slotName,
            bone: boneData.name,
        }

        let color = input.readColorHex()
        if (color != 'ffffffff') {
            slotData.color = color
        }
        let dark = input.readColorHex()
        if (dark != 'ffffffff') {
            slotData.dark = dark
        }
        // 读取附加名称和混合模式
        slotData.attachment = input.readString()
        slotData.blend = ['normal', 'additive', 'multiply', 'screen'][input.readVarint(1)]
        skeletonData.slots[i] = slotData
    }

    /* IK constraints. */
    ikConstraintsCount = input.readVarint(1)
    skeletonData.ik = new Array(ikConstraintsCount)

    for (let i = 0; i < ikConstraintsCount; ++i) {
        // 创建 IK 约束数据
        let data = {
            name: input.readString(),
        }
        data.order = input.readVarint(1)
        bonesCount = input.readVarint(1)
        data.bones = new Array(data.bonesCount)
        for (let ii = 0; ii < bonesCount; ++ii) {
            data.bones[ii] = skeletonData.bones[input.readVarint(1)].name
        }
        data.target = skeletonData.bones[input.readVarint(1)].name
        data.mix = input.readFloat()
        data.bendPositive = input.readByte() != 255

        if (skeletonData.skeleton.spine.startsWith('3.7')) {
            data.compress = input.readBoolean()
            data.stretch = input.readBoolean()
            data.uniform = input.readBoolean()
        }
        skeletonData.ik[i] = data
    }

    /* Transform constraints. */
    transformConstraintsCount = input.readVarint(1)
    skeletonData.transform = new Array(transformConstraintsCount)

    for (let i = 0; i < transformConstraintsCount; ++i) {
        // 创建变换约束数据
        const data = {
            name: input.readString(input),
        }
        data.order = input.readVarint(1)

        // 读取骨骼数量
        data.bonesCount = input.readVarint(1)
        data.bones = new Array(data.bonesCount)

        for (let ii = 0; ii < data.bonesCount; ++ii) {
            data.bones[ii] = skeletonData.bones[input.readVarint(1)].name
        }

        // 读取目标骨骼
        data.target = skeletonData.bones[input.readVarint(1)].name

        // 读取布尔值和浮点值
        data.local = input.readBoolean()
        data.relative = input.readBoolean()
        data.rotation = input.readFloat()
        data.x = input.readFloat()
        data.y = input.readFloat()
        if (!data.x) delete data.x
        if (!data.y) delete data.y
        data.scaleX = input.readFloat()
        data.scaleY = input.readFloat()
        data.shearY = input.readFloat()
        data.rotateMix = input.readFloat()
        data.translateMix = input.readFloat()
        data.scaleMix = input.readFloat()
        data.shearMix = input.readFloat()

        // 将数据存储在 skeletonData 中
        skeletonData.transform[i] = data
    }

    /* Path constraints */
    pathConstraintsCount = input.readVarint(1)
    skeletonData.path = new Array(pathConstraintsCount)

    for (let i = 0; i < pathConstraintsCount; ++i) {
        const name = input.readString(input)
        // 创建路径约束数据
        const data = {
            name: name,
        }
        data.order = input.readVarint(1)
        data.bonesCount = input.readVarint(1)
        data.bones = new Array(data.bonesCount)
        for (let ii = 0; ii < data.bonesCount; ++ii) {
            data.bones[ii] = skeletonData.bones[input.readVarint(1)].name
        }
        // 读取目标槽
        data.target = skeletonData.slots[input.readVarint(1)].name
        // 读取位置模式、间距模式和旋转模式
        data.positionMode = ['fixed', 'percent'][input.readVarint(1)]
        data.spacingMode = ['length', 'fixed', 'percent'][input.readVarint(1)]
        data.rotateMode = ['tangent', 'chain', 'chainScale'][input.readVarint(1)]
        // 读取旋转偏移和位置
        data.rotation = input.readFloat(input)
        data.position = input.readFloat(input)

        // 读取间距
        data.spacing = input.readFloat(input)

        // 读取混合值
        data.rotateMix = input.readFloat(input)
        data.translateMix = input.readFloat(input)

        // 将数据存储在 skeletonData 中
        skeletonData.path[i] = data
    }

    /* Default skin. */
    skeletonData.skins = {}

    let skins = []

    skeletonData.skins.default = input.readSkin(skeletonData, nonessential)

    skins.push({
        name: 'default',
        data: skeletonData.skins.default,
    })

    let skinsCount = input.readVarint(1)

    // 如果有默认皮肤，则增加皮肤数量
    if (skeletonData.defaultSkin) {
        skinsCount++
    }

    if (skeletonData.defaultSkin) {
        skeletonData.skins.default = skeletonData.defaultSkin
    }

    /* Skins. */
    for (let i = skeletonData.defaultSkin ? 1 : 0; i < skinsCount; ++i) {
        const skinName = input.readString(input)
        skeletonData.skins[skinName] = input.readSkin(skeletonData, nonessential)
        skins.push({
            name: skinName,
            data: skeletonData.skins[skinName],
        })
    }

    // Events.
    eventsCount = input.readVarint(1)
    skeletonData.events = {}
    for (let i = 0; i < eventsCount; ++i) {
        let name = input.readString()
        let eventData = {} // 创建事件数据
        eventData.intValue = input.readVarint(0)
        eventData.floatValue = input.readFloat()
        eventData.stringValue = input.readString()
        if (version == 37) {
            eventData.audioPath = input.readString()
            if (eventData.audioPath) {
                eventData.volume = input.readFloat()
                eventData.balance = input.readFloat()
            }
        }
        skeletonData.events[name] = eventData // 存储事件数据
    }

    // Animations.
    animationsCount = input.readVarint(1)
    skeletonData.animations = {}
    for (let i = 0; i < animationsCount; ++i) {
        let name = input.readString()
        let animation = input.readAnimation(skeletonData, skins, version)
        if (!animation) {
            throw new Error('读取动画列表时出现错误')(skeletonData)
        }
        skeletonData.animations[name] = animation // 存储动画数据
    }
    return skeletonData
}
SimpleSpine.skelToJson.readSkeletonData34And35 = function (binary) {
    let skeletonData = {}
    var input = new this.BinaryInput(binary)
    let skeleton = {
        hash: input.readString(),
        spine: input.readString(),
        width: input.readFloat(),
        height: input.readFloat(),
    }
    let isSpine35 = skeleton.spine.startsWith('3.5')

    var nonessential = input.readBoolean()
    if (nonessential) {
        if (isSpine35) {
            skeleton.fps = input.readFloat()
        }
        skeleton.images = input.readString()
    }

    skeletonData.skeleton = skeleton
    /* Bones. */
    bonesCount = input.readVarint(true)
    skeletonData.bones = []
    for (var i = 0; i < bonesCount; i++) {
        let data = {
            name: input.readString(),
            parent: null,
        }
        const parentIndex = i === 0 ? null : input.readVarint(true)
        if (parentIndex != null) {
            data.parent = skeletonData.bones[parentIndex].name
        }
        // 读取骨骼属性
        data.rotation = input.readFloat()
        data.x = input.readFloat()
        data.y = input.readFloat()
        data.scaleX = input.readFloat()
        data.scaleY = input.readFloat()
        data.shearX = input.readFloat()
        data.shearY = input.readFloat()
        data.length = input.readFloat()

        let key = ['rotation', 'x', 'y', 'shearX', 'shearY', 'length']
        key.forEach((e) => {
            if (data[e] === 0) {
                delete data[e]
            }
        })
        let key2 = ['scaleX', 'scaleY']
        key2.forEach((e) => {
            if (data[e] === 1) {
                delete data[e]
            }
        })

        if (isSpine35) {
            // 读取变换模式
            let transformMode = [
                'normal',
                'onlytranslation',
                'norotationorreflection',
                'noscale',
                'noscaleorreflection',
            ]
            data.transform = transformMode[input.readVarint(true)]
        } else {
            data.inheritRotation = input.readBoolean()
            data.inheritScale = input.readBoolean()
        }

        if (nonessential) {
            data.color = input.readColorHex() // 跳过骨骼颜色
        }
        skeletonData.bones.push(data)
    }

    /* Slots. */
    skeletonData.slots = []
    slotsCount = input.readVarint(1)
    for (let i = 0; i < slotsCount; ++i) {
        const slotName = input.readString()
        const boneIndex = input.readVarint(1)
        const boneData = skeletonData.bones[boneIndex]

        let slotData = {
            name: slotName,
            bone: boneData.name,
        }

        let color = input.readColorHex()
        if (color != 'ffffffff') {
            slotData.color = color
        }
        // let dark = input.readColorHex()
        // if(dark != "ffffffff"){
        //     slotData.dark = dark
        // }
        // 读取附加名称和混合模式
        slotData.attachment = input.readString()
        slotData.blend = ['normal', 'additive', 'multiply', 'screen'][input.readVarint(1)]
        skeletonData.slots[i] = slotData
    }

    /* IK constraints. */
    ikConstraintsCount = input.readVarint(1)
    skeletonData.ik = new Array(ikConstraintsCount)

    for (let i = 0; i < ikConstraintsCount; ++i) {
        // 创建 IK 约束数据
        let data = {
            name: input.readString(),
        }
        if (isSpine35) {
            data.order = input.readVarint(1)
        }
        bonesCount = input.readVarint(1)
        data.bones = new Array(data.bonesCount)
        for (let ii = 0; ii < bonesCount; ++ii) {
            data.bones[ii] = skeletonData.bones[input.readVarint(1)].name
        }
        data.target = skeletonData.bones[input.readVarint(1)].name
        data.mix = input.readFloat()
        data.bendPositive = input.readByte() != 255
        skeletonData.ik[i] = data
    }

    /* Transform constraints. */
    transformConstraintsCount = input.readVarint(1)
    skeletonData.transform = new Array(transformConstraintsCount)

    for (let i = 0; i < transformConstraintsCount; ++i) {
        // 创建变换约束数据
        const data = {
            name: input.readString(input),
        }
        if (isSpine35) {
            data.order = input.readVarint(1)
        }

        // 读取骨骼数量
        data.bonesCount = input.readVarint(1)
        data.bones = new Array(data.bonesCount)

        for (let ii = 0; ii < data.bonesCount; ++ii) {
            data.bones[ii] = skeletonData.bones[input.readVarint(1)].name
        }

        // 读取目标骨骼
        data.target = skeletonData.bones[input.readVarint(1)].name

        data.rotation = input.readFloat()
        data.x = input.readFloat()
        data.y = input.readFloat()
        if (!data.x) delete data.x
        if (!data.y) delete data.y
        data.scaleX = input.readFloat()
        data.scaleY = input.readFloat()
        data.shearY = input.readFloat()
        data.rotateMix = input.readFloat()
        data.translateMix = input.readFloat()
        data.scaleMix = input.readFloat()
        data.shearMix = input.readFloat()

        // 将数据存储在 skeletonData 中
        skeletonData.transform[i] = data
    }

    /* Path constraints */
    pathConstraintsCount = input.readVarint(1)
    skeletonData.path = new Array(pathConstraintsCount)

    for (let i = 0; i < pathConstraintsCount; ++i) {
        const name = input.readString(input)
        // 创建路径约束数据
        const data = {
            name: name,
        }
        if (isSpine35) {
            data.order = input.readVarint(1)
        }
        data.bonesCount = input.readVarint(1)
        data.bones = new Array(data.bonesCount)
        for (let ii = 0; ii < data.bonesCount; ++ii) {
            data.bones[ii] = skeletonData.bones[input.readVarint(1)].name
        }
        // 读取目标槽
        data.target = skeletonData.slots[input.readVarint(1)].name
        // 读取位置模式、间距模式和旋转模式
        data.positionMode = ['fixed', 'percent'][input.readVarint(1)]
        data.spacingMode = ['length', 'fixed', 'percent'][input.readVarint(1)]
        data.rotateMode = ['tangent', 'chain', 'chainScale'][input.readVarint(1)]
        // 读取旋转偏移和位置
        data.rotation = input.readFloat(input)
        data.position = input.readFloat(input)

        // 读取间距
        data.spacing = input.readFloat(input)

        // 读取混合值
        data.rotateMix = input.readFloat(input)
        data.translateMix = input.readFloat(input)

        // 将数据存储在 skeletonData 中
        skeletonData.path[i] = data

        Object.keys(data).forEach((e) => {
            if (data[e] == 0) {
                delete data[e]
            }
        })
    }

    /* Default skin. */
    skeletonData.skins = {}

    let skins = []

    skeletonData.skins.default = input.readSkin(skeletonData, nonessential)

    skins.push({
        name: 'default',
        data: skeletonData.skins.default,
    })

    let skinsCount = input.readVarint(1)

    // 如果有默认皮肤，则增加皮肤数量
    if (skeletonData.defaultSkin) {
        skinsCount++
    }

    if (skeletonData.defaultSkin) {
        skeletonData.skins.default = skeletonData.defaultSkin
    }

    /* Skins. */
    for (let i = skeletonData.defaultSkin ? 1 : 0; i < skinsCount; ++i) {
        const skinName = input.readString(input)
        skeletonData.skins[skinName] = input.readSkin(skeletonData, nonessential)
        skins.push({
            name: skinName,
            data: skeletonData.skins[skinName],
        })
    }

    // Events.
    eventsCount = input.readVarint(1)
    skeletonData.events = {}
    for (let i = 0; i < eventsCount; ++i) {
        let name = input.readString()
        let eventData = {} // 创建事件数据
        eventData.intValue = input.readVarint(0)
        eventData.floatValue = input.readFloat()
        eventData.stringValue = input.readString()
        skeletonData.events[name] = eventData // 存储事件数据
    }

    // Animations.
    animationsCount = input.readVarint(1)
    skeletonData.animations = {}
    for (let i = 0; i < animationsCount; ++i) {
        let name = input.readString()
        let animation = input.readAnimation(skeletonData, skins)
        if (!animation) {
            throw new Error('读取动画列表时出现错误')
        }
        skeletonData.animations[name] = animation // 存储动画数据
    }
    return skeletonData
}
SimpleSpine.skelToJson.readSkeletonData21 = function (binary) {
    let skeletonData = {}
    var input = new this.BinaryInput(binary)
    let skeleton = {
        hash: input.readString(),
        spine: input.readString(),
        width: input.readFloat(),
        height: input.readFloat(),
    }

    var nonessential = input.readBoolean()
    if (nonessential) {
        skeleton.images = input.readString()
    }

    skeletonData.skeleton = skeleton
    /* Bones. */
    bonesCount = input.readVarint(true)
    skeletonData.bones = []
    for (var i = 0; i < bonesCount; i++) {
        let data = {
            name: input.readString(),
        }
        const parentIndex = input.readVarint(true) - 1
        if (parentIndex != -1) {
            data.parent = skeletonData.bones[parentIndex].name
        }
        // 读取骨骼属性
        data.x = input.readFloat()
        data.y = input.readFloat()
        data.scaleX = input.readFloat()
        data.scaleY = input.readFloat()
        data.rotation = input.readFloat()
        data.length = input.readFloat()
        data.flipX = input.readBoolean()
        data.flipY = input.readBoolean()
        data.inheritScale = input.readBoolean()
        data.inheritRotation = input.readBoolean()

        let key = ['rotation', 'x', 'y', 'length', 'flipX', 'flipY']
        key.forEach((e) => {
            if (data[e] == 0) {
                delete data[e]
            }
        })
        let key2 = ['scaleX', 'scaleY']
        key2.forEach((e) => {
            if (data[e] == 1) {
                delete data[e]
            }
        })

        if (nonessential) {
            data.color = input.readColorHex() // 跳过骨骼颜色
        }
        skeletonData.bones.push(data)
    }

    /* IK constraints. */
    ikConstraintsCount = input.readVarint(1)
    skeletonData.ik = new Array(ikConstraintsCount)

    for (let i = 0; i < ikConstraintsCount; ++i) {
        // 创建 IK 约束数据
        let data = {
            name: input.readString(),
        }
        bonesCount = input.readVarint(1)
        data.bones = new Array(data.bonesCount)
        for (let ii = 0; ii < bonesCount; ++ii) {
            data.bones[ii] = skeletonData.bones[input.readVarint(1)].name
        }
        data.target = skeletonData.bones[input.readVarint(1)].name
        data.mix = input.readFloat()
        data.bendPositive = input.readByte() != 255
        skeletonData.ik[i] = data
    }

    /* Slots. */
    skeletonData.slots = []
    slotsCount = input.readVarint(1)
    for (let i = 0; i < slotsCount; ++i) {
        const slotName = input.readString()
        const boneIndex = input.readVarint(1)
        const boneData = skeletonData.bones[boneIndex]

        let slotData = {
            name: slotName,
            bone: boneData.name,
        }

        let color = input.readColorHex()
        if (color != 'ffffffff') {
            slotData.color = color
        }
        slotData.attachment = input.readString()
        slotData.blend = ['normal', 'additive', 'multiply', 'screen'][input.readVarint(1)]
        skeletonData.slots[i] = slotData
    }

    /* Default skin. */
    skeletonData.skins = {}

    let skins = []

    skeletonData.skins.default = input.readSkin21(skeletonData, nonessential)

    skins.push({
        name: 'default',
        data: skeletonData.skins.default,
    })

    let skinsCount = input.readVarint(1)

    if (skeletonData.defaultSkin) {
        skinsCount++
    }

    if (skeletonData.defaultSkin) {
        skeletonData.skins.default = skeletonData.defaultSkin
    }

    /* Skins. */
    for (let i = skeletonData.defaultSkin ? 1 : 0; i < skinsCount; ++i) {
        const skinName = input.readString(input)
        skeletonData.skins[skinName] = input.readSkin21(skeletonData, nonessential)
        skins.push({
            name: skinName,
            data: skeletonData.skins[skinName],
        })
    }

    // Events.
    eventsCount = input.readVarint(1)
    skeletonData.events = {}
    for (let i = 0; i < eventsCount; ++i) {
        let name = input.readString()
        let eventData = {} // 创建事件数据
        eventData.intValue = input.readVarint(0)
        eventData.floatValue = input.readFloat()
        eventData.stringValue = input.readString()
        skeletonData.events[name] = eventData // 存储事件数据
    }

    // Animations.
    animationsCount = input.readVarint(1)
    skeletonData.animations = {}
    for (let i = 0; i < animationsCount; ++i) {
        let name = input.readString()
        let animation = input.readAnimation21(skeletonData, skins)
        if (!animation) {
            throw new Error('读取动画列表时出现错误')(skeletonData)
        }
        skeletonData.animations[name] = animation // 存储动画数据
    }
    return skeletonData
}
