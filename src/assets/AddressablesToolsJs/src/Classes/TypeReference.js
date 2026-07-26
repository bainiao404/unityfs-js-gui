export class TypeReference {
    constructor(clsid) {
        this.Clsid = clsid
    }

    toString() {
        return `TypeReference(Clsid=${this.Clsid})`
    }
}
