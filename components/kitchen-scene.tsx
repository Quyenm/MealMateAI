"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, type ThreeElements } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import { RotateCcw, X, Star } from "lucide-react";
import * as THREE from "three";
import { motion } from "motion/react";
import { useLang, useT } from "@/components/landing/i18n";
import type { CookStep, Recipe } from "@/lib/kitchen/recipes";

type IngType = "tomato" | "egg" | "garlic" | "scallion" | "meat" | "chili" | "bottle" | "greens" | "generic";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
function ingType(name: string): IngType {
  const n = norm(name);
  if (/(ca chua|tomato)/.test(n)) return "tomato";
  if (/(trung|egg)/.test(n)) return "egg";
  if (/(toi|garlic)/.test(n)) return "garlic";
  if (/(hanh|scallion|onion|spring)/.test(n)) return "scallion";
  if (/(thit|pork|beef|meat|ba chi|suon|nac|ga|bo)/.test(n)) return "meat";
  if (/(ot|chili|chilli)/.test(n)) return "chili";
  if (/(mam|muoi|duong|tieu|sauce|salt|sugar|nuoc hang|caramel|gia vi|season|hat nem|dau)/.test(n)) return "bottle";
  if (/(rau|spinach|cai|cabbage|veg|muong|xa lach)/.test(n)) return "greens";
  return "generic";
}
const TYPE_COLOR: Record<IngType, string> = {
  tomato: "#e2483f",
  egg: "#fff3d6",
  garlic: "#f1e9d8",
  scallion: "#3f8f2f",
  meat: "#c0564a",
  chili: "#d62828",
  bottle: "#9a6b3a",
  greens: "#3b8f2f",
  generic: "#e0a35a",
};

function IngredientMesh({ type }: { type: IngType }) {
  const c = TYPE_COLOR[type];
  if (type === "tomato")
    return (
      <group>
        <mesh castShadow scale={[1, 0.9, 1]}>
          <sphereGeometry args={[0.32, 24, 24]} />
          <meshStandardMaterial color={c} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.3, 0]}>
          <coneGeometry args={[0.1, 0.14, 6]} />
          <meshStandardMaterial color="#3b6d11" roughness={0.6} />
        </mesh>
      </group>
    );
  if (type === "egg")
    return (
      <mesh castShadow scale={[0.82, 1.08, 0.82]}>
        <sphereGeometry args={[0.3, 24, 24]} />
        <meshStandardMaterial color={c} roughness={0.5} />
      </mesh>
    );
  if (type === "garlic")
    return (
      <group>
        <mesh castShadow scale={[0.8, 1, 0.8]}>
          <sphereGeometry args={[0.3, 20, 20]} />
          <meshStandardMaterial color={c} roughness={0.65} />
        </mesh>
        <mesh position={[0, 0.28, 0]}>
          <coneGeometry args={[0.07, 0.16, 8]} />
          <meshStandardMaterial color="#e8dcc2" roughness={0.7} />
        </mesh>
      </group>
    );
  if (type === "scallion")
    return (
      <group>
        {[-0.12, 0, 0.12].map((x, i) => (
          <mesh key={i} position={[x, 0.25, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.06, 0.9 - i * 0.1, 8]} />
            <meshStandardMaterial color={i === 1 ? "#4fa336" : "#3f8f2f"} roughness={0.6} />
          </mesh>
        ))}
        <mesh position={[0, -0.18, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 0.14, 8]} />
          <meshStandardMaterial color="#f5f0e0" />
        </mesh>
      </group>
    );
  if (type === "meat")
    return (
      <group>
        <mesh castShadow>
          <boxGeometry args={[0.7, 0.22, 0.45]} />
          <meshStandardMaterial color={c} roughness={0.55} />
        </mesh>
        <mesh position={[0, 0.14, 0]}>
          <boxGeometry args={[0.7, 0.08, 0.45]} />
          <meshStandardMaterial color="#f0d9c8" roughness={0.6} />
        </mesh>
      </group>
    );
  if (type === "chili")
    return (
      <group rotation={[0, 0, Math.PI / 5]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.07, 0.12, 0.6, 12]} />
          <meshStandardMaterial color={c} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.36, 0]}>
          <coneGeometry args={[0.06, 0.16, 8]} />
          <meshStandardMaterial color="#3b6d11" />
        </mesh>
      </group>
    );
  if (type === "bottle")
    return (
      <group>
        <mesh castShadow>
          <cylinderGeometry args={[0.2, 0.22, 0.5, 16]} />
          <meshStandardMaterial color={c} roughness={0.25} transparent opacity={0.85} />
        </mesh>
        <mesh position={[0, 0.34, 0]}>
          <cylinderGeometry args={[0.08, 0.1, 0.2, 12]} />
          <meshStandardMaterial color={c} transparent opacity={0.85} />
        </mesh>
        <mesh position={[0, 0.48, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 0.1, 12]} />
          <meshStandardMaterial color="#2a2622" />
        </mesh>
      </group>
    );
  if (type === "greens")
    return (
      <group>
        {(
          [
            [-0.15, 0, 0],
            [0.15, 0.05, 0.1],
            [0, 0.1, -0.12],
          ] as [number, number, number][]
        ).map((p, i) => (
          <mesh key={i} position={p} rotation={[0.3, i, 0]} castShadow scale={[1, 0.4, 1.4]}>
            <sphereGeometry args={[0.22, 12, 12]} />
            <meshStandardMaterial color={i % 2 ? "#4fa336" : c} roughness={0.6} />
          </mesh>
        ))}
      </group>
    );
  return (
    <mesh castShadow>
      <boxGeometry args={[0.5, 0.4, 0.4]} />
      <meshStandardMaterial color={c} roughness={0.5} />
    </mesh>
  );
}

