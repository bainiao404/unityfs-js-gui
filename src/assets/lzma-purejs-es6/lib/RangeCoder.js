import freeze from './freeze.js'
import Decoder from './RangeCoder/Decoder.js'
import Encoder from './RangeCoder/Encoder.js'
import BitTreeDecoder from './RangeCoder/BitTreeDecoder.js'
import BitTreeEncoder from './RangeCoder/BitTreeEncoder.js'

export default freeze({
    Decoder: Decoder,
    Encoder: Encoder,
    BitTreeDecoder: BitTreeDecoder,
    BitTreeEncoder: BitTreeEncoder,
})
