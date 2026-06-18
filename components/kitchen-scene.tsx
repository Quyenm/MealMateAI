"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, type ThreeElements } from "@react-three/fiber";
import { OrbitControls, ContactShadows, useGLTF } from "@react-three/drei";
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
  if (/(hanh|scallion|onion|spring|leek)/.test(n)) return "scallion";
  if (/(thit|pork|beef|meat|ba chi|suon|nac|ga|bo)/.test(n)) return "meat";
  if (/(ot|chili|chilli|pepper)/.test(n)) return "chili";
  if (/(mam|muoi|duong|tieu|sauce|salt|sugar|nuoc hang|caramel|gia vi|season|hat nem|dau)/.test(n)) return "bottle";
  if (/(rau|spinach|cai|cabbage|veg|muong|xa lach)/.test(n)) return "greens";
  return "generic";
}
const V3 = (a: number[]) => a as [number, number, number];

// Kenney Food Kit (CC0) models in /public/models.
const WHOLE: Record<IngType, string> = {
  tomato: "/models/tomato.glb",
  egg: "/models/egg.glb",
  garlic: "/models/onion.glb",
  scallion: "/models/scallion.glb",
  meat: "/models/meat-raw.glb",
  chili: "/models/chili.glb",
  bottle: "/models/bottle.glb",
  greens: "/models/scallion.glb",
  generic: "/models/onion.glb",
};
const RAW_PAN: Partial<Record<IngType, string>> = {
  tomato: "/models/tomato-slice.glb",
  egg: "/models/egg-half.glb",
  meat: "/models/meat-raw.glb",
};
const COOKED: Partial<Record<IngType, string>> = {
  tomato: "/models/tomato-slice.glb",
  egg: "/models/egg-cooked.glb",
  meat: "/models/meat-cooked.glb",
};

const ALL_URLS = [
  "/models/tomato.glb", "/models/tomato-slice.glb", "/models/egg.glb", "/models/egg-half.glb",
  "/models/egg-cooked.glb", "/models/pan.glb", "/models/plate.glb", "/models/onion.glb",
  "/models/scallion.glb", "/models/meat-raw.glb", "/models/meat-cooked.glb", "/models/chili.glb",
  "/models/board.glb", "/models/bottle.glb",
];
ALL_URLS.forEach((u) => useGLTF.preload(u));

/** Loads a GLB, clones it, enables shadows, and auto-scales so its largest side ≈ `size`. */
function Model({ url, size = 0.6, ...props }: { url: string; size?: number } & ThreeElements["group"]) {
  const { scene } = useGLTF(url);
  const obj = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);
  const scale = useMemo(() => {
    const b = new THREE.Box3().setFromObject(obj);
    const s = b.getSize(new THREE.Vector3());
    return size / (Math.max(s.x, s.y, s.z) || 1);
  }, [obj, size]);
  return (
    <group {...props}>
      <group scale={scale}>
        <primitive object={obj} />
      </group>
    </group>
  );
}

function PanContents({ items, cooked, y }: { items: IngType[]; cooked: boolean; y: number }) {
  return (
    <group position={V3([0, y, -0.2])}>
      {items.map((type, i) => {
        const a = (i / Math.max(1, items.length)) * Math.PI * 2 + i * 1.3;
        const r = items.length === 1 ? 0 : 0.34 + (i % 2) * 0.16;
        const url = cooked ? COOKED[type] ?? WHOLE[type] : RAW_PAN[type] ?? WHOLE[type];
        return <Model key={i} url={url} size={0.5} position={V3([Math.cos(a) * r, 0, Math.sin(a) * r])} rotation={V3([0, a, 0])} />;
      })}
    </group>
  );
}

