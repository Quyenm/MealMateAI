"use client";

import { useRef, useState, type ReactNode } from "react";
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
  tomato: "#e2483f", egg: "#fff3d6", garlic: "#f1e9d8", scallion: "#3f8f2f",
  meat: "#c0564a", chili: "#d62828", bottle: "#9a6b3a", greens: "#3b8f2f", generic: "#e0a35a",
};
const V3 = (a: number[]) => a as [number, number, number];

/** Whole, recognisable ingredient (used as the on-counter actor). */
function IngredientMesh({ type }: { type: IngType }) {
  const c = TYPE_COLOR[type];
  if (type === "tomato")
    return (
      <group>
        <mesh castShadow scale={V3([1, 0.9, 1])}><sphereGeometry args={[0.32, 24, 24]} /><meshStandardMaterial color={c} roughness={0.35} /></mesh>
        <mesh position={V3([0, 0.3, 0])}><coneGeometry args={[0.1, 0.14, 6]} /><meshStandardMaterial color="#3b6d11" roughness={0.6} /></mesh>
      </group>
    );
  if (type === "egg")
    return <mesh castShadow scale={V3([0.82, 1.08, 0.82])}><sphereGeometry args={[0.3, 24, 24]} /><meshStandardMaterial color={c} roughness={0.5} /></mesh>;
  if (type === "garlic")
    return (
      <group>
        <mesh castShadow scale={V3([0.8, 1, 0.8])}><sphereGeometry args={[0.3, 20, 20]} /><meshStandardMaterial color={c} roughness={0.65} /></mesh>
        <mesh position={V3([0, 0.28, 0])}><coneGeometry args={[0.07, 0.16, 8]} /><meshStandardMaterial color="#e8dcc2" roughness={0.7} /></mesh>
      </group>
    );
  if (type === "scallion")
    return (
      <group>
        {[-0.12, 0, 0.12].map((x, i) => (
          <mesh key={i} position={V3([x, 0.25, 0])} castShadow><cylinderGeometry args={[0.05, 0.06, 0.9 - i * 0.1, 8]} /><meshStandardMaterial color={i === 1 ? "#4fa336" : "#3f8f2f"} roughness={0.6} /></mesh>
        ))}
        <mesh position={V3([0, -0.18, 0])}><cylinderGeometry args={[0.09, 0.09, 0.14, 8]} /><meshStandardMaterial color="#f5f0e0" /></mesh>
      </group>
    );
  if (type === "meat")
    return (
      <group>
        <mesh castShadow><boxGeometry args={[0.7, 0.22, 0.45]} /><meshStandardMaterial color={c} roughness={0.55} /></mesh>
        <mesh position={V3([0, 0.14, 0])}><boxGeometry args={[0.7, 0.08, 0.45]} /><meshStandardMaterial color="#f0d9c8" roughness={0.6} /></mesh>
      </group>
    );
  if (type === "chili")
    return (
      <group rotation={V3([0, 0, Math.PI / 5])}>
        <mesh castShadow><cylinderGeometry args={[0.07, 0.12, 0.6, 12]} /><meshStandardMaterial color={c} roughness={0.35} /></mesh>
        <mesh position={V3([0, 0.36, 0])}><coneGeometry args={[0.06, 0.16, 8]} /><meshStandardMaterial color="#3b6d11" /></mesh>
      </group>
    );
  if (type === "bottle")
    return (
      <group>
        <mesh castShadow><cylinderGeometry args={[0.2, 0.22, 0.5, 16]} /><meshStandardMaterial color={c} roughness={0.25} transparent opacity={0.85} /></mesh>
        <mesh position={V3([0, 0.34, 0])}><cylinderGeometry args={[0.08, 0.1, 0.2, 12]} /><meshStandardMaterial color={c} transparent opacity={0.85} /></mesh>
        <mesh position={V3([0, 0.48, 0])}><cylinderGeometry args={[0.09, 0.09, 0.1, 12]} /><meshStandardMaterial color="#2a2622" /></mesh>
      </group>
    );
  if (type === "greens")
    return (
      <group>
        {([[-0.15, 0, 0], [0.15, 0.05, 0.1], [0, 0.1, -0.12]] as [number, number, number][]).map((p, i) => (
          <mesh key={i} position={p} rotation={V3([0.3, i, 0])} castShadow scale={V3([1, 0.4, 1.4])}><sphereGeometry args={[0.22, 12, 12]} /><meshStandardMaterial color={i % 2 ? "#4fa336" : c} roughness={0.6} /></mesh>
        ))}
      </group>
    );
  return <mesh castShadow><boxGeometry args={[0.5, 0.4, 0.4]} /><meshStandardMaterial color={c} roughness={0.5} /></mesh>;
}

