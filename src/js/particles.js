// Particle background
document.addEventListener('DOMContentLoaded', function () {
  const canvas = document.getElementById('hero-network');
  if (!canvas) return; // nothing to do if hero canvas not present
  const ctx = canvas.getContext('2d');

  // Resize canvas to cover the parent (.hero)
  function setCanvasDimensions() {
    const parent = canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    // set device-pixel-ratio aware sizes
    const dpr = Math.max(window.devicePixelRatio || 1, 1);
    // ensure the canvas is displayed as a block so sizing works predictably
    canvas.style.display = 'block';
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    // reset transform then scale to DPR so drawing coords map to CSS pixels
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    // cache CSS pixel sizes for use in animation loop
    canvas._cssWidth = rect.width;
    canvas._cssHeight = rect.height;
    canvas._dpr = dpr;
  }

  // Topics (visual drivers only)
  const topics = [
    { name: 'Linear Algebra', category: 'Mathematics', connections: [1, 3, 7, 9, 12] },
    { name: 'Quantum Physics', category: 'Physics', connections: [0, 2, 6, 10] },
    { name: 'Statistical Methods', category: 'Mathematics', connections: [0, 1, 4, 8, 13] },
    { name: 'Machine Learning', category: 'Computer Science', connections: [0, 2, 5, 8, 11] },
    { name: 'Climate Modeling', category: 'Environmental Science', connections: [2, 6, 9, 14] },
    { name: 'Neural Networks', category: 'Computer Science', connections: [3, 7, 10] },
    { name: 'Thermodynamics', category: 'Physics', connections: [1, 4, 9, 13] },
    { name: 'Computer Vision', category: 'Computer Science', connections: [0, 5, 11, 14] },
    { name: 'Data Analysis', category: 'Statistics', connections: [2, 3, 13, 15] },
    { name: 'Fluid Dynamics', category: 'Physics', connections: [0, 4, 6, 12] },
    { name: 'Quantum Computing', category: 'Computer Science', connections: [1, 5, 15] },
    { name: 'Artificial Intelligence', category: 'Computer Science', connections: [3, 7, 15] },
    { name: 'Structural Engineering', category: 'Engineering', connections: [0, 9, 14] },
    { name: 'Probability Theory', category: 'Mathematics', connections: [2, 6, 8] },
    { name: 'Sustainable Design', category: 'Engineering', connections: [4, 7, 12] },
    { name: 'Algorithm Design', category: 'Computer Science', connections: [8, 10, 11] }
  ];

  const particles = [];
  const keyTopics = [0, 2, 3, 8, 11];

  const categoryColors = {
    Mathematics: { r: 24, g: 78, b: 119 },
    Physics: { r: 26, g: 117, b: 159 },
    'Computer Science': { r: 42, g: 157, b: 143 },
    Statistics: { r: 52, g: 160, b: 164 },
    Engineering: { r: 82, g: 183, b: 136 },
    'Environmental Science': { r: 26, g: 117, b: 159 }
  };

  function initParticles() {
    particles.length = 0;
    // prefer cached CSS sizes set during resize; fall back to client sizes
    const width = canvas._cssWidth || canvas.clientWidth || canvas.width;
    const height = canvas._cssHeight || canvas.clientHeight || canvas.height;
    topics.forEach((topic, index) => {
      const isKey = keyTopics.includes(index);
      const color = categoryColors[topic.category] || { r: 24, g: 78, b: 119 };
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: isKey ? 4 : 3,
        originalColor: color,
        highlightColor: { r: 217, g: 237, b: 146 },
        velocityX: (Math.random() - 0.5) * 0.5,
        velocityY: (Math.random() - 0.5) * 0.5,
        isKeyTopic: isKey,
        isActive: false,
        activeTime: 0,
        activationInterval: 5000 + Math.random() * 10000,
        lastActivation: Math.random() * 5000,
        topic: topic,
        index: index
      });
    });
  }

  // initial sizing + particles
  setCanvasDimensions();
  initParticles();

  // keep in bounds and re-init on resize
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    // debounce
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      setCanvasDimensions();
      initParticles();
    }, 120);
  });

  let lastTime = performance.now();
  function animate(now) {
    const deltaTime = now - lastTime;
    lastTime = now;
    const width = canvas._cssWidth || canvas.clientWidth || canvas.width;
    const height = canvas._cssHeight || canvas.clientHeight || canvas.height;

    // clear using CSS pixel sizes (canvas is scaled to DPR via ctx.scale)
    ctx.clearRect(0, 0, width, height);

    // connections
    ctx.lineWidth = 0.5;
    particles.forEach(p => {
      (p.topic.connections || []).forEach(ci => {
        const q = particles[ci];
        if (!q) return;
        const dx = p.x - q.x;
        const dy = p.y - q.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxD = 150;
        if (dist < maxD) {
          let opacity = 0.08 * (1 - dist / maxD);
          if (p.isActive || q.isActive || p.isKeyTopic || q.isKeyTopic) opacity += 0.18;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = `rgba(52,160,164,${opacity})`;
          ctx.stroke();
        }
      });
    });

    // particles
    particles.forEach(p => {
      p.x += p.velocityX;
      p.y += p.velocityY;
      if (p.x < 0 || p.x > width) p.velocityX *= -1;
      if (p.y < 0 || p.y > height) p.velocityY *= -1;

      if (p.isKeyTopic) {
        p.lastActivation += deltaTime;
        if (p.lastActivation > p.activationInterval) {
          p.isActive = !p.isActive;
          p.lastActivation = 0;
          p.activeTime = 0;
        }
        if (p.isActive) {
          p.activeTime += deltaTime;
          if (p.activeTime > 3000) p.isActive = false;
        }
      }

      let finalColor = p.originalColor;
      if (p.isActive || p.isKeyTopic) {
        const prog = Math.sin((now % 2000) / 2000 * Math.PI) * 0.5 + 0.5;
        finalColor = {
          r: p.originalColor.r * (1 - prog) + p.highlightColor.r * prog,
          g: p.originalColor.g * (1 - prog) + p.highlightColor.g * prog,
          b: p.originalColor.b * (1 - prog) + p.highlightColor.b * prog
        };
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${Math.round(finalColor.r)}, ${Math.round(finalColor.g)}, ${Math.round(finalColor.b)})`;
      ctx.fill();

      if (p.isActive || p.isKeyTopic) {
        const glow = p.radius * 2.5;
        const grad = ctx.createRadialGradient(p.x, p.y, p.radius, p.x, p.y, glow);
        grad.addColorStop(0, `rgba(${Math.round(finalColor.r)}, ${Math.round(finalColor.g)}, ${Math.round(finalColor.b)}, 0.9)`);
        grad.addColorStop(1, `rgba(${Math.round(finalColor.r)}, ${Math.round(finalColor.g)}, ${Math.round(finalColor.b)}, 0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, glow, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }
    });

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
});
