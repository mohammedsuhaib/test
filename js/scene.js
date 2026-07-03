/* ════════════════════════════════════════════════
   ONYX ESTATES — the descent, in true 3D
   A stylized night villa built procedurally with Three.js.
   One camera path: orbit → city → in the front door →
   up the stairs, tread by tread → the suite → the terrace.
   ════════════════════════════════════════════════ */
window.initOnyxScene = function (canvas) {
  if (!window.THREE) return null;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  } catch (e) {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06070c);
  scene.fog = new THREE.FogExp2(0x06070c, 0.0016);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 3000);

  /* ── lights ── */
  scene.add(new THREE.AmbientLight(0x2a3045, 1.4));
  const moonLight = new THREE.DirectionalLight(0x93a4c8, 1.1);
  moonLight.position.set(-120, 200, -80);
  scene.add(moonLight);

  const warm = (x, y, z, intensity, dist, color) => {
    const l = new THREE.PointLight(color || 0xffc98a, intensity, dist, 1.6);
    l.position.set(x, y, z);
    scene.add(l);
    return l;
  };

  /* ── helpers ── */
  const box = (w, h, d, color, opts) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.85, metalness: 0.05 }, opts || {}))
    );
    scene.add(m);
    return m;
  };
  const cyl = (rTop, rBot, h, color, opts) => {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(rTop, rBot, h, 14),
      new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.8 }, opts || {}))
    );
    scene.add(m);
    return m;
  };
  const cone = (r, h, color) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 9), new THREE.MeshStandardMaterial({ color, roughness: 1 }));
    scene.add(m);
    return m;
  };
  const glow = (r, color, x, y, z) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 10), new THREE.MeshBasicMaterial({ color }));
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  };
  const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };

  /* ── stars ── */
  {
    const n = 1600, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 700 + Math.random() * 900;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1) * 0.5;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 40;
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xd8dcee, size: 2.0, sizeAttenuation: false, transparent: true, opacity: 0.9 })));
  }

  /* ── moon ── */
  scene.add(at(new THREE.Mesh(new THREE.SphereGeometry(16, 24, 24), new THREE.MeshBasicMaterial({ color: 0xf2ecdb })), -260, 320, -520));

  /* ── ground ── */
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), new THREE.MeshStandardMaterial({ color: 0x0b0e12, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  /* ── the city: window-lights + towers, kept clear of the villa ── */
  {
    const n = 900, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    const c1 = new THREE.Color(0xffc98a), c2 = new THREE.Color(0x9fb6de);
    for (let i = 0; i < n; i++) {
      let x, z;
      do { x = (Math.random() - 0.5) * 900; z = (Math.random() - 0.5) * 900; } while (Math.hypot(x, z) < 70);
      pos[i * 3] = x; pos[i * 3 + 1] = 0.5 + Math.random() * 1.5; pos[i * 3 + 2] = z;
      (Math.random() < 0.7 ? c1 : c2).toArray(col, i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ vertexColors: true, size: 3.0, sizeAttenuation: false, transparent: true, opacity: 0.95 })));

    for (let i = 0; i < 46; i++) {
      let x, z;
      do { x = (Math.random() - 0.5) * 700; z = (Math.random() - 0.5) * 700; } while (Math.hypot(x, z) < 110);
      const h = 12 + Math.random() * 55;
      at(box(8 + Math.random() * 10, h, 8 + Math.random() * 10, 0x11141c, {
        emissive: 0xffb877, emissiveIntensity: 0.14 + Math.random() * 0.16, roughness: 0.9,
      }), x, h / 2, z);
    }
  }

  /* ════ THE VILLA ════  house at origin; pool to +z */
  const cream = 0xcfc7b8, stone = 0x8f8a7e, timber = 0x6b4f35, dark = 0x14161b, steel = 0x2a2d33;
  const glassMat = () => new THREE.MeshStandardMaterial({ color: 0x9fc4d8, transparent: true, opacity: 0.14, roughness: 0.1, metalness: 0.4 });

  /* plot, hedges, gate */
  at(box(64, 0.4, 44, 0x23252b, { roughness: 0.95 }), 0, 0.2, 4);
  at(box(1.2, 1.3, 42, 0x16241a), -31.4, 1.0, 4);
  at(box(1.2, 1.3, 42, 0x16241a), 31.4, 1.0, 4);
  at(box(64, 1.3, 1.2, 0x16241a), 0, 1.0, -17.6);
  at(box(0.8, 1.7, 0.8, stone), -2.9, 1.2, 33);
  at(box(0.8, 1.7, 0.8, stone), 2.9, 1.2, 33);
  glow(0.09, 0xffc98a, -2.9, 2.15, 33);
  glow(0.09, 0xffc98a, 2.9, 2.15, 33);

  /* walkway + bollards */
  at(box(4, 0.1, 18, 0x2f3138), 0, 0.46, 26);
  for (let i = 0; i < 5; i++) glow(0.11, 0xffc98a, i % 2 ? 2.4 : -2.4, 0.7, 20 + i * 3.4);

  /* ── ground floor shell (right side is a double-height stair void) ── */
  at(box(16.6, 0.3, 10.6, stone), 0, 0.55, -1);            // floor slab
  at(box(16.6, 3.6, 0.4, cream), 0, 2.5, -6);              // back wall (ground)
  at(box(0.4, 3.6, 10.4, cream), -8.1, 2.5, -1);           // left wall (ground)
  at(box(0.4, 7.6, 10.4, cream), 8.1, 4.25, -1);           // right wall — full height past the void
  at(box(18.4, 0.4, 2.0, 0x1d1f26), 0, 4.55, 3.6);         // front eyebrow over the glass

  /* glass facade (ground) + mullions */
  scene.add(at(new THREE.Mesh(new THREE.BoxGeometry(15.8, 3.4, 0.12), glassMat()), 0, 2.45, 4.05));
  [-5.3, 0, 5.3].forEach((x) => at(box(0.14, 3.4, 0.16, dark), x, 2.45, 4.06));

  /* ── upper floor: suite slab + stair landing, with an open stairwell ── */
  at(box(12.9, 0.35, 8.6, stone), -1.85, 4.85, -1.6);      // slab A — suite floor (x −8.3…4.6)
  at(box(3.7, 0.35, 2.5, stone), 6.45, 4.85, -4.65);       // slab B — landing (x 4.6…8.3, back)
  at(box(16.6, 3.1, 0.35, cream), 0, 6.5, -5.9);           // back wall (upper, full width)
  at(box(0.35, 3.1, 8.4, cream), -8.1, 6.5, -1.6);         // left wall (upper)
  /* interior partition with a real doorway onto the landing */
  at(box(0.35, 3.1, 5.0, cream), 3.45, 6.5, 0.15);         // partition, front of door
  at(box(0.35, 3.1, 0.9, cream), 3.45, 6.5, -5.35);        // partition, back of door
  at(box(3.4, 0.7, 0.35, cream), 3.45, 7.75, -3.65).rotation.y = Math.PI / 2; // door header
  at(box(18.4, 0.45, 10.6, 0x1d1f26), 0, 8.25, -1.2);      // upper roof
  scene.add(at(new THREE.Mesh(new THREE.BoxGeometry(15.8, 2.9, 0.12), glassMat()), 0, 6.5, 2.65)); // upper glass, full width
  [-4.4, 1.2, 5.6].forEach((x) => at(box(0.12, 2.9, 0.14, dark), x, 6.5, 2.66));

  /* roof details */
  at(box(1.2, 0.5, 1.0, steel), 5.6, 8.7, -4.4);
  at(box(1.0, 0.5, 1.2, steel), -6.4, 8.7, -4.6);
  at(box(0.9, 1.5, 0.9, dark), -6.9, 9.2, -3.0);           // chimney

  /* ── living room (left) ── */
  at(box(4.4, 0.55, 1.7, 0x4a4238), -4.4, 1.0, 0.4);       // sofa seat
  at(box(4.4, 0.8, 0.3, 0x4a4238), -4.4, 1.5, -0.4);       // sofa back
  [-5.6, -4.4, -3.2].forEach((x, i) => at(box(0.8, 0.28, 0.8, i === 1 ? 0xc6a15b : 0xd8d2c4), x, 1.4, 0.32)); // cushions
  at(box(1.6, 0.36, 0.9, timber), -4.4, 0.9, 2.0);         // coffee table
  glow(0.07, 0xffb36b, -4.4, 1.18, 2.0);                   // candle
  at(box(5.6, 0.06, 3.6, 0x35302a), -4.4, 0.75, 1.0);      // rug
  at(box(2.6, 1.5, 0.1, 0x0e0f13, { emissive: 0xc6a15b, emissiveIntensity: 1.1 }), -4.4, 2.4, -5.7); // lit artwork
  at(box(0.1, 1.3, 2.3, 0x05060a, { emissive: 0x233043, emissiveIntensity: 0.7 }), -7.82, 2.2, 0.5); // TV on left wall
  at(box(0.5, 0.5, 3.0, timber), -7.6, 0.95, 0.5);         // console
  at(box(0.06, 1.7, 0.06, dark), -6.9, 1.55, 3.0);         // floor lamp pole
  glow(0.2, 0xffd9a0, -6.9, 2.5, 3.0);                     // lamp shade
  at(cyl(0.26, 0.3, 0.5, dark), -7.3, 0.95, -5.1);         // plant pot
  cone(0.55, 1.5, 0x24402c).position.set(-7.3, 1.95, -5.1);
  at(box(0.9, 0.55, 0.9, 0x5a4f42), -2.2, 1.0, 2.6);       // accent pouf
  warm(-4.4, 3.4, 0, 26, 16);

  /* ── kitchen + dining (right of centre) ── */
  at(box(3.4, 1.0, 1.3, 0xd8d2c4), 4.6, 1.2, 0.6);         // island
  at(box(0.9, 0.06, 0.5, 0x9aa0a6, { metalness: 0.6, roughness: 0.3 }), 5.4, 1.74, 0.6); // sink
  [3.7, 4.6, 5.5].forEach((x) => {
    at(box(0.03, 0.9, 0.03, dark), x, 3.35, 0.6);          // pendant drops
    glow(0.12, 0xffd9a0, x, 2.85, 0.6);
  });
  [3.7, 4.6, 5.5].forEach((x) => at(cyl(0.22, 0.18, 0.55, timber), x, 0.98, 1.7)); // stools
  at(box(6.4, 1.0, 0.9, 0x232019), 4.6, 1.2, -5.3);        // rear counter
  at(box(6.4, 1.2, 0.14, timber), 4.6, 3.2, -5.85);        // upper cabinets
  at(box(6.2, 0.07, 0.06, 0x0e0f13, { emissive: 0xffc98a, emissiveIntensity: 1.3 }), 4.6, 2.5, -5.8); // backsplash strip
  at(box(0.9, 2.2, 0.8, steel, { metalness: 0.5, roughness: 0.35 }), 0.9, 1.65, -5.4); // fridge
  at(box(2.4, 0.12, 1.2, timber), 0.9, 1.6, 2.4);          // dining table
  glow(0.07, 0xffb36b, 0.9, 1.78, 2.4);                    // candle
  [[0.3, 1.75], [1.5, 1.75], [0.3, 3.05], [1.5, 3.05]].forEach(([x, z]) => at(box(0.42, 0.85, 0.42, 0x3d3833), x, 0.98, z)); // chairs
  warm(4.6, 3.3, -1.5, 22, 14);

  /* ── the stair: treads climbing the double-height void ── */
  const STEPS = 11;
  for (let i = 0; i < STEPS; i++) {
    at(box(1.5, 0.09, 0.55, timber), 6.6, 0.9 + i * 0.36, 2.4 - i * 0.52);
  }
  /* stringer + handrail */
  const rail = box(0.06, 0.06, 6.6, dark);
  at(rail, 5.82, 3.6, -0.2);
  rail.rotation.x = Math.atan2(10 * 0.36, 10 * 0.52);
  for (let i = 0; i < STEPS; i += 2) {
    at(box(0.05, 0.85, 0.05, dark), 5.82, 1.32 + i * 0.36, 2.4 - i * 0.52); // balusters
  }
  /* landing railing overlooking the void — gap where the stair arrives */
  at(box(1.1, 0.07, 0.07, dark), 5.15, 5.95, -3.42);
  [4.75, 5.6].forEach((x) => at(box(0.05, 0.85, 0.05, dark), x, 5.5, -3.42));
  warm(6.6, 6.6, -0.5, 13, 12);                             // stair void light
  warm(6.4, 7.2, -4.4, 8, 8);                               // landing light

  /* ── master suite ── */
  at(box(2.6, 0.5, 2.2, 0xd9d2c2), -4.2, 5.35, -2.4);      // bed
  at(box(2.6, 1.1, 0.18, timber), -4.2, 5.8, -3.55);       // headboard
  at(box(2.2, 0.16, 0.9, 0xc6a15b), -4.2, 5.64, -1.8);     // throw blanket
  [-5.7, -2.7].forEach((x) => {
    at(box(0.5, 0.4, 0.5, dark), x, 5.3, -3.3);
    glow(0.12, 0xffd9a0, x, 5.65, -3.3);
  });
  at(box(4.2, 0.05, 3.2, 0x3a332b), -4.2, 5.12, -2.0);     // rug
  at(box(4.6, 2.6, 0.12, 0x2a241d), -4.2, 6.4, -5.78);     // accent wall panel
  at(box(1.8, 0.35, 0.5, 0x8a7f6d), -4.2, 5.3, -0.85);     // foot bench
  at(box(1.8, 0.95, 0.5, timber), 2.6, 5.6, -5.55);        // dresser
  at(box(0.06, 1.6, 1.0, 0x9fb6c9, { metalness: 0.85, roughness: 0.05 }), 3.32, 6.3, -0.6); // mirror
  at(cyl(0.26, 0.3, 0.5, dark), -7.4, 5.3, 1.6);           // plant
  cone(0.5, 1.3, 0x24402c).position.set(-7.4, 6.2, 1.6);
  at(box(11, 0.06, 0.06, 0x0e0f13, { emissive: 0xffc98a, emissiveIntensity: 1.0 }), -2.2, 7.95, 2.3); // cove light
  warm(-4.2, 7.2, -1.5, 14, 12);

  /* ── pool + terrace life ── */
  scene.add(at(new THREE.Mesh(
    new THREE.BoxGeometry(13, 0.25, 5.6),
    new THREE.MeshStandardMaterial({ color: 0x0f3f52, emissive: 0x1a7fa8, emissiveIntensity: 0.85, roughness: 0.15, metalness: 0.3 })
  ), 0, 0.44, 10.2));
  at(box(13.8, 0.12, 6.4, 0xd8d2c4), 0, 0.35, 10.2);       // coping
  [0, 1, 2].forEach((i) => at(box(2.2, 0.1, 0.4, 0xd8d2c4), -4.6, 0.52 - i * 0.1, 12.15 + i * 0.35)); // steps into the water
  warm(0, 2.2, 10.2, 14, 14, 0x6fd3ef);
  [-4.6, -2.9, 2.9, 4.6].forEach((x, i) => {
    at(box(0.8, 0.22, 2.2, 0xbdb4a2), x, 0.62, 15.2);
    if (i % 2) at(box(0.7, 0.04, 0.9, i === 1 ? 0xc6a15b : 0xede7dc), x, 0.75, 14.9); // towels
  });
  at(box(0.06, 2.3, 0.06, dark), 6.2, 1.6, 15.6);          // umbrella pole
  cone(1.5, 0.55, 0xcfc7b8).position.set(6.2, 2.95, 15.6);
  at(cyl(0.55, 0.65, 0.35, dark), -6.6, 0.6, 12.6);        // fire pit
  glow(0.18, 0xff9c52, -6.6, 0.85, 12.6);
  warm(-6.6, 1.4, 12.6, 7, 7, 0xff8c42);

  /* ── trees ── */
  const tree = (x, z, s) => {
    at(box(0.24 * s, 1.6 * s, 0.24 * s, 0x3a2d20), x, 0.8 * s + 0.4, z);
    for (let i = 0; i < 3; i++) {
      cone((1.25 - i * 0.3) * s, 1.5 * s, 0x1d3323).position.set(x, (1.7 + i * 0.85) * s + 0.4, z);
    }
  };
  tree(-13, 8, 1.4); tree(-11, -6, 1.1); tree(12, -5, 1.3); tree(14, 9, 1.0);
  tree(-16, 16, 1.2); tree(10, 17, 1.15); tree(-24, -2, 1.3); tree(24, 2, 1.25);

  /* ── camera + look-at paths ──
     The climb follows the actual treads: eye ≈ 1.5 above each step. */
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const camCurve = new THREE.CatmullRomCurve3(
    [
      V(30, 420, 180),      // 0  orbit
      V(120, 190, 260),     // 1  descending, banking
      V(-110, 70, 190),     // 2  over the skyline
      V(-30, 18, 70),       // 3  dropping to street level
      V(0, 3.4, 30),        // 4  the approach walk
      V(0, 2.2, 13),        // 5  over the pool, facing the glass
      V(0, 1.9, 4.6),       // 6  through the glass door
      V(-3.6, 1.8, 0.6),    // 7  living room
      V(1.6, 1.8, -1.2),    // 8  past the kitchen island
      V(5.7, 2.0, 3.0),     // 9  turning to the stair base
      V(6.6, 3.1, 1.4),     // 10 climbing — lower treads
      V(6.6, 4.4, -0.7),    // 11 climbing — mid flight
      V(6.6, 5.7, -2.6),    // 12 climbing — top treads
      V(6.3, 6.4, -4.1),    // 13 the landing
      V(3.3, 6.3, -3.5),    // 14 through the doorway
      V(-1.6, 6.3, -1.2),   // 15 the suite
      V(-2.4, 6.3, 7.5),    // 16 drifting out through the upper glass
      V(0, 2.8, 21),        // 17 settle on the terrace, looking home
    ],
    false, "catmullrom", 0.15
  );
  const lookCurve = new THREE.CatmullRomCurve3(
    [
      V(0, 0, 0), V(0, 0, 0), V(0, 4, 0),
      V(0, 2.5, 10),        // pool
      V(0, 2.3, 4),         // glass facade
      V(-1, 1.8, -1),       // into the living space
      V(-4.4, 1.9, -5.2),   // sofa + artwork
      V(4.6, 1.5, -5),      // kitchen
      V(6.4, 2.6, 1.6),     // the stair base
      V(6.6, 4.2, -1.6),    // up the flight
      V(6.6, 5.4, -3.2),    // the top treads
      V(6.4, 6.2, -4.4),    // the landing
      V(3.4, 6.2, -3.6),    // the doorway
      V(-2.5, 6.0, -2.2),   // into the suite
      V(-4.4, 5.8, -2.8),   // the bed wall
      V(-2.5, 5.8, -1),     // looking back in
      V(0, 3.2, 0),         // the glowing house
      V(0, 3.6, -1),
    ],
    false, "catmullrom", 0.15
  );

  const pos = new THREE.Vector3(), look = new THREE.Vector3();
  function render(progress, timeMs) {
    const p = Math.min(1, Math.max(0, progress));
    camCurve.getPoint(p, pos);
    lookCurve.getPoint(p, look);
    const t = (timeMs || 0) / 1000;
    const sway = 0.35 * (1 - Math.min(1, p * 2.2));
    camera.position.set(pos.x + Math.sin(t * 0.5) * sway, pos.y + Math.sin(t * 0.35) * sway * 0.5, pos.z);
    camera.lookAt(look);
    renderer.render(scene, camera);
  }

  function resize() {
    const w = canvas.clientWidth || canvas.parentElement.clientWidth;
    const h = canvas.clientHeight || canvas.parentElement.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  return { render, resize };
};
