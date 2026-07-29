import {
    ImageIcon,
    MusicIcon,
    FileCodeIcon,
    File1Icon,
    LettersAIcon,
    AdjustmentIcon,
    LayersIcon,
    ViewModuleIcon,
    FileIcon,
} from 'tdesign-icons-vue-next'

const iconMap = {
    Texture2D: ImageIcon,
    Sprite: ImageIcon,
    AudioClip: MusicIcon,
    MonoBehaviour: FileCodeIcon,
    MonoScript: FileCodeIcon,
    Shader: FileCodeIcon,
    TextAsset: File1Icon,
    Font: LettersAIcon,
    Material: AdjustmentIcon,
    Mesh: LayersIcon,
    AssetBundle: ViewModuleIcon,
}

export const getFileIconComponent = (className) => {
    return iconMap[className] || FileIcon
}

export const getIconColorClass = (className) => {
    const colorMap = {
        Texture2D: 'icon-color-image',
        Sprite: 'icon-color-image',
        AudioClip: 'icon-color-audio',
        MonoBehaviour: 'icon-color-code',
        MonoScript: 'icon-color-code',
        Shader: 'icon-color-code',
        TextAsset: 'icon-color-text',
        Font: 'icon-color-font',
        Material: 'icon-color-material',
        Mesh: 'icon-color-mesh',
        AssetBundle: 'icon-color-bundle',
    }
    return colorMap[className] || 'icon-color-default'
}