/** What an ingredient looks like once it's IN the pan (raw vs cooked). */
function FoodBit({ type, cooked }: { type: IngType; cooked: boolean }) {
  if (type === "egg") {
    if (cooked)
      return (
        <group>
          {([[-0.1, 0, 0], [0.09, 0.02, 0.07], [0.01, 0.01, -0.09]] as [number, number, number][]).map((p, i) => (
            <mesh key={i} position={p} castShadow><sphereGeometry args={[0.1, 12, 12]} /><meshStandardMaterial color={i % 2 ? "#f7c948" : "#fce8b0"} roughness={0.6} /></mesh>
          ))}
        </group>
      );
    return (
      <group>
        <mesh scale={V3([1, 0.2, 1])}><cylinderGeometry args={[0.3, 0.32, 0.1, 18]} /><meshStandardMaterial color="#fdf6e3" roughness={0.35} transparent opacity={0.92} /></mesh>
        <mesh position={V3([0, 0.07, 0])} castShadow><sphereGeometry args={[0.12, 16, 16]} /><meshStandardMaterial color="#f5a623" roughness={0.3} /></mesh>
      </group>
    );
  }
  if (type === "tomato") {
    const col = cooked ? "#b23a2e" : "#e2483f";
    return (
      <group>
        {[0, 1, 2, 3].map((j) => {
          const a = (j / 4) * Math.PI * 2;
          return <mesh key={j} position={V3([Math.cos(a) * 0.14, 0.04, Math.sin(a) * 0.14])} rotation={V3([0, a, 0])} castShadow><boxGeometry args={[0.1, 0.07, 0.22]} /><meshStandardMaterial color={col} roughness={0.5} /></mesh>;
        })}
      </group>
    );
  }
  if (type === "meat")
    return (
      <group>
        {[0, 1, 2].map((j) => (
          <mesh key={j} position={V3([(j - 1) * 0.16, 0.05, 0])} castShadow><boxGeometry args={[0.14, 0.1, 0.14]} /><meshStandardMaterial color={cooked ? "#8a4a3a" : "#c0564a"} roughness={0.6} /></mesh>
        ))}
      </group>
    );
  if (type === "greens" || type === "scallion")
    return (
      <group>
        {[0, 1, 2].map((j) => (
          <mesh key={j} position={V3([(j - 1) * 0.12, 0.04, 0])} rotation={V3([0.3, j, 0])} scale={V3([1, 0.3, 1.3])} castShadow><sphereGeometry args={[0.12, 10, 10]} /><meshStandardMaterial color={cooked ? "#2f6d22" : "#4fa336"} roughness={0.6} /></mesh>
        ))}
      </group>
    );
  if (type === "chili")
    return <mesh rotation={V3([0, 0, 0.5])} castShadow><cylinderGeometry args={[0.04, 0.07, 0.3, 8]} /><meshStandardMaterial color="#c81d1d" /></mesh>;
  return <mesh castShadow><boxGeometry args={[0.16, 0.12, 0.16]} /><meshStandardMaterial color={TYPE_COLOR[type]} roughness={0.6} /></mesh>;
}

function PanContents({ items, cooked, y }: { items: IngType[]; cooked: boolean; y: number }) {
  return (
    <group position={V3([0, y, -0.2])}>
      {items.map((type, i) => {
        const a = (i / Math.max(1, items.length)) * Math.PI * 2 + i * 1.3;
        const r = items.length === 1 ? 0 : 0.32 + (i % 2) * 0.16;
        return (
          <group key={i} position={V3([Math.cos(a) * r, 0, Math.sin(a) * r])}>
            <FoodBit type={type} cooked={cooked} />
          </group>
        );
      })}
    </group>
  );
}

