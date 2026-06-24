/* ═══════════════════════════════════════════════════════════════
   Shared Chart Utilities — Premium Chart.js defaults
   ═══════════════════════════════════════════════════════════════ */

const CalcChart = {
  /** Premium dark tooltip used across all calculator charts. */
  tooltip(formatter) {
    return {
      backgroundColor: 'rgba(17, 24, 39, 0.96)',
      titleColor: '#fff',
      titleFont: { weight: '700', size: 12 },
      bodyColor: 'rgba(255,255,255,0.92)',
      bodyFont: { size: 12.5, weight: '600' },
      padding: { x: 14, y: 10 },
      cornerRadius: 10,
      displayColors: true,
      boxWidth: 8,
      boxHeight: 8,
      boxPadding: 6,
      borderColor: 'rgba(255,255,255,0.06)',
      borderWidth: 1,
      callbacks: formatter ? { label: formatter } : undefined
    };
  },

  /** Smooth premium animation defaults. */
  animation: {
    duration: 700,
    easing: 'easeOutQuart'
  },

  /** Light, minimal grid styling for axes. */
  yGrid() {
    const isDark = document.body.classList.contains('dark-mode');
    return {
      color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
      drawBorder: false
    };
  },

  /** Standard tick styling */
  ticks() {
    const isDark = document.body.classList.contains('dark-mode');
    return {
      color: isDark ? 'rgba(255,255,255,0.55)' : '#8c93a4',
      font: { size: 11, weight: '600' }
    };
  },

  /** Build a vertical area gradient on a canvas context. */
  areaGradient(ctx, hex, height) {
    const h = height || 320;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, hex.replace(')', ',0.32)').replace('rgb', 'rgba'));
    g.addColorStop(1, hex.replace(')', ',0.02)').replace('rgb', 'rgba'));
    return g;
  },

  /** Convert hex/rgb to rgba with alpha. */
  rgba(color, alpha) {
    if (color.startsWith('#')) {
      const h = color.slice(1);
      const bigint = parseInt(h.length === 3
        ? h.split('').map(c => c + c).join('')
        : h, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return color;
  },

  /** Vertical area gradient from a hex color. */
  hexGradient(ctx, hex, height) {
    const h = height || 320;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, this.rgba(hex, 0.32));
    g.addColorStop(1, this.rgba(hex, 0.02));
    return g;
  }
};
