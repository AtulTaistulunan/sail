import { useEffect, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { stepPhysics, type PhysicsState, type SailingControls } from '../utils/sailingMath';

// 座標慣例（已驗證）：世界座標 北 = -Z、東 = +X、上 = +Y。
// 船體局部座標：船首朝 -Z、+X = 右舷。航向換算 rotation.y = -HDG。
// 傾角：rotation.z = +heel，heel > 0（風從右舷來）時船往左舷倒。

interface Scene3DProps {
  controlsRef: MutableRefObject<SailingControls>;
  physicsRef: MutableRefObject<PhysicsState>;
  throttleDashboardUpdate: (now: number) => void;
}

const SAIL_WIDTH = 5;
const SAIL_HEIGHT = 10;
const SEGMENTS = 20;
// 風標線固定在帆面 Y=3、距前緣 1.25 的頂點（第 14 列、第 5 欄，已驗證）
const TELLTALE_INDEX = 14 * (SEGMENTS + 1) + 5;

export const Scene3D = ({ controlsRef, physicsRef, throttleDashboardUpdate }: Scene3DProps) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);

    const camera = new THREE.PerspectiveCamera(
      60,
      currentMount.clientWidth / currentMount.clientHeight,
      0.1,
      1000,
    );

    // --- 自建滑鼠拖曳視角（不依賴 OrbitControls） ---
    let camRadius = 25;
    let camTheta = -Math.PI / 4;
    let camPhi = Math.PI / 3;
    let isDragging = false;
    let previousMouse = { x: 0, y: 0 };

    const updateCamera = () => {
      camera.position.x = camRadius * Math.sin(camPhi) * Math.sin(camTheta);
      camera.position.y = camRadius * Math.cos(camPhi);
      camera.position.z = camRadius * Math.sin(camPhi) * Math.cos(camTheta);
      camera.lookAt(0, 0, 0);
    };
    updateCamera();

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMouse = { x: e.offsetX, y: e.offsetY };
    };
    const handleMouseUp = () => {
      isDragging = false;
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      camTheta -= (e.offsetX - previousMouse.x) * 0.01;
      camPhi -= (e.offsetY - previousMouse.y) * 0.01;
      camPhi = Math.max(0.01, Math.min(Math.PI - 0.01, camPhi));
      previousMouse = { x: e.offsetX, y: e.offsetY };
      updateCamera();
    };
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      camRadius = Math.max(5, Math.min(100, camRadius + e.deltaY * 0.05));
      updateCamera();
    };

    currentMount.addEventListener('mousedown', handleMouseDown);
    currentMount.addEventListener('mousemove', handleMouseMove);
    currentMount.addEventListener('mouseup', handleMouseUp);
    currentMount.addEventListener('mouseleave', handleMouseUp);
    currentMount.addEventListener('wheel', handleWheel, { passive: false });

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    currentMount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    const boatGroup = new THREE.Group();
    boatGroup.rotation.order = 'YXZ'; // 先傾斜（繞船體縱軸）再轉航向
    scene.add(boatGroup);

    // 船身
    const hullMesh = new THREE.Mesh(
      new THREE.BoxGeometry(4, 2, 12),
      new THREE.MeshStandardMaterial({ color: 0x333333 }),
    );
    hullMesh.position.y = 1;
    boatGroup.add(hullMesh);

    // 船首標記（尖端朝 -Z）
    const bowGeo = new THREE.ConeGeometry(1, 2, 4);
    bowGeo.rotateX(-Math.PI / 2);
    const bowMesh = new THREE.Mesh(bowGeo, new THREE.MeshStandardMaterial({ color: 0xffaa00 }));
    bowMesh.position.set(0, 2.5, -5.5);
    boatGroup.add(bowMesh);

    // 桅杆
    const mastMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 12, 16),
      new THREE.MeshStandardMaterial({ color: 0xcccccc }),
    );
    mastMesh.position.set(0, 7, -2);
    boatGroup.add(mastMesh);

    // 主帆樞軸（位於桅杆底部）
    const mainSailPivot = new THREE.Group();
    mainSailPivot.position.set(0, 2, -2);
    boatGroup.add(mainSailPivot);

    // 帆面：PlaneGeometry 經 rotateY(-π/2) 後，前緣 Z=0、後緣 Z=+5（朝船尾），弧度變形在 X 軸
    const mainSailGeo = new THREE.PlaneGeometry(SAIL_WIDTH, SAIL_HEIGHT, SEGMENTS, SEGMENTS);
    mainSailGeo.translate(SAIL_WIDTH / 2, SAIL_HEIGHT / 2, 0);
    mainSailGeo.rotateY(-Math.PI / 2);
    (mainSailGeo.attributes.position as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);
    const origPositions = new Float32Array(mainSailGeo.attributes.position.array);

    const mainSailMesh = new THREE.Mesh(
      mainSailGeo,
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, side: THREE.DoubleSide }),
    );
    mainSailPivot.add(mainSailMesh);

    // 風標線：帆 mesh 的子物件，與幾何頂點共用局部座標
    const telltaleGeo = new THREE.BoxGeometry(0.03, 0.03, 0.8);
    telltaleGeo.translate(0, 0, 0.4); // 原點在前端，繞此點旋轉
    const portTelltale = new THREE.Mesh(telltaleGeo, new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    const stbdTelltale = new THREE.Mesh(telltaleGeo, new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
    mainSailMesh.add(portTelltale);
    mainSailMesh.add(stbdTelltale);

    const visualState = { currentCamber: 0, currentLuff: 0 };
    const tPos = new THREE.Vector3();
    const tNorm = new THREE.Vector3();
    let lastTime = performance.now();
    let animationFrameId = 0;

    // 唯一的動畫迴圈：物理 → 儀表板節流 → 帆面變形 → 渲染
    const tick = (time: number) => {
      const dt = (time - lastTime) / 1000; // stepPhysics 內部會限制在 [0, 0.1]
      lastTime = time;

      const controls = controlsRef.current;

      // 1. 物理
      const { next } = stepPhysics(physicsRef.current, controls, dt);
      Object.assign(physicsRef.current, next);
      const { aeroState, awa } = next;

      // 2. 儀表板（每秒 10 次）
      throttleDashboardUpdate(time);

      // 3. 帆面變形
      mainSailPivot.rotation.y = -controls.mainSailAngle * (Math.PI / 180);

      const targetCamber = aeroState === 'OPTIMAL' ? 1.0 : aeroState === 'STALL' ? 0.6 : 0.2;
      const targetLuff =
        aeroState === 'NOGO' || aeroState === 'LUFFING' ? 1.0 : aeroState === 'STALL' ? 0.2 : 0;
      const alphaVisual = 1 - Math.exp(-Math.min(Math.max(dt, 0), 0.1) / 0.2);
      visualState.currentCamber += (targetCamber - visualState.currentCamber) * alphaVisual;
      visualState.currentLuff += (targetLuff - visualState.currentLuff) * alphaVisual;

      const positions = mainSailGeo.attributes.position.array as Float32Array;
      const camberDir = awa > 0 ? -1 : 1; // 風從右舷來 → 往左舷（背風側，-X）鼓起
      const timeSec = time / 1000;

      for (let i = 0; i < positions.length; i += 3) {
        const origY = origPositions[i + 1];
        const normZ = origPositions[i + 2] / SAIL_WIDTH;
        const normY = origY / SAIL_HEIGHT;

        const camberX =
          Math.sin(normZ * Math.PI) * 0.8 * visualState.currentCamber * camberDir * (1 - normY * 0.3);
        const flutterX =
          Math.sin(timeSec * 15 - origY * 3) * 0.2 * visualState.currentLuff * Math.max(0, 1 - normZ * 3);

        positions[i] = origPositions[i] + camberX + flutterX;
      }
      mainSailGeo.attributes.position.needsUpdate = true;
      mainSailGeo.computeVertexNormals();

      // 4. 風標線附著於變形後的頂點與法線（未變形時法線為 -X = 左舷）
      const v = TELLTALE_INDEX * 3;
      const normals = mainSailGeo.attributes.normal.array;
      tPos.set(positions[v], positions[v + 1], positions[v + 2]);
      tNorm.set(normals[v], normals[v + 1], normals[v + 2]);
      portTelltale.position.copy(tPos).addScaledVector(tNorm, 0.05);
      stbdTelltale.position.copy(tPos).addScaledVector(tNorm, -0.05);

      const dropAngle = aeroState === 'STALL' || aeroState === 'NOGO' ? Math.PI / 2.5 : 0; // +值 = 往下垂
      portTelltale.rotation.x = dropAngle + Math.sin(timeSec * 20) * 0.1 * visualState.currentLuff;
      stbdTelltale.rotation.x = dropAngle + Math.sin(timeSec * 22) * 0.1 * visualState.currentLuff;

      // 5. 船體姿態與渲染
      boatGroup.rotation.y = -controls.hdg * (Math.PI / 180);
      boatGroup.rotation.z = next.heel * (Math.PI / 180);

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);

    const handleResize = () => {
      camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      currentMount.removeEventListener('mousedown', handleMouseDown);
      currentMount.removeEventListener('mousemove', handleMouseMove);
      currentMount.removeEventListener('mouseup', handleMouseUp);
      currentMount.removeEventListener('mouseleave', handleMouseUp);
      currentMount.removeEventListener('wheel', handleWheel);

      scene.traverse((object) => {
        const obj = object as THREE.Mesh | THREE.Line | THREE.Points;
        if (!('isMesh' in obj || 'isLine' in obj || 'isPoints' in obj)) return;
        obj.geometry?.dispose();
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        materials.forEach((mat) => {
          if (!mat) return;
          for (const value of Object.values(mat)) {
            if (value instanceof THREE.Texture) value.dispose();
          }
          mat.dispose();
        });
      });

      renderer.dispose();
      if (renderer.domElement.parentNode === currentMount) {
        currentMount.removeChild(renderer.domElement);
      }
    };
  }, [controlsRef, physicsRef, throttleDashboardUpdate]);

  return <div ref={mountRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />;
};
