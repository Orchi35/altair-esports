# Penalty Arena artwork v1

Generated with the built-in image_gen tool on 2026-11-12. No external image API or API key was used. Artwork is a realistic football videogame rendering, not photographs. The two existing fictional player portraits were the visual references for the keeper atlas.

## Project assets

- `public/games/penalty/keepers-atlas-v1.webp` — 1024×1536 RGBA; 289,870 bytes. Left column: mcb06099 (893787). Right column: Tru-Ardas (927266). Ready crop y=0, h=680; dive crop y=690, h=370; landing crop y=1210, h=210. Both columns are 512px wide. Original alpha is preserved.
- `public/games/penalty/stadium-v1.webp` — 1536×1024; 467,320 bytes. Static stadium/pitch plate. Side crowd and flag regions are separately clipped and animated in SVG; confetti is independent of the aim and shot layers.
- `public/games/penalty/ball-v1.webp` — 512×512 RGBA; 78,896 bytes. Original generated image scaled down for the browser, retaining alpha.

Only encoding/resizing was used after image generation. Runtime SVG viewBoxes select poses from the uncut atlas. Keeper motion is a 2D keyframe sprite animation, not a rigged 3D simulation. Exactly one opaque pose renders at a time to prevent double bodies. Reduced-motion preference disables ambient movement and advances shot/recovery motion directly to its result.

## Motion update v2

### Pitch-side LED advertising

The SVG advertising board is painted behind the net and keeper at scene y=301. Its dark blue LED surface, panel edges, pixel texture and slow continuous ticker are code-native. Sponsor configuration lives in `src/pages/penalty/arenaSponsors.js`: `id`, `label`, optional local `logoSrc`, `foreground`, and `background`. Add approved sponsors to that array; all entries repeat in order without a blank seam. Logo images retain their aspect ratio. Reduced motion keeps the board still and removes the light sweep. No sponsor is implied by the default ALTAIR branding.

### Goal-frame collisions

The shared shot resolver reports `outcome: 'post'` with `postSide: 'left' | 'right' | 'crossbar'`. Only shots with power at least 45% reach the frame; the existing weak/wide rules take priority. Collision bands are x≤0.025, x≥0.975 or y≤0.045, including the ball radius. A post hit awards no points. At 68% flight the ball reaches its authoritative impact point, reverses spin and rebounds onto/outside the pitch. Only the struck frame segment gets a damped displacement (maximum 2.8 scene pixels) plus a short contact highlight. Both effects finish before the result screen; reduced motion skips directly to the settled result.

### Goal-net response

`GoalNet.jsx` renders a 36×14 SVG mesh. On goals, the flight ends at the rear net plane; a local impulse starts at that exact contact point and propagates through nearby strands. All perimeter attachment points stay fixed. `netMotion.js` damps the deformation over 1100ms while the ball drops into the net. Saves, misses and frame hits do not trigger it. The animation survives keeper recovery and resets per flight; reduced motion goes straight to the resting state. This replaces the previous whole-net opacity flash with a code-native 2D mesh deformation.

`public/games/penalty/keepers-transitions-v2.webp` — 887×1774 RGBA. Left/right crop origins are x=10/431, each 443px wide. Crouch y=0 h=445; push-off y=445 h=415; kneel y=860 h=385; overhead block y=1245 h=529. Viewport widths are 136/160/136/146 respectively; heights preserve the crop aspect ratio. The original atlas supplies ready, full dive and landing poses.

Shot and keeper use a single animation clock. Side saves meet the rotated glove anchor at 62% flight, then follow through and settle on the pitch. Central shots use an overhead jump or a grounded body block. Weak/wide shots use a restrained step. Next-shot recovery retains the final position, gets up and returns to center before re-enabling shooting. Both atlases preload before the first shot.

### Transition atlas prompt