function Spatula() {
  return (
    <group rotation={[0, 0, -0.4]}>
      <mesh castShadow>
        <boxGeometry args={[0.45, 0.05, 0.32]} />
        <meshStandardMaterial color="#c2c8cf" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0.42, 0.16, 0]} rotation={[0, 0, 0.5]}>
        <cylinderGeometry args={[0.04, 0.04, 0.6, 10]} />
        <meshStandardMaterial color="#5a3a22" />
      </mesh>
    </group>
  );
}

function PlateMesh(props: ThreeElements["group"]) {
  return (
    <group {...props}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.62, 0.55, 0.06, 36]} />
        <meshStandardMaterial color="#fbfbf7" roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.42, 0.46, 0.03, 36]} />
        <meshStandardMaterial color="#eef0ec" />
      </mesh>
    </group>
  );
}

function Pan(props: ThreeElements["group"]) {
  const steam = useRef<THREE.Group>(null);
  useFrame((state) => {
    const g = steam.current;
    if (!g) return;
    g.children.forEach((c, i) => {
      const mesh = c as THREE.Mesh;
      const tt = (state.clock.elapsedTime * 0.5 + i * 0.33) % 1;
      mesh.position.y = 0.45 + tt * 1.3;
      mesh.scale.setScalar(0.08 + tt * 0.2);
      (mesh.material as THREE.MeshStandardMaterial).opacity = 0.4 * (1 - tt);
    });
  });
  return (
    <group {...props}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[1, 0.88, 0.34, 40]} />
        <meshStandardMaterial color="#2a2622" roughness={0.35} metalness={0.55} />
      </mesh>
      <mesh position={[1.45, 0.04, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.07, 0.07, 1.1, 14]} />
        <meshStandardMaterial color="#19150f" roughness={0.5} />
      </mesh>
      <group ref={steam}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[(i - 1) * 0.32, 0.45, 0]}>
            <sphereGeometry args={[0.16, 12, 12]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.4} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** A food mound that grows as cooking progresses; colour blends the ingredients. */
function Mound({ progress, color, y }: { progress: number; color: THREE.Color; y: number }) {
  if (progress <= 0) return null;
  const s = 0.4 + progress * 0.7;
  return (
    <mesh position={[0, y, -0.2]} scale={[s, s * 0.5, s]} castShadow>
      <sphereGeometry args={[1, 22, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color={color} roughness={0.75} />
    </mesh>
  );
}

/** The interactive "actor" for the current step (bobs; tap to perform). */
function Actor({ step, onDone }: { step: CookStep; onDone: () => void }) {
  const ref = useRef<THREE.Group>(null);
  const goneRef = useRef(false);
  const [taps, setTaps] = useState(0);
  const needed = step.kind === "stirfry" ? 3 : 1;

  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    if (goneRef.current) {
      g.position.lerp(new THREE.Vector3(0, 0.4, -0.2), 0.12);
      g.scale.lerp(new THREE.Vector3(0.01, 0.01, 0.01), 0.14);
    } else {
      g.position.y = 0.55 + Math.sin(state.clock.elapsedTime * 2.6) * 0.07;
      if (step.kind === "stirfry") g.rotation.z = Math.sin(state.clock.elapsedTime * 6) * 0.25;
    }
  });

  function tap() {
    if (goneRef.current) return;
    const n = taps + 1;
    setTaps(n);
    if (n >= needed) {
      goneRef.current = true;
      setTimeout(onDone, 380);
    }
  }

  let content: ReactNode;
  if (step.kind === "season") content = <IngredientMesh type="bottle" />;
  else if (step.kind === "stirfry") content = <Spatula />;
  else if (step.kind === "plate") content = <PlateMesh />;
  else content = <IngredientMesh type={ingType(step.item)} />;

  return (
    <group ref={ref} position={[0, 0.55, 1.7]} onClick={tap}>
      {content}
    </group>
  );
}

