// createMarkerIcon.js

async function fetchBase64(url) {
  const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
  const blob = await fetch(proxyUrl).then(res => res.blob());

  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

export async function createMarkerIcon(imageUrl, labelText) {
  const base64 = await fetchBase64(imageUrl);

  // truncate
  const cleanText = labelText.length > 10 ? labelText.slice(0, 10) + "…" : labelText;

  // ---- RN sizing (perfect clone) ----
  const OUTER = 45;         // outer circle size
  const INNER = 40;         // image size inside (frame effect)
  const LABEL_W = 100;
  const LABEL_H = 22;

  const SVG_W = 100;
  const SVG_H = 95;

  const centerX = SVG_W / 2;
  const outerR = OUTER / 2;
  const innerR = INNER / 2;
  const thumbCY = 25;

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${SVG_W}" height="${SVG_H}">

    <defs>
      <!-- Shadow for circle -->
      <filter id="circleShadow">
        <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.20" />
      </filter>

      <!-- Label shadow -->
      <filter id="labelShadow">
        <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.15" />
      </filter>

      <!-- Clip inner image -->
      <clipPath id="innerClip">
        <circle cx="${centerX}" cy="${thumbCY}" r="${innerR}" />
      </clipPath>
    </defs>

    <!-- Outer circle (frame) -->
    <circle
      cx="${centerX}"
      cy="${thumbCY}"
      r="${outerR}"
      fill="#ffffff"
      stroke="#d37b01"
      stroke-width="2"
      filter="url(#circleShadow)"
    />

    <!-- Inner image (smaller for padding) -->
    <image
      href="${base64}"
      x="${centerX - innerR}"
      y="${thumbCY - innerR}"
      width="${INNER}"
      height="${INNER}"
      clip-path="url(#innerClip)"
      preserveAspectRatio="xMidYMid slice"
    />

    <!-- Label box -->
    <rect
      x="${(SVG_W - LABEL_W) / 2}"
      y="${thumbCY + outerR + 2}"
      width="${LABEL_W}"
      height="${LABEL_H}"
      rx="5"
      ry="5"
      fill="rgba(255,255,255,0.95)"
      stroke="#d37b01"
      stroke-width="1"
      filter="url(#labelShadow)"
    />

    <!-- Text -->
    <text
      x="${SVG_W / 2}"
      y="${thumbCY + outerR + 2 + LABEL_H / 2 + 1}"
      font-size="12"
      font-weight="700"
      font-family="Arial"
      fill="#d37b01"
      text-anchor="middle"
      alignment-baseline="middle"
    >
      ${cleanText}
    </text>
    <desc>${crypto.randomUUID()}</desc>
  </svg>
  `;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(SVG_W * 0.9, SVG_H * 0.9),
    anchor: new google.maps.Point((SVG_W * 0.9) / 2, SVG_H * 0.9)
  };
}
