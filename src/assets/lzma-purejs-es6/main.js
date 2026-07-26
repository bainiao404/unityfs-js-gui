'use strict'
import freeze from './lib/freeze.js'
import LZ from './lib/LZ.js'
import LZMA from './lib/LZMA.js'
import RangeCoder from './lib/RangeCoder.js'
import Stream from './lib/Stream.js'
import Util from './lib/Util.js'

const compress = Util.compress
const compressFile = Util.compressFile
const decompress = Util.decompress
const decompressFile = Util.decompressFile

export default freeze({
    version: '0.9.0',
    LZ: LZ,
    LZMA: LZMA,
    RangeCoder: RangeCoder,
    Stream: Stream,
    Util: Util,
    // utility methods
    compress: compress,
    compressFile: compressFile,
    decompress: decompress,
    decompressFile: decompressFile,
})

export { LZ, LZMA, RangeCoder, Stream, Util, compress, compressFile, decompress, decompressFile }