function Spatula() {
  return (
    <group rotation={V3([0, 0, -0.4])}>
      <mesh castShadow><boxGeometry args={[0.45, 0.05, 0.32]} /><meshStandardMaterial color="#c2c8cf" metalness={0.6} roughness={0.3} /></mesh>
      <mesh position={V3([0.42, 0.16, 0])} rotation={V3([0, 0, 0.5])}><cylinderGeometry args={[0.04, 0.04, 0.6, 10]} /><meshStandardMaterial color="#5a3a22" /></mesh>
    </group>
  );
}

function PlateMesh(props: ThreeElements["group"]) {
  return (
    <group {...props}>
      <mesh castShadow receiveShadow><cylinderGeometry args={[0.62, 0.55, 0.06, 36]} /><meshStandardMaterial color="#fbfbf7" roughness={0.3} /></mesh>
      <mesh position={V3([0, 0.04, 0])}><cylinderGeometry args={[0.42, 0.46, 0.03, 36]} /><meshStandardMaterial color="#eef0ec" /></mesh>
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
      <mesh castShadow receiveShadow><cylinderGeometry args={[1, 0.88, 0.34, 40]} /><meshStandardMaterial color="#2a2622" roughness={0.35} metalness={0.55} /></mesh>
      <mesh position={V3([1.45, 0.04, 0])} rotation={V3([0, 0, Math.PI / 2])}><cylinderGeometry args={[0.07, 0.07, 1.1, 14]} /><meshStandardMaterial color="#19150f" roughness={0.5} /></mesh>
      <group ref={steam}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={V3([(i - 1) * 0.32, 0.45, 0])}><sphereGeometry args={[0.16, 12, 12]} /><meshStandardMaterial color="#ffffff" transparent opacity={0.4} depthWrite={false} /></mesh>
        ))}
      </group>
    </group>
  );
}

/** Egg actor: tap to crack — shell splits, yolk drops. */
function EggActor({ onDone }: { onDone: () => void }) {
  const grp = useRef<THREE.Group>(null);
  const lh = useRef<THREE.Mesh>(null);
  const rh = useRef<THREE.Mesh>(null);
  const yolk = useRef<THREE.Mesh>(null);
  const [cracked, setCracked] = useState(false);
  useFrame((s) => {
    const g = grp.current;
    if (!g) return;
    if (!cracked) {
      g.position.y = 0.6 + Math.sin(s.clock.elapsedTime * 2.6) * 0.07;
    } else {
      if (lh.current) lh.current.rotation.z = THREE.MathUtils.lerp(lh.current.rotation.z, 1.0, 0.16);
      if (rh.current) rh.current.rotation.z = THREE.MathUtils.lerp(rh.current.rotation.z, -1.0, 0.16);
      if (yolk.current) yolk.current.position.y = THREE.MathUtils.lerp(yolk.current.position.y, -0.55, 0.13);
      g.position.y = THREE.MathUtils.lerp(g.position.y, 0.25, 0.1);
    }
  });
  function tap() {
    if (cracked) return;
    setCracked(true);
    setTimeout(onDone, 650);
  }
  return (
    <group ref={grp} position={V3([0, 0.6, 1.7])} onClick={tap}>
      {!cracked ? (
        <mesh castShadow scale={V3([0.82, 1.08, 0.82])}><sphereGeometry args={[0.3, 24, 24]} /><meshStandardMaterial color="#fff3d6" roughness={0.5} /></mesh>
      ) : (
        <>
          <mesh ref={lh}><sphereGeometry args={[0.3, 20, 16, 0, Math.PI]} /><meshStandardMaterial color="#fff3d6" roughness={0.5} side={THREE.DoubleSide} /></mesh>
          <mesh ref={rh} rotation={V3([0, Math.PI, 0])}><sphereGeometry args={[0.3, 20, 16, 0, Math.PI]} /><meshStandardMaterial color="#fff3d6" roughness={0.5} side={THREE.DoubleSide} /></mesh>
          <mesh ref={yolk} castShadow><sphereGeometry args={[0.13, 16, 16]} /><meshStandardMaterial color="#f5a623" roughness={0.3} /></mesh>
        </>
      )}
    </group>
  );
}

