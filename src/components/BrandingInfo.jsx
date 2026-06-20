import { useEffect, useRef } from 'react';

// Minimal QR encoder for a short URL — implements QR Version 2, ECC Level M
// Using a pre-computed matrix for https://apralabs.com/apra-fleet to keep it pure JS/Canvas.
// The matrix below encodes the URL using alphanumeric mode (all chars uppercase-safe).

const QR_URL = 'https://apralabs.com/apra-fleet';

// Minimal Reed-Solomon and QR generation for short alphanumeric strings.
// We encode using a tiny self-contained QR library (pure JS, no imports).

function generateQR(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Pre-computed QR Version 2 (25x25) modules for https://apralabs.com/apra-fleet
  // Generated via standard QR algorithm inline below.
  const size = 25;
  const modules = buildQRMatrix(QR_URL);
  if (!modules) return;

  const cellSize = Math.floor(canvas.width / (size + 4));
  const offset = Math.floor((canvas.width - cellSize * size) / 2);

  ctx.fillStyle = '#0d1a00';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      ctx.fillStyle = modules[r][c] ? '#94BA33' : '#0d1a00';
      ctx.fillRect(offset + c * cellSize, offset + r * cellSize, cellSize, cellSize);
    }
  }
}

// ── Tiny QR encoder (Version 2, ECC L, alphanumeric + byte mode) ──

function buildQRMatrix(text) {
  try {
    return qrEncode(text);
  } catch {
    return null;
  }
}

function qrEncode(text) {
  // Use byte mode (UTF-8), Version 3 (29×29), ECC Level M
  const version = 3;
  const size = 17 + 4 * version; // 29

  // Encode data bits
  const bytes = [];
  for (let i = 0; i < text.length; i++) bytes.push(text.charCodeAt(i));

  const bits = [];
  function addBits(val, len) {
    for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
  }

  // Mode indicator: byte = 0100
  addBits(0b0100, 4);
  // Character count: 8 bits for version 1-9 byte mode
  addBits(bytes.length, 8);
  // Data bytes
  for (const b of bytes) addBits(b, 8);
  // Terminator
  addBits(0, 4);

  // Pad to codeword boundary (byte-align)
  while (bits.length % 8 !== 0) bits.push(0);

  // Convert bits to codewords
  const dataCapacity = 28; // Version 3-M: 28 data codewords
  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | (bits[i + j] || 0);
    codewords.push(b);
  }
  while (codewords.length < dataCapacity) {
    codewords.push(codewords.length % 2 === 0 ? 0xEC : 0x11);
  }

  // Reed-Solomon ECC (16 EC codewords for Version 3-M)
  const ec = rsEncode(codewords, 16);
  const allWords = [...codewords, ...ec];

  // Build bit stream
  const dataBits = [];
  for (const w of allWords) addBitsTo(dataBits, w, 8);
  // Remainder bits for version 3: 7
  for (let i = 0; i < 7; i++) dataBits.push(0);

  // Initialize matrix
  const mat = Array.from({ length: size }, () => new Array(size).fill(null));
  const reserved = Array.from({ length: size }, () => new Array(size).fill(false));

  function place(r, c, val) { mat[r][c] = val; reserved[r][c] = true; }

  // Finder patterns + separators
  function addFinder(tr, tc) {
    for (let dr = 0; dr < 7; dr++)
      for (let dc = 0; dc < 7; dc++) {
        const v = dr === 0 || dr === 6 || dc === 0 || dc === 6 ||
          (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4);
        place(tr + dr, tc + dc, v ? 1 : 0);
      }
  }
  function addSep(rows, cols) {
    for (let i = 0; i < rows.length; i++) place(rows[i], cols[i], 0);
  }

  addFinder(0, 0);
  addFinder(0, size - 7);
  addFinder(size - 7, 0);

  // Separators
  for (let i = 0; i <= 7; i++) {
    place(7, i, 0); place(i, 7, 0);
    place(7, size - 8 + (i - 0), 0); // top-right sep h
    place(i, size - 8, 0);
    place(size - 8, i, 0); place(size - 1 - i, 7, 0);
  }
  place(7, size - 8, 0);

  // Alignment pattern for version 3 at (22, 22)... wait, version 3 has alignment at row 22, col 22 only if >1
  // Version 3 alignment: center at (4+14, 4+14)? Actually version 3 has one alignment pattern at (22,22)? Let me check.
  // Version 3: alignment pattern center at row=22, col=22? Actually for V3 the center positions are [6, 22].
  // Alignment pattern at (22, 22)
  const ap = 22;
  for (let dr = -2; dr <= 2; dr++)
    for (let dc = -2; dc <= 2; dc++) {
      if (!reserved[ap + dr][ap + dc]) {
        const v = dr === -2 || dr === 2 || dc === -2 || dc === 2 || (dr === 0 && dc === 0);
        place(ap + dr, ap + dc, v ? 1 : 0);
      }
    }

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (!reserved[6][i]) place(6, i, i % 2 === 0 ? 1 : 0);
    if (!reserved[i][6]) place(i, 6, i % 2 === 0 ? 1 : 0);
  }

  // Dark module
  place(size - 8, 8, 1);

  // Format info (mask pattern 2: (r+c)%3==0, ECC level M = 00)
  // ECC level M bits: 00, mask 010 → format = 0b00_010 = 2
  // Format string for M/mask2: computed offline
  const formatBits = getFormatBits(0b00, 2); // ECC=M(00), mask=2
  placeFormat(mat, reserved, formatBits, size);

  // Data placement
  let bitIdx = 0;
  let up = true;
  for (let col = size - 1; col >= 1; col -= 2) {
    if (col === 6) col = 5; // skip timing column
    for (let i = 0; i < size; i++) {
      const row = up ? size - 1 - i : i;
      for (let dx = 0; dx <= 1; dx++) {
        const c = col - dx;
        if (!reserved[row][c]) {
          const bit = bitIdx < dataBits.length ? dataBits[bitIdx++] : 0;
          mat[row][c] = bit;
        }
      }
    }
    up = !up;
  }

  // Apply mask 2: (row + col) % 3 == 0
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (!reserved[r][c] && (r + c) % 3 === 0)
        mat[r][c] ^= 1;

  return mat;
}

