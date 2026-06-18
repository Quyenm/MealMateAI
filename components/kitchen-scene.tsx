"use client";

import { useRef, useState } from "react";
import { Canvas, useFrame, type ThreeElements } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import { RotateCcw, X, Star } from "lucide-react";
import * as THREE from "three";
import { motion } from "motion/react";
import { useLang, useT } from "@/components/landing/i18n";
import type { CookStep, Recipe } from "@/lib/kitchen/recipes";

const COLORS: Record<CookStep["kind"], string> = {
  chop: "#e2483f",
  add: "#ffd35a",
  stirfry: "#c8862e",
  season: "#9aa0a6",
  plate: "#7cc36b",
};

function Ingredient({
  base,
  color,
  added,
  onClick,
}: {
  base: [number, number, number];
  color: string;
  added: boolean;
  onClick: () => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const [hover, setHover] = useState(false);
  const target = new THREE.Vector3(0, 0.5, 0); // pan centre
  useFrame((state) => {
    const m = ref.current;
    if (!m) return;
    if (added) {
      m.position.lerp(target, 0.12);
      m.scale.lerp(new THREE.Vector3(0.25, 0.25, 0.25), 0.12);
    } else {
      m.position.set(base[0], base[1] + Math.sin(state.clock.elapsedTime * 2 + base[0]) * 0.05, base[2]);
      const s = hover ? 1.15 : 1;
      m.scale.lerp(new THREE.Vector3(s, s, s), 0.2);
    }
  });
  return (
    <mesh
      ref={ref}
      position={base}
      castShadow
      onClick={(e) => {
        e.stopPropagation();
        if (!added) onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
      }}
      onPointerOut={() => setHover(false)}
    >
      <sphereGeometry args={[0.32, 28, 28]} />
      <meshStandardMaterial color={color} roughness={0.45} />
    </mesh>
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
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.45 * (1 - tt);
    });
  });
  return (
    <group {...props}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[1, 0.88, 0.34, 40]} />
        <meshStandardMaterial color="#2a2622" roughness={0.35} metalness={0.55} />
      </mesh>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.84, 0.84, 0.06, 40]} />
        <meshStandardMaterial color="#e8623a" roughness={0.6} />
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

export function KitchenScene({ recipe, onExit }: { recipe: Recipe; onExit: () => void }) {
  const t = useT().kitchen;
  const { lang } = useLang();
  const en = lang === "en";
  const recTitle = en && recipe.title_en ? recipe.title_en : recipe.title_vi;
  const [added, setAdded] = useState<number[]>([]);
  const [done, setDone] = useState(false);

  function add(i: number) {
    setAdded((a) => {
      const next = a.includes(i) ? a : [...a, i];
      if (next.length >= recipe.steps.length) setTimeout(() => setDone(true), 700);
      return next;
    });
  }
  function restart() {
    setAdded([]);
    setDone(false);
  }

  const n = recipe.steps.length;

  return (
    <div className="relative mx-auto max-w-md">
      <div className="h-[62vh] min-h-[440px] overflow-hidden rounded-3xl bg-gradient-to-b from-[#f7e6cf] to-[#e6c89a] shadow-card ring-1 ring-white/40">
        <Canvas shadows camera={{ position: [0, 3.4, 5.2], fov: 42 }}>
          <ambientLight intensity={0.75} />
          <directionalLight position={[4, 7, 4]} intensity={1.15} castShadow shadow-mapSize={[1024, 1024]} />
          {/* counter */}
          <mesh receiveShadow position={[0, -0.18, 0]}>
            <boxGeometry args={[7, 0.36, 4.2]} />
            <meshStandardMaterial color="#caa472" roughness={0.85} />
          </mesh>
          <Pan position={[0, 0.18, -0.2]} />
          {recipe.steps.map((s, i) => (
            <Ingredient
              key={i}
              base={[(i - (n - 1) / 2) * 0.95, 0.42, 1.5]}
              color={COLORS[s.kind]}
              added={added.includes(i)}
              onClick={() => add(i)}
            />
          ))}
          <ContactShadows position={[0, 0, 0]} opacity={0.35} scale={11} blur={2.6} far={4} />
          <OrbitControls
            enablePan={false}
            minPolarAngle={0.4}
            maxPolarAngle={1.45}
            minDistance={3.2}
            maxDistance={8}
            autoRotate={!done}
            autoRotateSpeed={0.5}
          />
        </Canvas>
      </div>

      {/* HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-4">
        <div className="rounded-2xl bg-card/85 px-3 py-1.5 shadow-card backdrop-blur">
          <p className="text-sm font-bold tracking-tight">{recTitle}</p>
          <p className="text-xs text-muted-foreground">
            {added.length}/{n} · {en ? "tap an ingredient" : "chạm nguyên liệu"}
          </p>
        </div>
        <button
          onClick={onExit}
          aria-label={t.other}
          className="pointer-events-auto rounded-full bg-card/85 p-2 text-muted-foreground shadow-card backdrop-blur transition hover:text-foreground"
        >
          <X className="size-5" />
        </button>
      </div>

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
            <p className="text-sm text-muted-foreground">{en ? "Done — looks delicious!" : "Hoàn thành — nhìn ngon ghê!"}</p>
            <div className="flex w-full flex-col gap-2">
              <button
                onClick={restart}
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