export function KitchenScene({ recipe, onExit }: { recipe: Recipe; onExit: () => void }) {
  const t = useT().kitchen;
  const { lang } = useLang();
  const en = lang === "en";
  const recTitle = en && recipe.title_en ? recipe.title_en : recipe.title_vi;
  const [idx, setIdx] = useState(0);
  const n = recipe.steps.length;
  const done = idx >= n;
  const step = done ? null : recipe.steps[idx];

  const moundColor = useMemo(() => {
    const cols = recipe.steps
      .slice(0, idx)
      .map((s) => ("item" in s ? new THREE.Color(TYPE_COLOR[ingType(s.item)]) : null))
      .filter((c): c is THREE.Color => c !== null);
    if (!cols.length) return new THREE.Color("#d9a86a");
    const acc = new THREE.Color(0, 0, 0);
    cols.forEach((c) => acc.add(c));
    return acc.multiplyScalar(1 / cols.length);
  }, [idx, recipe]);

  const stepLabel = (() => {
    if (!step) return "";
    const item = "item" in step ? (en && step.item_en ? step.item_en : step.item) : "";
    if (step.kind === "chop") return `${en ? "Chop" : "Thái"} ${item}`;
    if (step.kind === "add") return `${en ? "Add" : "Cho"} ${item}${en ? "" : " vào chảo"}`;
    if (step.kind === "stirfry") return en ? "Stir-fry (tap 3×)" : "Đảo chảo (chạm 3 lần)";
    if (step.kind === "season") return `${en ? "Season:" : "Nêm"} ${item}`;
    return en ? "Plate it up" : "Bày ra đĩa";
  })();

  return (
    <div className="relative mx-auto w-full">
      <div className="h-[74vh] min-h-[460px] w-full overflow-hidden rounded-3xl bg-gradient-to-b from-[#f7e6cf] to-[#e6c89a] shadow-card ring-1 ring-white/40">
        <Canvas shadows camera={{ position: [0, 3.4, 5.4], fov: 40 }}>
          <ambientLight intensity={0.75} />
          <directionalLight position={[4, 7, 4]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />
          <mesh receiveShadow position={[0, -0.18, 0]}>
            <boxGeometry args={[8, 0.36, 4.6]} />
            <meshStandardMaterial color="#caa472" roughness={0.85} />
          </mesh>

          {done ? (
            <>
              <PlateMesh position={[0, 0.04, 0.2]} />
              <Mound progress={1} color={moundColor} y={0.16} />
            </>
          ) : (
            <>
              <Pan position={[0, 0.18, -0.2]} />
              <Mound progress={idx / n} color={moundColor} y={0.34} />
              {step && <Actor key={idx} step={step} onDone={() => setIdx((i) => i + 1)} />}
            </>
          )}

          <ContactShadows position={[0, 0, 0]} opacity={0.35} scale={12} blur={2.6} far={4} />
          <OrbitControls
            enablePan={false}
            minPolarAngle={0.4}
            maxPolarAngle={1.45}
            minDistance={3.4}
            maxDistance={9}
            autoRotate={done}
            autoRotateSpeed={0.6}
          />
        </Canvas>
      </div>

      {/* HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-4">
        <div className="rounded-2xl bg-card/85 px-3.5 py-2 shadow-card backdrop-blur">
          <p className="text-sm font-bold tracking-tight">{recTitle}</p>
          {!done && (
            <p className="text-xs text-muted-foreground">
              {idx + 1}/{n} · {stepLabel}
            </p>
          )}
        </div>
        <button
          onClick={onExit}
          aria-label={t.other}
          className="pointer-events-auto rounded-full bg-card/85 p-2 text-muted-foreground shadow-card backdrop-blur transition hover:text-foreground"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* progress bar */}
      {!done && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-6">
          <div className="flex w-full max-w-sm gap-1">
            {recipe.steps.map((_, i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full ${i < idx ? "bg-primary" : i === idx ? "bg-primary/40" : "bg-black/10"}`} />
            ))}
          </div>
        </div>
      )}

      {done && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex w-full max-w-xs flex-col items-center gap-3 rounded-3xl bg-card/95 p-6 text-center shadow-float ring-1 ring-white/60 backdrop-blur"
          >
            <div className="flex gap-1">
              {[1, 2, 3].map((s) => (
                <Star key={s} className="size-8 fill-[#f5a623] text-[#f5a623]" />
              ))}
            </div>
            <p className="text-lg font-extrabold tracking-tight">{recTitle}</p>
            <p className="text-sm text-muted-foreground">{en ? "Plated — looks delicious!" : "Dọn ra đĩa — nhìn ngon ghê!"}</p>
            <div className="flex w-full flex-col gap-2">
              <button
                onClick={() => setIdx(0)}
                className="flex items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-float transition active:scale-95"
              >
                <RotateCcw className="size-4" /> {t.again}
              </button>
              <button onClick={onExit} className="rounded-2xl bg-muted py-3 text-sm font-semibold transition hover:bg-primary/10">
                {t.other}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