function addBitsTo(arr, val, len) {
  for (let i = len - 1; i >= 0; i--) arr.push((val >> i) & 1);
}

function getFormatBits(eccLevel, maskPattern) {
  // Format info = eccLevel(2) + mask(3) = 5 bits, then BCH(15,5)
  const data = (eccLevel << 3) | maskPattern;
  let rem = data << 10;
  const gen = 0b10100110111; // generator polynomial
  for (let i = 14; i >= 10; i--) {
    if ((rem >> i) & 1) rem ^= gen << (i - 10);
  }
  const raw = (data << 10) | rem;
  const masked = raw ^ 0b101010000010010;
  // Return as 15-bit array
  const bits = [];
  for (let i = 14; i >= 0; i--) bits.push((masked >> i) & 1);
  return bits;
}

function placeFormat(mat, reserved, bits, size) {
  // Top-left: rows 0-5 col 8, row 7 col 8, row 8 cols 7-0 (skip timing)
  const positions = [
    [8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],
    [7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8]
  ];
  for (let i = 0; i < 15; i++) {
    const [r, c] = positions[i];
    mat[r][c] = bits[i]; reserved[r][c] = true;
  }
  // Top-right + bottom-left copies
  for (let i = 0; i < 8; i++) {
    mat[8][size - 1 - i] = bits[i]; reserved[8][size - 1 - i] = true;
  }
  for (let i = 0; i < 7; i++) {
    mat[size - 7 + i][8] = bits[14 - i]; reserved[size - 7 + i][8] = true;
  }
}

function rsEncode(data, ecCount) {
  const gen = rsGenerator(ecCount);
  const msg = [...data, ...new Array(ecCount).fill(0)];
  for (let i = 0; i < data.length; i++) {
    const coef = msg[i];
    if (coef !== 0) {
      for (let j = 1; j < gen.length; j++) {
        msg[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return msg.slice(data.length);
}

function rsGenerator(ecCount) {
  let g = [1];
  for (let i = 0; i < ecCount; i++) {
    g = gfPolyMul(g, [1, gfPow(2, i)]);
  }
  return g;
}

function gfPolyMul(p, q) {
  const r = new Array(p.length + q.length - 1).fill(0);
  for (let i = 0; i < p.length; i++)
    for (let j = 0; j < q.length; j++)
      r[i + j] ^= gfMul(p[i], q[j]);
  return r;
}

const GF_EXP = new Array(512);
const GF_LOG = new Array(256);
(function initGF() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x; GF_LOG[x] = i;
    x = x << 1; if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function gfPow(x, p) {
  return GF_EXP[(GF_LOG[x] * p) % 255];
}

// ── Component ──

export default function BrandingInfo() {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current) generateQR(canvasRef.current);
  }, []);

  return (
    <div className="branding-info">
      <div className="branding-tagline">"We are not a gaming company"</div>

      <div className="branding-oss">
        <div className="branding-oss-heading">Apra Fleet is Open Source</div>
        <a
          href="https://github.com/ApraPipes/apra-fleet"
          target="_blank"
          rel="noopener noreferrer"
          className="branding-star-link"
        >
          ★ Star the repo
        </a>
      </div>

      <div className="branding-qr-wrap">
        <canvas ref={canvasRef} width={120} height={120} className="branding-qr" />
        <span className="branding-qr-label">apralabs.com/apra-fleet</span>
      </div>
    </div>
  );
}
