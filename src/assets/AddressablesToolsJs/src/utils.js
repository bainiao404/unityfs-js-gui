/**
 * Decode base64 string to ArrayBuffer (works in browser and Node)
 */
export function base64ToArrayBuffer(base64) {
    if (typeof Buffer !== 'undefined') {
        const buf = Buffer.from(base64, 'base64')
        return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
    }
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes.buffer
}
