export class ContentCatalogDataJson {
    constructor(
        m_LocatorId,
        m_BuildResultHash,
        m_InstanceProviderData,
        m_SceneProviderData,
        m_ResourceProviderData,
        m_ProviderIds,
        m_InternalIds,
        m_KeyDataString,
        m_BucketDataString,
        m_EntryDataString,
        m_ExtraDataString,
        m_Keys,
        m_resourceTypes,
        m_InternalIdPrefixes,
    ) {
        this.m_LocatorId = m_LocatorId
        this.m_BuildResultHash = m_BuildResultHash
        this.m_InstanceProviderData = m_InstanceProviderData
        this.m_SceneProviderData = m_SceneProviderData
        this.m_ResourceProviderData = m_ResourceProviderData
        this.m_ProviderIds = m_ProviderIds
        this.m_InternalIds = m_InternalIds
        this.m_KeyDataString = m_KeyDataString
        this.m_BucketDataString = m_BucketDataString
        this.m_EntryDataString = m_EntryDataString
        this.m_ExtraDataString = m_ExtraDataString
        this.m_Keys = m_Keys
        this.m_resourceTypes = m_resourceTypes
        this.m_InternalIdPrefixes = m_InternalIdPrefixes || []
    }
}
