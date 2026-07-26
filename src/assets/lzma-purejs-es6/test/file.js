import assert from 'assert'
import lzmajs from '../main.js'
import fs from 'fs'

describe('lzma file decode', function () {
    ;['sample0', 'sample1', 'sample2', 'sample3', 'sample4'].forEach(function (f) {
        it('should correctly decode ' + f, function () {
            var compressedData = fs.readFileSync('test/' + f + '.lzma')
            var referenceData = fs.readFileSync('test/' + f + '.ref')
            var data = lzmajs.decompressFile(compressedData)
            // convert to buffer
            data = Buffer.from(data)
            assert.equal(data.toString('hex'), referenceData.toString('hex'))
        })
    })
})

describe('lzma file encode->decode', function () {
    ;['sample0', 'sample1', 'sample2', 'sample3', 'sample4'].forEach(function (f) {
        it('encoded ' + f + ' should correctly decode', function () {
            var referenceData = fs.readFileSync('test/' + f + '.ref')
            var data = lzmajs.compressFile(referenceData)
            // convert to buffer
            data = Buffer.from(data)
            // round trip
            var data2 = lzmajs.decompressFile(data)
            // convert to buffer
            data2 = Buffer.from(data2)
            assert.equal(referenceData.toString('hex'), data2.toString('hex'))
        })
    })
})