function Steam() {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    g.children.forEach((c, i) => {
      const mesh = c as THREE.Mesh;
      const tt = (state.clock.elapsedTime * 0.5 + i * 0.33) % 1;
      mesh.position.y = 0.5 + tt * 1.3;
      mesh.scale.setScalar(0.08 + tt * 0.2);
      (mesh.material as THREE.MeshStandardMaterial).opacity = 0.4 * (1 - tt);
    });
  });
  return (
    <group ref={ref} position={V3([0, 0, -0.2])}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={V3([(i - 1) * 0.32, 0.5, 0])}>
          <sphereGeometry args={[0.16, 12, 12]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.4} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/** Egg: tap to crack — whole egg becomes two shell halves tilting apart. */
function EggActor({ onDone }: { onDone: () => void }) {
  const grp = useRef<THREE.Group>(null);
  const lh = useRef<THREE.Group>(null);
  const rh = useRef<THREE.Group>(null);
  const [cracked, setCracked] = useState(false);
  useFrame((s) => {
    const g = grp.current;
    if (!g) return;
    if (!cracked) {
      g.position.y = 0.6 + Math.sin(s.clock.elapsedTime * 2.6) * 0.07;
    } else {
      if (lh.current) lh.current.rotation.z = THREE.MathUtils.lerp(lh.current.rotation.z, 1.0, 0.16);
      if (rh.current) rh.current.rotation.z = THREE.MathUtils.lerp(rh.current.rotation.z, -1.0, 0.16);
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
        <Model url="/models/egg.glb" size={0.5} />
      ) : (
        <>
          <group ref={lh} position={V3([-0.05, 0, 0])}>
            <Model url="/models/egg-half.glb" size={0.45} />
          </group>
          <group ref={rh} position={V3([0.05, 0, 0])} rotation={V3([0, Math.PI, 0])}>
            <Model url="/models/egg-half.glb" size={0.45} />
          </group>
        </>
      )}
    </group>
  );
}

/** Generic actor for the current step (bob; tap; stir-fry = 3 taps with a spatula-ish wobble). */
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
      g.position.y = 0.6 + Math.sin(state.clock.elapsedTime * 2.6) * 0.07;
      if (step.kind === "stirfry") g.rotation.z = Math.sin(state.clock.elapsedTime * 6) * 0.25;
    }
  });
  function tap() {
    if (goneRef.current) return;
    const nx = taps + 1;
    setTaps(nx);
    if (nx >= needed) {
      goneRef.current = true;
      setTimeout(onDone, 380);
    }
  }
  let url = "/models/onion.glb";
  if (step.kind === "season") url = "/models/bottle.glb";
  else if (step.kind === "stirfry") url = "/models/pan.glb";
  else if (step.kind === "plate") url = "/models/plate.glb";
  else url = WHOLE[ingType(step.item)];
  const size = step.kind === "stirfry" ? 1.0 : step.kind === "plate" ? 1.0 : 0.6;
  return (
    <group ref={ref} position={V3([0, 0.6, 1.7])} onClick={tap}>
      <Model url={url} size={size} />
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
  const isChop = step?.kind === "chop";

  return (
    <div className="relative mx-auto w-full">
      <div className="h-[74vh] min-h-[460px] w-full overflow-hidden rounded-3xl bg-gradient-to-b from-[#f7e6cf] to-[#e6c89a] shadow-card ring-1 ring-white/40">
        <Canvas shadows camera={{ position: [0, 3.4, 5.4], fov: 40 }}>
          <ambientLight intensity={0.8} />
          <directionalLight position={V3([4, 7, 4])} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />
          <mesh receiveShadow position={V3([0, -0.18, 0])}>
            <boxGeometry args={[8, 0.36, 4.6]} />
            <meshStandardMaterial color="#caa472" roughness={0.85} />
          </mesh>

          <Suspense fallback={null}>
            {done ? (
              <>
                <Model url="/models/plate.glb" size={1.8} position={V3([0, 0.02, 0.2])} />
                <PanContents items={pan} cooked y={0.18} />
              </>
            ) : (
              <>
                <Model url="/models/pan.glb" size={2.4} position={V3([0, 0.02, -0.2])} />
                <Steam />
                <PanContents items={pan} cooked={cooked} y={0.34} />
                {isChop && step && <Model url="/models/board.glb" size={1.6} position={V3([0, 0.02, 1.7])} />}
                {step &&
                  (isEggAdd ? (
                    <EggActor key={idx} onDone={completeStep} />
                  ) : (
                    <Actor key={idx} step={step} onDone={completeStep} />
                  ))}
              </>
            )}
          </Suspense>

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