Production football videogame goalkeeper animation sprite sheet, genuinely transparent alpha, no scenery or shadows. TWO columns and FOUR rows, eight separate complete human figures. Left column is dark curly hair man from reference1, right column silver swept hair man from reference2. Each wears reference emerald green longsleeved jersey navy shoulder panels, navy shorts, green socks, white padded gloves and white boots. Premium realistic videogame render, anatomical athletic adult proportions, exact same face/clothing per column, front camera, top-left lighting. Show each full body head to feet, isolated transparent generous margins, no overlapping cells. Row1: low ready crouch, legs apart, knees bent deeply, palms forward in front of chest, weight loaded to spring. Row2: beginning a strong diving launch towards SCREEN LEFT; left knee and hips moving left, right boot last pushing off ground on right, torso diagonal 35 degrees from vertical, head left, both arms reaching up-left, not yet horizontal. Row3: on one knee recovering after a save, left glove braced on turf (no turf rendered), right foot planted and knee raised, torso semi-upright looking ahead; a natural get-up kneeling pose. Row4: upright central blocking save, both arms raised and gloves close together above forehead, knees slightly bent, feet apart on ground. Each figure centered in own gridcell; rows have even spacing. No ball, no text, no letters, no panel lines. Portrait 1:2 canvas; full figures, do not crop hands or feet. Match existing game athletes, not stick figures, not cartoons. These are distinct keyframes designed for browser sprite animation.

## Prompts used

### Goalkeeper atlas

Create production game sprite atlas for a premium realistic 3D football penalty browser game. References are fictional game players: first image dark curly hair goalkeeper, second image silver swept hair goalkeeper. Preserve each face, emerald green long-sleeve goalkeeper shirt, navy shoulders and small gold details. Realistic athletic human anatomy, premium console football game render, detailed fabric, white padded gloves, navy shorts, green socks, white boots. Truly TRANSPARENT alpha background, no backdrop, no ground, no shadow, no text, no ball. EXACTLY SIX separate full-body sprites in a strict TWO COLUMN by THREE ROW equal-cell grid, portrait 2:3 canvas. LEFT COLUMN always first dark-haired player. RIGHT COLUMN always second silver-haired player. ROW1: facing camera, alert ready stance knees slightly bent hands open at hips, full head to boots. ROW2: each player diving horizontally to SCREEN LEFT with both gloved hands fully stretched toward left edge, head left, feet right, entire body airborne, anatomically coherent goalkeeper dive. ROW3: each player landing on left hip/side facing camera, arms extended screen left, knees bent naturally, nearly horizontal full-body landing pose. Every sprite entirely inside its equal-sized cell, generous transparent gutters no overlaps, same lighting from top left, consistent body and costume across rows. Characters fill cells without cropping. No cell lines, no captions, no extra people. A clean sprite atlas designed to crop into 6 equal cells and animate.

The generator produced unequal row heights; the runtime crop coordinates above match the inspected output rather than assuming equal rows.

### Stadium

Use case: stylized-concept. Asset type: production background plate for a premium realistic 3D football penalty game. Landscape 3:2 image. A large packed football stadium at night seen from the penalty taker's viewpoint, symmetrical camera looking straight at the end stand. Rich realistic console videogame render, not photography, not flat illustration. Dramatic white stadium floodlights in upper corners, blue navy architectural roof trusses, full stands of detailed tiny human supporters wearing blue and white, banners and blue flags at far left/right. Composition for a game overlay: stadium and crowd ONLY occupy upper 44 percent; turf ground plane begins along horizontal line at 48 percent image height; lower 52 percent is immaculate rich emerald grass pitch with realistic fine blades, alternating mowing bands converging into perspective, dewy specular highlights and subtle wear near penalty spot. Center of the image must stay clean for a separately rendered goal. Absolutely NO goal frame, NO goal net, NO goalkeeper, NO football, NO players on pitch, NO pitch markings or lines, NO scoreboard, NO text, NO logos. Pitch markings and goal will be rendered by game engine. Camera height about chest-height, natural football stadium scale. Soft atmospheric haze around lighting, detailed depth, restrained colors emerald turf and steel-blue stands, no neon. Clean playable scene, game environment rather than promotional poster.

### Football

Use case: stylized-concept. A single perfectly spherical modern professional football, isolated on genuinely transparent alpha background. Production game asset for a realistic premium 3D football video game. Centered ball fills 80 percent of square image with generous transparent padding. White textured microfiber leather with elegant deep navy blue and icy-blue curved geometric panel accents, fine recessed welded seams, subtle leather grain. Accurate spherical lighting from stadium lights above-left, soft cool rim light on right, realistic shaded lower hemisphere. Crisp polished PBR videogame render, no logos, no words, no branding, no ground plane, no cast shadow, no surrounding glow, no other objects. Fully round silhouette, front three-quarter lighting, high definition detail.
