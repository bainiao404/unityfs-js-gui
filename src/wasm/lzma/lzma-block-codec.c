#include <stdlib.h>
#include <string.h>
#include "LzmaDec.h"

// Memory allocation callbacks for LzmaDecode
static void *SzAlloc(ISzAllocPtr p, size_t size) {
    (void)p;
    return malloc(size);
}

static void SzFree(ISzAllocPtr p, void *address) {
    (void)p;
    free(address);
}

static const ISzAlloc g_Alloc = { SzAlloc, SzFree };

// Emscripten keepalive macro
#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#define KEEPALIVE EMSCRIPTEN_KEEPALIVE
#else
#define KEEPALIVE
#endif

// We define a 32MB static buffer for memory exchange between JS and C.
// This is more than enough for typical Unity AssetBundle compression blocks (usually 128KB).
#define BUFFER_SIZE (32 * 1024 * 1024)
static unsigned char g_Buffer[BUFFER_SIZE];

KEEPALIVE
unsigned int getLinearMemoryOffset(void) {
    return (unsigned int)g_Buffer;
}

KEEPALIVE
unsigned int lzmaBlockDecode(unsigned int srcPtr, unsigned int srcLen, unsigned int destPtr, unsigned int destLen) {
    if (srcLen < 5) {
        return 0; // Header too small
    }

    const unsigned char *src = (const unsigned char *)srcPtr;
    unsigned char *dest = (unsigned char *)destPtr;

    // First 5 bytes: properties (1 byte) + dictionary size (4 bytes)
    const unsigned char *propData = src;
    unsigned int propSize = 5;

    // The compressed payload starts after the 5-byte header
    const unsigned char *payload = src + 5;
    size_t compressedLen = srcLen - 5;
    size_t uncompressedLen = destLen;

    ELzmaStatus status;
    SRes res = LzmaDecode(
        dest,
        &uncompressedLen,
        payload,
        &compressedLen,
        propData,
        propSize,
        LZMA_FINISH_ANY,
        &status,
        (ISzAllocPtr)&g_Alloc
    );

    if (res == SZ_OK) {
        return (unsigned int)uncompressedLen;
    }

    return 0; // Error
}
