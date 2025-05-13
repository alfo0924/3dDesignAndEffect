document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('bearCanvas');
    if (!canvas) {
        console.error("錯誤：找不到 ID 為 'bearCanvas' 的 canvas 元素！");
        return;
    }

    // 1. 場景 (Scene)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xd3e0ea); // 設定場景背景色

    // 2. 攝影機 (Camera)
    const camera = new THREE.PerspectiveCamera(
        60, // 視野角度 (FOV) - 調整以獲得更合適的視野
        window.innerWidth / window.innerHeight, // 長寬比
        0.1, // 近裁剪面
        1000 // 遠裁剪面
    );
    // 初始攝影機位置，模型載入後會調整
    camera.position.set(0, 1.5, 7);

    // 3. 渲染器 (Renderer)
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true, // 開啟抗鋸齒，使模型邊緣更平滑
        alpha: true // 允許透明背景 (如果需要CSS背景)
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 優化高解析度螢幕顯示
    renderer.shadowMap.enabled = true; // 啟用陰影
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // 更柔和的陰影邊緣

    // 4. 光源 (Light)
    // 環境光，提供整體基礎照明
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    // 平行光，模擬太陽光，用於產生方向性陰影
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(10, 15, 10); // 調整光源位置
    directionalLight.castShadow = true; // 此光源會投射陰影
    // 設定陰影品質
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    scene.add(directionalLight);
    // 可選: 平行光輔助器，用於調試光源位置
    // const dirLightHelper = new THREE.DirectionalLightHelper(directionalLight, 5);
    // scene.add(dirLightHelper);

    // 5. 地板 (用於接收陰影，使場景更完整)
    const planeGeometry = new THREE.PlaneGeometry(30, 30);
    const planeMaterial = new THREE.MeshStandardMaterial({
        color: 0xbbbbbb, // 地板顏色
        roughness: 0.8,
        metalness: 0.2
    });
    const groundPlane = new THREE.Mesh(planeGeometry, planeMaterial);
    groundPlane.rotation.x = -Math.PI / 2; // 將平面旋轉至水平
    groundPlane.position.y = 0;          // 設定地板在Y軸的位置
    groundPlane.receiveShadow = true;    // 地板接收陰影
    scene.add(groundPlane);

    // 6. GLTF 模型載入器
    const loader = new THREE.GLTFLoader();
    let model; // 用於儲存載入的模型

    // **重要提示：請將下面的路徑替換為您自己的小熊 GLTF/GLB 模型檔案路徑**
    // 這是一個公開的狐狸模型作為範例，您需要替換它。
    // 例如: const modelPath = 'models/your_bear.gltf';
    const modelPath = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Fox/glTF-Binary/Fox.glb';

    loader.load(
        modelPath,
        function (gltf) {
            model = gltf.scene;
            console.log("3D 模型載入成功!");

            // 調整模型的大小、初始位置和旋轉 [4]
            // 這些值需要根據您的具體模型進行調整
            // model.scale.set(0.05, 0.05, 0.05); // 範例：如果模型太大，可以縮小
            // model.position.set(0, 0, 0); // 模型初始位置 (Y設為0使其在地板上)
            // model.rotation.y = Math.PI; // 初始旋轉 (範例：將模型轉180度)

            // 自動調整模型使其適合視窗並投射陰影
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());

            // 將模型移動到原點 (基於其包圍盒中心)並放在地板上
            model.position.x += (model.position.x - center.x);
            model.position.y += (model.position.y - center.y); // 先置中Y
            model.position.y += (size.y / 2); // 再將底部移到Y=0 (地板)
            model.position.z += (model.position.z - center.z);

            // 讓模型及其所有子網格都能投射和接收陰影
            model.traverse(function (node) {
                if (node.isMesh) {
                    node.castShadow = true;      // 物件投射陰影
                    node.receiveShadow = true;   // 物件接收陰影 (較少用在主模型上，但可保留)
                    // 可選：調整材質以獲得更好的視覺效果
                    if (node.material) {
                        node.material.metalness = 0.1; // 降低金屬感
                        node.material.roughness = 0.7; // 增加粗糙感 (熊毛通常不光滑)
                    }
                }
            });

            scene.add(model);

            // 模型載入後，調整攝影機視角和OrbitControls的目標
            const maxDim = Math.max(size.x, size.y, size.z);
            const fov = camera.fov * (Math.PI / 180);
            let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
            cameraZ *= 2; // 增加一些距離，以便更好地觀察模型

            camera.position.set(center.x, center.y + size.y * 0.3, center.z + cameraZ); // 攝影機看向模型中心略上方

            if (controls) {
                controls.target.copy(model.position); // OrbitControls 的目標對準模型調整後的位置
                controls.maxDistance = maxDim * 3; // 根據模型大小設定最大縮放距離
                controls.minDistance = maxDim / 5; // 根據模型大小設定最小縮放距離
                controls.update();
            }
        },
        function (xhr) { // 載入進度回調
            console.log('模型載入中: ' + (xhr.loaded / xhr.total * 100) + '%');
        },
        function (error) { // 載入錯誤回調
            console.error('載入3D模型時發生錯誤:', error);
            // 可以加入一個錯誤提示或預設幾何體
            const errorGeo = new THREE.BoxGeometry(1,1,1);
            const errorMat = new THREE.MeshBasicMaterial({color: 0xff0000, wireframe: true});
            const errorCube = new THREE.Mesh(errorGeo, errorMat);
            errorCube.position.y = 0.5;
            scene.add(errorCube);
            if(controls) controls.target.set(0,0.5,0);
        }
    );

    // 7. OrbitControls (用於滑鼠互動：旋轉、縮放、平移) [3][5][7]
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // 啟用阻尼效果，使拖曳旋轉更平滑
    controls.dampingFactor = 0.05; // 阻尼係數
    controls.screenSpacePanning = false; // 設為false以在相對於相機的平面上平移
    controls.target.set(0, 1, 0); // 初始控制目標點，模型載入後會更新
    // controls.minDistance = 2;      // 最小縮放距離 (將在模型載入後根據模型大小調整)
    // controls.maxDistance = 15;     // 最大縮放距離 (將在模型載入後根據模型大小調整)
    // controls.maxPolarAngle = Math.PI / 1.8; // 限制垂直旋轉角度，防止相機翻轉到模型正下方
    controls.update(); // 初始化控制器

    // 8. 動畫迴圈 (Animation Loop)
    function animate() {
        requestAnimationFrame(animate); // 請求下一幀動畫

        controls.update(); // 如果啟用了阻尼或自動旋轉，必須在動畫循環中調用 .update()

        renderer.render(scene, camera); // 渲染場景
    }
    animate();

    // 9. 響應視窗大小變化
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight; // 更新攝影機長寬比
        camera.updateProjectionMatrix(); // 更新攝影機的投影矩陣

        renderer.setSize(window.innerWidth, window.innerHeight); // 更新渲染器大小
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 更新像素比
    });
});
