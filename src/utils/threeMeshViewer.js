import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export class ThreeMeshViewer {
    constructor(container) {
        if (!container) throw new Error('Container element is required')
        this.container = container
        this.scene = null
        this.camera = null
        this.renderer = null
        this.controls = null
        this.animationFrameId = null
        this.meshGroup = null
        this.currentMesh = null
        this.wireframeMesh = null
        this.resizeObserver = null

        this._init()
    }

    _init() {
        // 1. Scene
        this.scene = new THREE.Scene()
        this.scene.background = new THREE.Color(0x0f172a)

        // 2. Camera
        const width = this.container.clientWidth || 800
        const height = this.container.clientHeight || 450
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
        this.camera.position.set(0, 0, 5)

        // 3. Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true })
        this.renderer.setSize(width, height)
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        this.container.appendChild(this.renderer.domElement)

        // 4. OrbitControls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement)
        this.controls.enableDamping = true
        this.controls.dampingFactor = 0.05

        // 5. Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
        this.scene.add(ambientLight)

        const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8)
        dirLight1.position.set(5, 10, 7)
        this.scene.add(dirLight1)

        const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.3)
        dirLight2.position.set(-5, -5, -5)
        this.scene.add(dirLight2)

        // Group for holding the mesh
        this.meshGroup = new THREE.Group()
        this.scene.add(this.meshGroup)

        // 6. Resize Observer
        this.resizeObserver = new ResizeObserver(() => {
            if (!this.container || !this.renderer || !this.camera) return
            const w = this.container.clientWidth
            const h = this.container.clientHeight
            if (w && h) {
                this.camera.aspect = w / h
                this.camera.updateProjectionMatrix()
                this.renderer.setSize(w, h)
            }
        })
        this.resizeObserver.observe(this.container)

        // 7. Render/Animate Loop
        const animate = () => {
            this.animationFrameId = requestAnimationFrame(animate)
            if (this.controls) this.controls.update()
            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera)
            }
        }
        animate()
    }

    updateMesh(mesh, showWireframe = false) {
        if (!this.scene || !this.meshGroup) return

        // Clear old meshes
        while (this.meshGroup.children.length > 0) {
            const obj = this.meshGroup.children[0]
            this.meshGroup.remove(obj)
            if (obj.geometry) obj.geometry.dispose()
            if (obj.material) obj.material.dispose()
        }

        if (!mesh.vertices || mesh.vertices.length === 0) return

        // Create BufferGeometry
        const geometry = new THREE.BufferGeometry()

        // Flatten vertices, negating X coordinate to match OBJ export space
        const flatVertices = []
        for (let i = 0; i < mesh.vertices.length; i++) {
            flatVertices.push(-mesh.vertices[i][0], mesh.vertices[i][1], mesh.vertices[i][2])
        }
        const vertices = new Float32Array(flatVertices)
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))

        // Add indices
        if (mesh.indices && mesh.indices.length > 0) {
            geometry.setIndex(mesh.indices)
        }

        // Flatten normals if present, negating X normal to match OBJ space
        if (mesh.normals && mesh.normals.length > 0) {
            const flatNormals = []
            for (let i = 0; i < mesh.normals.length; i++) {
                flatNormals.push(-mesh.normals[i][0], mesh.normals[i][1], mesh.normals[i][2])
            }
            const normals = new Float32Array(flatNormals)
            geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
        } else {
            geometry.computeVertexNormals()
        }

        // UVs
        if (mesh.uv0 && mesh.uv0.length > 0) {
            const uvs = new Float32Array(mesh.uv0.flat())
            geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
        }

        // Material (standard mesh normal material for beautiful colorful shading)
        const material = new THREE.MeshNormalMaterial({
            side: THREE.DoubleSide,
        })

        this.currentMesh = new THREE.Mesh(geometry, material)
        this.meshGroup.add(this.currentMesh)

        // Wireframe overlay
        const wireMaterial = new THREE.MeshBasicMaterial({
            color: 0x3b82f6,
            wireframe: true,
            transparent: true,
            opacity: 0.8,
        })
        this.wireframeMesh = new THREE.Mesh(geometry, wireMaterial)
        this.wireframeMesh.visible = showWireframe
        this.meshGroup.add(this.wireframeMesh)

        this.resetCamera()
    }

    setWireframeVisible(visible) {
        if (this.wireframeMesh) {
            this.wireframeMesh.visible = visible
        }
    }

    resetCamera() {
        if (!this.currentMesh || !this.controls || !this.camera) return
        const geometry = this.currentMesh.geometry
        geometry.computeBoundingBox()
        const box = geometry.boundingBox
        const sizeVec = new THREE.Vector3()
        box.getSize(sizeVec)
        const center = new THREE.Vector3()
        box.getCenter(center)

        this.controls.target.copy(center)

        const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z)
        const fov = this.camera.fov * (Math.PI / 180)
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2))
        cameraZ *= 1.5 // Zoom out a bit

        // Set near/far clipping planes
        this.camera.near = maxDim / 100
        this.camera.far = maxDim * 100
        this.camera.updateProjectionMatrix()

        this.camera.position.set(center.x, center.y, center.z + (cameraZ || 5))
        this.controls.update()
    }

    destroy() {
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId)
        if (this.resizeObserver) this.resizeObserver.disconnect()
        if (this.renderer) {
            this.renderer.dispose()
            this.container?.removeChild(this.renderer.domElement)
        }
        if (this.currentMesh) {
            this.currentMesh.geometry.dispose()
            this.currentMesh.material.dispose()
        }
        if (this.wireframeMesh) {
            this.wireframeMesh.geometry.dispose()
            this.wireframeMesh.material.dispose()
        }
    }
}
