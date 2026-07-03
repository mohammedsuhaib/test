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
  renderer.toneMappingExposure = 1.25;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06070c);
  scene.fog = new THREE.FogExp2(0x06070c, 0.0016);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 3000);

  /* ── image-based environment light: night sky → warm horizon ── */
  {
    const w = 64, h = 32, data = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const t = y / (h - 1);
      let r, g, b;
      if (t < 0.5) { const k = t / 0.5; r = 8 + 26 * k; g = 10 + 20 * k; b = 18 + 30 * k; }
      else if (t < 0.62) { const k = (t - 0.5) / 0.12; r = 34 + 96 * k; g = 30 + 46 * k; b = 48 - 14 * k; }
      else { const k = (t - 0.62) / 0.38; r = 130 - 116 * k; g = 76 - 66 * k; b = 34 - 26 * k; }
      const i = (y * w + x) * 4;
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
    }
    const envTex = new THREE.DataTexture(data, w, h);
    envTex.needsUpdate = true;
    envTex.mapping = THREE.EquirectangularReflectionMapping;
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromEquirectangular(envTex).texture;
    envTex.dispose(); pmrem.dispose();
  }

  /* ── lights ── */
  scene.add(new THREE.AmbientLight(0x2a3045, 0.55));
  const moonLight = new THREE.DirectionalLight(0x93a4c8, 1.1);
  moonLight.position.set(-120, 200, -80);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.set(2048, 2048);
  Object.assign(moonLight.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, far: 600 });
  moonLight.shadow.bias = -0.0004;
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
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
    return m;
  };
  const cyl = (rTop, rBot, h, color, opts) => {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(rTop, rBot, h, 14),
      new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.8 }, opts || {}))
    );
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
    return m;
  };
  const cone = (r, h, color) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 9), new THREE.MeshStandardMaterial({ color, roughness: 1 }));
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
    return m;
  };
  /* rounded box: box vertices clamped to an inner core + corner radius */
  const rboxGeo = (w, h, d, r) => {
    r = Math.min(r, w / 2, h / 2, d / 2);
    const g = new THREE.BoxGeometry(w, h, d, 4, 4, 4);
    const p = g.attributes.position;
    const hw = w / 2 - r, hh = h / 2 - r, hd = d / 2 - r;
    const v = new THREE.Vector3(), c = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.set(p.getX(i), p.getY(i), p.getZ(i));
      c.set(
        THREE.MathUtils.clamp(v.x, -hw, hw),
        THREE.MathUtils.clamp(v.y, -hh, hh),
        THREE.MathUtils.clamp(v.z, -hd, hd)
      );
      v.sub(c);
      if (v.lengthSq() > 0) v.setLength(r);
      p.setXYZ(i, c.x + v.x, c.y + v.y, c.z + v.z);
    }
    g.computeVertexNormals();
    return g;
  };
  const rbox = (w, h, d, r, color, opts) => {
    const m = new THREE.Mesh(
      rboxGeo(w, h, d, r),
      new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.9, metalness: 0.02 }, opts || {}))
    );
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
    return m;
  };
  /* organic blob: noise-displaced icosphere (foliage, pebbles, pillows) */
  const blob = (r, color, noise) => {
    const g = new THREE.IcosahedronGeometry(r, 2);
    const p = g.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.set(p.getX(i), p.getY(i), p.getZ(i));
      v.multiplyScalar(1 + (Math.random() - 0.5) * (noise || 0.25));
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, roughness: 1 }));
    m.castShadow = m.receiveShadow = true;
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

  /* ── procedural textures (canvas-painted PBR maps) ── */
  const canvasTex = (draw, w, h, rx, ry) => {
    const c = document.createElement("canvas");
    c.width = w || 512; c.height = h || 512;
    draw(c.getContext("2d"), c.width, c.height);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx || 1, ry || 1);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const woodTex = canvasTex((ctx, w, h) => {
    ctx.fillStyle = "#8a6d4f"; ctx.fillRect(0, 0, w, h);
    for (let p = 0; p < 8; p++) {
      const y0 = (h / 8) * p;
      ctx.fillStyle = `rgba(${60 + Math.random() * 40},${44 + Math.random() * 26},${26 + Math.random() * 16},0.35)`;
      ctx.fillRect(0, y0, w, h / 8);
      ctx.fillStyle = "rgba(20,12,6,0.8)"; ctx.fillRect(0, y0, w, 2);
      for (let g = 0; g < 40; g++) {
        ctx.strokeStyle = `rgba(40,26,14,${0.05 + Math.random() * 0.1})`;
        const gy = y0 + Math.random() * (h / 8);
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.bezierCurveTo(w * 0.3, gy + 4, w * 0.7, gy - 4, w, gy); ctx.stroke();
      }
    }
  }, 512, 512, 3, 2);
  const tileTex = canvasTex((ctx, w, h) => {
    for (let ty = 0; ty < 4; ty++) for (let tx = 0; tx < 4; tx++) {
      const v = 38 + Math.random() * 10;
      ctx.fillStyle = `rgb(${v},${v + 2},${v + 6})`;
      ctx.fillRect(tx * w / 4, ty * h / 4, w / 4, h / 4);
    }
    ctx.strokeStyle = "rgba(8,9,12,0.9)"; ctx.lineWidth = 3;
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath(); ctx.moveTo(i * w / 4, 0); ctx.lineTo(i * w / 4, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * h / 4); ctx.lineTo(w, i * h / 4); ctx.stroke();
    }
  }, 512, 512, 8, 6);
  const stuccoTex = canvasTex((ctx, w, h) => {
    ctx.fillStyle = "#cfc7b8"; ctx.fillRect(0, 0, w, h);
    const img = ctx.getImageData(0, 0, w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 14;
      img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
    }
    ctx.putImageData(img, 0, 0);
  }, 256, 256, 2, 1);

  /* ── light halos (cheap bloom) ── */
  const glowTex = canvasTex((ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.25, "rgba(255,255,255,0.45)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }, 128, 128, 1, 1);
  const halo = (x, y, z, size, color, opacity) => {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color, transparent: true, opacity: opacity || 0.6,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    m.position.set(x, y, z); m.scale.set(size, size, 1);
    scene.add(m);
    return m;
  };

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
  ground.receiveShadow = true;
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
  at(box(64, 0.4, 44, 0xffffff, { map: tileTex, roughness: 0.95 }), 0, 0.2, 4);
  at(rbox(1.4, 1.4, 42, 0.45, 0x16241a), -31.4, 1.05, 4);
  at(rbox(1.4, 1.4, 42, 0.45, 0x16241a), 31.4, 1.05, 4);
  at(rbox(64, 1.4, 1.4, 0.45, 0x16241a), 0, 1.05, -17.6);
  at(box(0.8, 1.7, 0.8, stone), -2.9, 1.2, 33);
  at(box(0.8, 1.7, 0.8, stone), 2.9, 1.2, 33);
  glow(0.09, 0xffc98a, -2.9, 2.15, 33);
  glow(0.09, 0xffc98a, 2.9, 2.15, 33);

  /* walkway + bollards */
  at(box(4, 0.1, 18, 0x2f3138), 0, 0.46, 26);
  for (let i = 0; i < 5; i++) glow(0.11, 0xffc98a, i % 2 ? 2.4 : -2.4, 0.7, 20 + i * 3.4);

  /* ── ground floor shell (right side is a double-height stair void) ── */
  at(box(16.6, 0.3, 10.6, 0xffffff, { map: woodTex, roughness: 0.65 }), 0, 0.55, -1); // timber floor slab
  at(box(16.6, 3.6, 0.4, 0xffffff, { map: stuccoTex }), 0, 2.5, -6);   // back wall (ground)
  at(box(0.4, 3.6, 10.4, 0xffffff, { map: stuccoTex }), -8.1, 2.5, -1); // left wall (ground)
  at(box(0.4, 7.6, 10.4, 0xffffff, { map: stuccoTex }), 8.1, 4.25, -1); // right wall — full height past the void
  at(rbox(18.4, 0.4, 2.0, 0.07, 0x1d1f26), 0, 4.55, 3.6);  // front eyebrow over the glass

  /* glass facade (ground) + mullions */
  scene.add(at(new THREE.Mesh(new THREE.BoxGeometry(15.8, 3.4, 0.12), glassMat()), 0, 2.45, 4.05));
  [-5.3, 0, 5.3].forEach((x) => at(box(0.14, 3.4, 0.16, dark), x, 2.45, 4.06));

  /* ── upper floor: suite slab + stair landing, with an open stairwell ── */
  at(box(12.9, 0.35, 8.6, 0xffffff, { map: woodTex, roughness: 0.65 }), -1.85, 4.85, -1.6); // slab A — suite floor
  at(box(3.7, 0.35, 2.5, stone), 6.45, 4.85, -4.65);       // slab B — landing (x 4.6…8.3, back)
  at(box(16.6, 3.1, 0.35, 0xffffff, { map: stuccoTex }), 0, 6.5, -5.9); // back wall (upper, full width)
  at(box(0.35, 3.1, 8.4, 0xffffff, { map: stuccoTex }), -8.1, 6.5, -1.6); // left wall (upper)
  /* interior partition with a real doorway onto the landing */
  at(box(0.35, 3.1, 5.0, cream), 3.45, 6.5, 0.15);         // partition, front of door
  at(box(0.35, 3.1, 0.9, cream), 3.45, 6.5, -5.35);        // partition, back of door
  at(box(3.4, 0.7, 0.35, cream), 3.45, 7.75, -3.65).rotation.y = Math.PI / 2; // door header
  at(rbox(18.4, 0.45, 10.6, 0.08, 0x1d1f26), 0, 8.25, -1.2); // upper roof
  scene.add(at(new THREE.Mesh(new THREE.BoxGeometry(15.8, 2.9, 0.12), glassMat()), 0, 6.5, 2.65)); // upper glass, full width
  [-4.4, 1.2, 5.6].forEach((x) => at(box(0.12, 2.9, 0.14, dark), x, 6.5, 2.66));

  /* roof details */
  at(box(1.2, 0.5, 1.0, steel), 5.6, 8.7, -4.4);
  at(box(1.0, 0.5, 1.2, steel), -6.4, 8.7, -4.6);
  at(box(0.9, 1.5, 0.9, dark), -6.9, 9.2, -3.0);           // chimney

  /* ── living room (left) ── */
  at(rbox(4.4, 0.5, 1.85, 0.1, 0x4a4238), -4.4, 0.98, 0.4);              // sofa base
  at(rbox(4.4, 0.75, 0.34, 0.13, 0x4a4238), -4.4, 1.58, -0.32).rotation.x = -0.1; // sofa back
  at(rbox(0.38, 0.62, 1.85, 0.14, 0x4a4238), -6.5, 1.36, 0.4);           // arm
  at(rbox(0.38, 0.62, 1.85, 0.14, 0x4a4238), -2.3, 1.36, 0.4);           // arm
  [-5.5, -4.4, -3.3].forEach((x) => at(rbox(1.14, 0.26, 1.4, 0.11, 0x564b3f), x, 1.34, 0.48)); // seat cushions
  [-5.5, -4.4, -3.3].forEach((x, i) =>
    at(rbox(0.95, 0.55, 0.26, 0.12, i === 1 ? 0xc6a15b : 0xd8d2c4), x, 1.68, 0).rotation.x = -0.2); // back pillows
  at(blob(1.05, 0x7a6248, 0.12), -4.4, 0.94, 2.15).scale.set(1, 0.32, 0.7); // pebble coffee table
  glow(0.07, 0xffb36b, -4.4, 1.34, 2.15);                                // candle
  at(cyl(2.15, 2.15, 0.045, 0x35302a), -4.4, 0.76, 1.2);                 // round rug
  at(box(2.6, 1.5, 0.1, 0x0e0f13, { emissive: 0xc6a15b, emissiveIntensity: 1.1 }), -4.4, 2.4, -5.7); // lit artwork
  at(box(0.1, 1.3, 2.3, 0x05060a, { emissive: 0x233043, emissiveIntensity: 0.7 }), -7.82, 2.2, 0.5); // TV on left wall
  at(box(0.5, 0.5, 3.0, timber), -7.6, 0.95, 0.5);         // console
  at(box(0.06, 1.7, 0.06, dark), -6.9, 1.55, 3.0);         // floor lamp pole
  glow(0.2, 0xffd9a0, -6.9, 2.5, 3.0);                     // lamp shade
  at(cyl(0.26, 0.34, 0.5, dark), -7.3, 0.95, -5.1);        // plant pot
  at(blob(0.55, 0x2b4a33, 0.4), -7.3, 1.95, -5.1).scale.set(1, 1.35, 1);
  at(rbox(0.95, 0.58, 0.95, 0.24, 0x5a4f42), -2.2, 1.02, 2.6); // accent pouf
  const lLiving = warm(-4.4, 3.4, 0, 26, 16);
  lLiving.castShadow = true; lLiving.shadow.mapSize.set(512, 512); lLiving.shadow.bias = -0.01;

  /* ── kitchen + dining (right of centre) ── */
  at(rbox(3.4, 1.0, 1.3, 0.05, 0xd8d2c4), 4.6, 1.2, 0.6);  // island
  {  /* turned brass vase + sprig */
    const vase = new THREE.Mesh(
      new THREE.LatheGeometry([[0, 0], [0.15, 0.01], [0.19, 0.1], [0.1, 0.28], [0.13, 0.38]].map((p) => new THREE.Vector2(p[0], p[1])), 18),
      new THREE.MeshStandardMaterial({ color: 0xc6a15b, roughness: 0.35, metalness: 0.5 })
    );
    vase.castShadow = true;
    scene.add(at(vase, 3.9, 1.72, 0.6));
    at(blob(0.15, 0x2b4a33, 0.45), 3.9, 2.2, 0.6);
  }
  at(box(0.9, 0.06, 0.5, 0x9aa0a6, { metalness: 0.6, roughness: 0.3 }), 5.4, 1.74, 0.6); // sink
  [3.7, 4.6, 5.5].forEach((x) => {
    at(box(0.03, 0.9, 0.03, dark), x, 3.35, 0.6);          // pendant drops
    glow(0.12, 0xffd9a0, x, 2.85, 0.6);
  });
  [3.7, 4.6, 5.5].forEach((x) => {
    at(cyl(0.2, 0.16, 0.5, timber), x, 0.96, 1.7);
    at(rbox(0.4, 0.12, 0.4, 0.06, 0x564b3f), x, 1.27, 1.7);  // stool cushions
  });
  at(rbox(6.4, 1.0, 0.9, 0.04, 0x232019), 4.6, 1.2, -5.3); // rear counter
  at(rbox(6.4, 1.2, 0.14, 0.03, timber), 4.6, 3.2, -5.85); // upper cabinets
  at(box(6.2, 0.07, 0.06, 0x0e0f13, { emissive: 0xffc98a, emissiveIntensity: 1.3 }), 4.6, 2.5, -5.8); // backsplash strip
  at(rbox(0.9, 2.2, 0.8, 0.06, steel, { metalness: 0.5, roughness: 0.35 }), 0.9, 1.65, -5.4); // fridge
  at(cyl(0.09, 0.15, 0.75, dark), 0.9, 1.05, 2.4);         // dining pedestal
  at(cyl(1.02, 1.02, 0.07, timber), 0.9, 1.48, 2.4);       // round dining top
  glow(0.07, 0xffb36b, 0.9, 1.62, 2.4);                    // candle
  [[-0.15, 1.5], [1.95, 1.5], [-0.15, 3.3], [1.95, 3.3]].forEach(([x, z]) => {
    at(cyl(0.26, 0.3, 0.48, 0x3d3833), x, 0.95, z);
    at(rbox(0.5, 0.52, 0.13, 0.06, 0x3d3833), x, 1.5, z + (z > 2.4 ? 0.22 : -0.22)); // chair backs
  });
  warm(4.6, 3.3, -1.5, 22, 14);

  /* ── the stair: treads climbing the double-height void ── */
  const STEPS = 11;
  for (let i = 0; i < STEPS; i++) {
    at(rbox(1.5, 0.1, 0.55, 0.03, timber), 6.6, 0.9 + i * 0.36, 2.4 - i * 0.52);
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
  at(rbox(2.95, 0.22, 2.45, 0.05, timber), -4.2, 5.2, -2.4);   // bed platform
  at(rbox(2.6, 0.36, 2.15, 0.13, 0xd9d2c2), -4.2, 5.48, -2.4); // mattress
  at(rbox(2.66, 0.16, 1.3, 0.08, 0xe8e1d4), -4.2, 5.7, -1.95); // duvet
  [-4.85, -3.55].forEach((x) => at(rbox(0.64, 0.2, 0.42, 0.1, 0xefe9dc), x, 5.78, -3.2).rotation.x = -0.3);  // pillows
  [-4.55, -3.85].forEach((x) => at(rbox(0.48, 0.17, 0.32, 0.09, 0xc6a15b), x, 5.85, -2.98).rotation.x = -0.3); // accents
  at(rbox(2.6, 1.1, 0.16, 0.05, timber), -4.2, 5.8, -3.58);    // headboard
  at(rbox(2.1, 0.1, 0.8, 0.05, 0xc6a15b), -4.2, 5.68, -1.55).rotation.z = 0.03; // throw
  [-5.7, -2.7].forEach((x) => {
    at(box(0.5, 0.4, 0.5, dark), x, 5.3, -3.3);
    glow(0.12, 0xffd9a0, x, 5.65, -3.3);
  });
  at(cyl(2.0, 2.0, 0.04, 0x3a332b), -4.2, 5.12, -1.9);     // round rug
  at(box(4.6, 2.6, 0.12, 0x2a241d), -4.2, 6.4, -5.78);     // accent wall panel
  at(rbox(1.8, 0.35, 0.55, 0.13, 0x8a7f6d), -4.2, 5.32, -0.8); // foot bench
  at(rbox(1.8, 0.95, 0.5, 0.05, timber), 2.6, 5.6, -5.55); // dresser
  at(box(0.06, 1.6, 1.0, 0x9fb6c9, { metalness: 0.85, roughness: 0.05 }), 3.32, 6.3, -0.6); // mirror
  at(cyl(0.26, 0.34, 0.5, dark), -7.4, 5.3, 1.6);          // plant
  at(blob(0.5, 0x2b4a33, 0.4), -7.4, 6.2, 1.6).scale.set(1, 1.3, 1);
  at(box(11, 0.06, 0.06, 0x0e0f13, { emissive: 0xffc98a, emissiveIntensity: 1.0 }), -2.2, 7.95, 2.3); // cove light
  const lSuite = warm(-4.2, 7.2, -1.5, 14, 12);
  lSuite.castShadow = true; lSuite.shadow.mapSize.set(512, 512); lSuite.shadow.bias = -0.01;

  /* ── pool + terrace life ── */
  scene.add(at(new THREE.Mesh(
    new THREE.BoxGeometry(13, 0.25, 5.6),
    new THREE.MeshStandardMaterial({ color: 0x0f3f52, emissive: 0x1a7fa8, emissiveIntensity: 0.85, roughness: 0.15, metalness: 0.3 })
  ), 0, 0.44, 10.2));
  at(rbox(13.8, 0.14, 6.4, 0.06, 0xd8d2c4), 0, 0.35, 10.2); // coping
  [0, 1, 2].forEach((i) => at(box(2.2, 0.1, 0.4, 0xd8d2c4), -4.6, 0.52 - i * 0.1, 12.15 + i * 0.35)); // steps into the water
  warm(0, 2.2, 10.2, 14, 14, 0x6fd3ef);
  [-4.6, -2.9, 2.9, 4.6].forEach((x, i) => {
    at(rbox(0.8, 0.18, 2.1, 0.07, 0xbdb4a2), x, 0.62, 15.3);              // lounger
    at(rbox(0.8, 0.18, 0.85, 0.07, 0xbdb4a2), x, 0.88, 14.45).rotation.x = -0.55; // raised back
    if (i % 2) at(rbox(0.66, 0.06, 0.9, 0.025, i === 1 ? 0xc6a15b : 0xede7dc), x, 0.76, 15.55); // towels
  });
  at(cyl(0.04, 0.05, 2.3, dark), 6.2, 1.6, 15.6);          // umbrella pole
  {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(1.55, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0xcfc7b8, roughness: 0.95, side: THREE.DoubleSide })
    );
    dome.castShadow = true;
    scene.add(at(dome, 6.2, 2.75, 15.6));
    dome.scale.set(1, 0.5, 1);
  }
  at(cyl(0.32, 0.42, 0.4, dark), -6.6, 0.6, 12.6);         // fire pit base
  {
    const bowl = new THREE.Mesh(
      new THREE.SphereGeometry(0.62, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x14161b, roughness: 0.6, metalness: 0.45, side: THREE.DoubleSide })
    );
    bowl.castShadow = true;
    scene.add(at(bowl, -6.6, 1.0, 12.6));
    for (let i = 0; i < 6; i++)
      at(blob(0.09 + Math.random() * 0.05, 0x3d4048, 0.35), -6.6 + Math.cos(i * 1.05) * 0.22, 0.98, 12.6 + Math.sin(i * 1.05) * 0.22);
  }
  glow(0.18, 0xff9c52, -6.6, 0.85, 12.6);
  warm(-6.6, 1.4, 12.6, 7, 7, 0xff8c42);

  /* ── light halos: the cheap-bloom pass ── */
  halo(0, 1.2, 10.2, 11, 0x2fb6e0, 0.32);                   // pool glow
  [3.7, 4.6, 5.5].forEach((x) => halo(x, 2.85, 0.6, 1.3, 0xffd9a0, 0.75));
  halo(-6.9, 2.5, 3.0, 1.6, 0xffd9a0, 0.7);                 // floor lamp
  [-5.7, -2.7].forEach((x) => halo(x, 5.65, -3.3, 1.2, 0xffd9a0, 0.7));
  halo(-6.6, 0.95, 12.6, 2.6, 0xff8c42, 0.8);               // fire pit
  for (let i = 0; i < 5; i++) halo(i % 2 ? 2.4 : -2.4, 0.7, 20 + i * 3.4, 0.9, 0xffc98a, 0.6);
  halo(-2.9, 2.15, 33, 1.1, 0xffc98a, 0.6);
  halo(2.9, 2.15, 33, 1.1, 0xffc98a, 0.6);
  halo(-260, 320, -520, 110, 0xfff3d8, 0.45);               // moon halo
  halo(-4.4, 2.4, -5.55, 4.2, 0xc6a15b, 0.28);              // artwork wash

  /* ── trees ── */
  const tree = (x, z, s) => {
    at(cyl(0.1 * s, 0.17 * s, 1.7 * s, 0x3a2d20), x, 0.85 * s + 0.4, z);
    for (let i = 0; i < 3; i++) {
      at(
        blob((0.95 - i * 0.16) * s, 0x1d3323, 0.3),
        x + (Math.random() - 0.5) * 0.55 * s,
        (1.9 + i * 0.7) * s + 0.4,
        z + (Math.random() - 0.5) * 0.55 * s
      ).scale.set(1, 0.85 + Math.random() * 0.3, 1);
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