/** Generic actor for the current step (bob; tap to perform; stir-fry needs 3 taps). */
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
    <group ref={ref} position={V3([0, 0.55, 1.7])} onClick={tap}>
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
  const [pan, setPan] = useState<IngType[]>([]);
  const [cooked, setCooked] = useState(false);
  const n = recipe.steps.length;
  const done = idx >= n;
  const step = done ? null : recipe.steps[idx];

  function completeStep() {
    const s = recipe.steps[idx];
    if (s.kind === "chop" || s.kind === "add") setPan((p) => [...p, ingType(s.item)]);
    if (s.kind === "stirfry") setCooked(true);
    setIdx((i) => i + 1);
  }
  function restart() {
    setIdx(0);
    setPan([]);
    setCooked(false);
  }

  const stepLabel = (() => {
    if (!step) return "";
    const item = "item" in step ? (en && step.item_en ? step.item_en : step.item) : "";
    if (step.kind === "chop") return `${en ? "Chop" : "Bổ"} ${item}`;
    if (step.kind === "add")
      return ingType(step.item) === "egg" ? (en ? "Crack the egg" : "Đập trứng") : `${en ? "Add" : "Cho"} ${item}`;
    if (step.kind === "stirfry") return en ? "Stir-fry (tap 3×)" : "Đảo chảo (chạm 3 lần)";
    if (step.kind === "season") return `${en ? "Season:" : "Nêm"} ${item}`;
    return en ? "Plate it up" : "Bày ra đĩa";
  })();

  const isEggAdd = step?.kind === "add" && ingType(step.item) === "egg";

  return (
    <div className="relative mx-auto w-full">
      <div className="h-[74vh] min-h-[460px] w-full overflow-hidden rounded-3xl bg-gradient-to-b from-[#f7e6cf] to-[#e6c89a] shadow-card ring-1 ring-white/40">
        <Canvas shadows camera={{ position: [0, 3.4, 5.4], fov: 40 }}>
          <ambientLight intensity={0.75} />
          <directionalLight position={[4, 7, 4]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />
          <mesh receiveShadow position={V3([0, -0.18, 0])}>
            <boxGeometry args={[8, 0.36, 4.6]} />
            <meshStandardMaterial color="#caa472" roughness={0.85} />
          </mesh>

          {done ? (
            <>
              <PlateMesh position={V3([0, 0.04, 0.2])} />
              <PanContents items={pan} cooked y={0.12} />
            </>
          ) : (
            <>
              <Pan position={V3([0, 0.18, -0.2])} />
              <PanContents items={pan} cooked={cooked} y={0.3} />
              {step &&
                (isEggAdd ? (
                  <EggActor key={idx} onDone={completeStep} />
                ) : (
                  <Actor key={idx} step={step} onDone={completeStep} />
                ))}
            </>
          )}

          <ContactShadows position={V3([0, 0, 0])} opacity={0.35} scale={12} blur={2.6} far={4} />
          <OrbitControls enablePan={false} minPolarAngle={0.4} maxPolarAngle={1.45} minDistance={3.4} maxDistance={9} autoRotate={done} autoRotateSpeed={0.6} />
        </Canvas>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-4">
        <div className="rounded-2xl bg-card/85 px-3.5 py-2 shadow-card backdrop-blur">
          <p className="text-sm font-bold tracking-tight">{recTitle}</p>
          {!done && (
            <p className="text-xs text-muted-foreground">
              {idx + 1}/{n} · {stepLabel}
            </p>
          )}
        </div>
        <button onClick={onExit} aria-label={t.other} className="pointer-events-auto rounded-full bg-card/85 p-2 text-muted-foreground shadow-card backdrop-blur transition hover:text-foreground">
          <X className="size-5" />
        </button>
      </div>

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
              <button onClick={restart} className="flex items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-float transition active:scale-95">
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
