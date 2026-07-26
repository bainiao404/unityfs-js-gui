import freeze from './freeze.js'
import Decoder from './LZMA/Decoder.js'
import Encoder from './LZMA/Encoder.js'

export default freeze({
    Decoder: Decoder,
    Encoder: Encoder,
})
