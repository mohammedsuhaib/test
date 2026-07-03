/* ════════════════════════════════════════════════
   ONYX ESTATES — the descent, in true 3D
   A stylized night villa built procedurally with Three.js.
   One camera path: orbit → city → through the house → pool.
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
  const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };

  /* ── stars ── */
  {
    const n = 1600, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 700 + Math.random() * 900;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1) * 0.5; // upper hemisphere bias
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 40;
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xd8dcee, size: 2.0, sizeAttenuation: false, transparent: true, opacity: 0.9 })));
  }

  /* ── moon ── */
  const moon = new THREE.Mesh(new THREE.SphereGeometry(16, 24, 24), new THREE.MeshBasicMaterial({ color: 0xf2ecdb }));
  at(moon, -260, 320, -520);
  scene.add(moon);

  /* ── ground ── */
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(2400, 2400),
    new THREE.MeshStandardMaterial({ color: 0x0b0e12, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  /* ── the city: lights + towers, kept clear of the villa ── */
  {
    const n = 900, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    const c1 = new THREE.Color(0xffc98a), c2 = new THREE.Color(0x9fb6de);
    for (let i = 0; i < n; i++) {
      let x, z;
      do {
        x = (Math.random() - 0.5) * 900;
        z = (Math.random() - 0.5) * 900;
      } while (Math.hypot(x, z) < 70);
      pos[i * 3] = x; pos[i * 3 + 1] = 0.5 + Math.random() * 1.5; pos[i * 3 + 2] = z;
      (Math.random() < 0.7 ? c1 : c2).toArray(col, i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ vertexColors: true, size: 3.0, sizeAttenuation: false, transparent: true, opacity: 0.95 })));

    for (let i = 0; i < 46; i++) {
      let x, z;
      do {
        x = (Math.random() - 0.5) * 700;
        z = (Math.random() - 0.5) * 700;
      } while (Math.hypot(x, z) < 110);
      const h = 12 + Math.random() * 55;
      const t = box(8 + Math.random() * 10, h, 8 + Math.random() * 10, 0x11141c, {
        emissive: 0xffb877, emissiveIntensity: 0.14 + Math.random() * 0.16, roughness: 0.9,
      });
      at(t, x, h / 2, z);
    }
  }

  /* ── the villa ──  house sits at origin; pool to +z */
  const cream = 0xcfc7b8, stone = 0x8f8a7e, timber = 0x6b4f35, dark = 0x14161b;

  // plot terrace
  at(box(64, 0.4, 44, 0x23252b, { roughness: 0.95 }), 0, 0.2, 4);
  // walkway to street
  at(box(4, 0.1, 18, 0x2f3138), 0, 0.46, 26);
  for (let i = 0; i < 5; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffc98a }));
    at(b, i % 2 ? 2.4 : -2.4, 0.7, 20 + i * 3.4);
    scene.add(b);
  }

  // ground floor shell
  at(box(16.6, 0.3, 10.6, stone), 0, 0.55, -1);          // floor slab
  at(box(16.6, 3.6, 0.4, cream), 0, 2.5, -6);            // back wall
  at(box(0.4, 3.6, 10.4, cream), -8.1, 2.5, -1);         // left wall
  at(box(0.4, 3.6, 10.4, cream), 8.1, 2.5, -1);          // right wall
  at(box(18.4, 0.5, 12.4, 0x1d1f26), 0, 4.55, -0.8);     // roof slab w/ overhang

  // glass facade (front, facing pool)
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(15.8, 3.4, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x9fc4d8, transparent: true, opacity: 0.14, roughness: 0.1, metalness: 0.4 })
  );
  at(glass, 0, 2.45, 4.05);
  scene.add(glass);
  [-5.3, 0, 5.3].forEach((x) => at(box(0.14, 3.4, 0.16, dark), x, 2.45, 4.06));

  // upper floor (offset left) — master suite
  at(box(11.6, 0.35, 8.6, stone), -2.2, 4.85, -1.6);
  at(box(11.6, 3.1, 0.35, cream), -2.2, 6.5, -5.75);
  at(box(0.35, 3.1, 8.4, cream), -7.85, 6.5, -1.6);
  at(box(0.35, 3.1, 8.4, cream), 3.45, 6.5, -1.6);
  at(box(13.4, 0.45, 10.2, 0x1d1f26), -2.2, 8.25, -1.4);
  const glassUp = new THREE.Mesh(
    new THREE.BoxGeometry(11.2, 2.9, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x9fc4d8, transparent: true, opacity: 0.14, roughness: 0.1, metalness: 0.4 })
  );
  at(glassUp, -2.2, 6.5, 2.6);
  scene.add(glassUp);

  /* ── interior: living (left) ── */
  at(box(4.4, 0.55, 1.7, 0x4a4238), -4.4, 1.0, 0.4);      // sofa seat
  at(box(4.4, 0.8, 0.3, 0x4a4238), -4.4, 1.5, -0.4);      // sofa back
  at(box(1.6, 0.36, 0.9, timber), -4.4, 0.9, 2.0);        // coffee table
  at(box(5.6, 0.06, 3.6, 0x35302a), -4.4, 0.75, 1.0);     // rug
  const art = box(2.6, 1.5, 0.1, 0x0e0f13, { emissive: 0xc6a15b, emissiveIntensity: 1.1 });
  at(art, -4.4, 2.4, -5.7);                               // lit artwork on back wall
  warm(-4.4, 3.4, 0, 26, 16);

  /* ── interior: kitchen + dining (right) ── */
  at(box(3.4, 1.0, 1.3, 0xd8d2c4), 4.6, 1.2, 0.6);        // island
  at(box(6.4, 1.0, 0.9, 0x232019), 4.6, 1.2, -5.3);       // rear counter
  at(box(6.4, 1.2, 0.14, timber), 4.6, 3.2, -5.85);       // upper timber cabinets
  at(box(2.4, 0.12, 1.2, timber), 1.2, 1.6, 2.2);         // dining table
  warm(4.6, 3.3, -1.5, 22, 14);

  /* ── floating stair in double-height void (right edge) ── */
  for (let i = 0; i < 11; i++) {
    at(box(1.5, 0.09, 0.55, timber), 7.0, 0.9 + i * 0.36, 2.6 - i * 0.62);
  }

  /* ── master suite furniture ── */
  at(box(2.6, 0.5, 2.2, 0xd9d2c2), -4.2, 5.35, -2.4);     // bed
  at(box(2.6, 1.1, 0.18, timber), -4.2, 5.8, -3.55);      // headboard
  [-5.7, -2.7].forEach((x) => {
    at(box(0.5, 0.4, 0.5, dark), x, 5.3, -3.3);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffd9a0 }));
    at(lamp, x, 5.65, -3.3); scene.add(lamp);
  });
  at(box(4.2, 0.05, 3.2, 0x3a332b), -4.2, 5.12, -2.0);   // bedroom rug
  at(box(4.6, 2.6, 0.12, 0x2a241d), -4.2, 6.4, -5.55);   // accent wall panel
  warm(-4.2, 7.2, -1.5, 14, 12);

  /* ── pool ── */
  const pool = new THREE.Mesh(
    new THREE.BoxGeometry(13, 0.25, 5.6),
    new THREE.MeshStandardMaterial({ color: 0x0f3f52, emissive: 0x1a7fa8, emissiveIntensity: 0.85, roughness: 0.15, metalness: 0.3 })
  );
  at(pool, 0, 0.44, 10.2);
  scene.add(pool);
  at(box(13.8, 0.12, 6.4, 0xd8d2c4), 0, 0.42, 10.2).position.y = 0.35; // coping
  warm(0, 2.2, 10.2, 14, 14, 0x6fd3ef);
  // loungers
  [-4.6, -2.9, 2.9, 4.6].forEach((x) => at(box(0.8, 0.22, 2.2, 0xbdb4a2), x, 0.62, 15.2));

  /* ── trees ── */
  const tree = (x, z, s) => {
    at(box(0.24 * s, 1.6 * s, 0.24 * s, 0x3a2d20), x, 0.8 * s + 0.4, z);
    for (let i = 0; i < 3; i++) {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry((1.25 - i * 0.3) * s, 1.5 * s, 8),
        new THREE.MeshStandardMaterial({ color: 0x1d3323, roughness: 1 })
      );
      at(cone, x, (1.7 + i * 0.85) * s + 0.4, z);
      scene.add(cone);
    }
  };
  tree(-13, 8, 1.4); tree(-11, -6, 1.1); tree(12, -5, 1.3); tree(14, 9, 1.0); tree(-16, 16, 1.2); tree(10, 17, 1.15);

  /* ── camera + look-at paths (the one continuous move) ── */
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const camCurve = new THREE.CatmullRomCurve3(
    [
      V(30, 420, 180),      // orbit — city constellations below
      V(120, 190, 260),     // descending, banking
      V(-110, 70, 190),     // over the skyline
      V(-30, 18, 70),       // dropping to street level
      V(0, 3.4, 30),        // the approach walk
      V(0, 2.2, 13),        // over the pool, facing the glass
      V(0, 1.9, 4.6),       // through the glass door
      V(-3.6, 1.8, 0.6),    // living room
      V(1.8, 1.8, -1.6),    // past the kitchen island
      V(6.4, 2.6, 2.2),     // into the stair void
      V(6.2, 5.8, -0.4),    // rising to the first floor
      V(-2.0, 6.3, 0.8),    // master suite
      V(-2.2, 6.3, 8),      // drifting out through the upper glass
      V(0, 2.6, 21),        // settle on the terrace, looking home
    ],
    false, "catmullrom", 0.18
  );
  const lookCurve = new THREE.CatmullRomCurve3(
    [
      V(0, 0, 0), V(0, 0, 0), V(0, 4, 0),
      V(0, 2.5, 10),        // pool
      V(0, 2.3, 4),         // glass facade
      V(-2, 1.8, -2),       // into the living space
      V(-4.4, 1.6, -0.5),   // sofa / artwork
      V(4.6, 1.4, -3),      // kitchen
      V(7, 3.5, 0),         // stairwell
      V(-2, 5.8, -2),       // toward the suite
      V(-4.2, 5.6, -2.6),   // the bed wall
      V(-2, 5.5, -2),
      V(0, 3.2, 0),         // the glowing house
      V(0, 3.4, -1),
    ],
    false, "catmullrom", 0.18
  );

  const pos = new THREE.Vector3(), look = new THREE.Vector3();
  function render(progress, timeMs) {
    const p = Math.min(1, Math.max(0, progress));
    camCurve.getPoint(p, pos);
    lookCurve.getPoint(p, look);
    // gentle handheld sway, fading out during interior passages
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
