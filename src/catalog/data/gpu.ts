import type { GpuPart } from '../types.ts';

// `power` is the chip maker's total graphics power unless the board maker
// publishes its own figure for the card, in which case that is used. `look`
// is read off the maker's photos of the card: what the fans, shroud, backplate
// and edges look like. Sizes a maker does not print are estimates from those
// photos and say so.
export const GPUS: GpuPart[] = [
  {
    id: 'msi-rtx-4060-ventus-2x-black-8g-oc', category: 'gpu', brand: 'MSI',
    name: 'GeForce RTX 4060 Ventus 2X', sku: 'RTX 4060 VENTUS 2X BLACK 8G OC',
    source: 'https://www.msi.com/Graphics-Card/GeForce-RTX-4060-VENTUS-2X-BLACK-8G-OC/Specification',
    outputs: { dp: 3, hdmi: 1 },
    look: {
      fanSizes: [90, 90], blades: 10, fanRing: 'pairs', pcb: 160, // fan and board sizes estimated from MSI's photos
      finish: { shroud: 'black', back: 'grey' },
      backplate: { open: 'bars', from: 0.79, to: 0.97, span: 0.75 },
      shroud: { cut: 20, corners: 'all', pattern: 'rims', wrap: 0.9 },
      edge: { fins: [] },
      power: { at: 149, recessed: true }, lights: {}, tail: 'closed', bracket: 'rounds',
    },
    chip: 'GeForce RTX 4060', length: 199, height: 120, thickness: 41,
    slots: 2.02, // derived from the 41 mm thickness
    power: 115, connectors: { pcie8: 1, hpwr16: 0 }, recommendedPsu: 550, fans: 2,
  },
  {
    id: 'asus-dual-rtx-4070', category: 'gpu', brand: 'ASUS',
    name: 'Dual GeForce RTX 4070', sku: 'DUAL-RTX4070-12G',
    source: 'https://www.asus.com/motherboards-components/graphics-cards/dual/dual-rtx4070-12g/techspec/',
    outputs: { dp: 3, hdmi: 1 },
    look: {
      fanSizes: [95, 95], blades: 11, fanRing: 'full', pcb: 230, // fan and board sizes estimated from ASUS's photos
      finish: { shroud: 'black', back: 'black' },
      backplate: { open: 'bars', from: 0.86, to: 0.98, span: 0.7, chip: { at: 0.43, size: 47, cross: false } },
      shroud: { cut: 15, corners: 'tail', pattern: 'rims', wrap: 0.33 },
      edge: { fins: [[0.13, 0.49], [0.64, 0.88]] },
      power: { at: 207, recessed: true }, lights: {}, tail: 'closed', bracket: 'slots',
    },
    chip: 'GeForce RTX 4070', length: 267, height: 133.9, thickness: 51.1,
    slots: 2.56, power: 200, connectors: { pcie8: 1, hpwr16: 0 }, recommendedPsu: 650, fans: 2,
  },
  {
    id: 'asus-prime-rtx-5070-12gb', category: 'gpu', brand: 'ASUS',
    name: 'Prime GeForce RTX 5070', sku: 'PRIME-RTX5070-12G',
    source: 'https://www.asus.com/motherboards-components/graphics-cards/prime/prime-rtx5070-12g/techspec/',
    outputs: { dp: 3, hdmi: 1 },
    look: {
      fanSizes: [90, 90, 90], blades: 11, fanRing: 'full', pcb: 195, // fan and board sizes estimated from ASUS's photos
      finish: { shroud: 'black', back: 'black' },
      backplate: { open: 'window', from: 0.75, to: 0.94, span: 0.75, chip: { at: 0.33, size: 56, cross: true } },
      shroud: { cut: 6, corners: 'tail', pattern: 'lines', wrap: 0.3 },
      edge: { fins: [[0.07, 0.45], [0.5, 0.92]] },
      power: { at: 175, recessed: true }, lights: {}, tail: 'closed', bracket: 'slots',
    },
    chip: 'GeForce RTX 5070', length: 304, height: 126, thickness: 50,
    slots: 2.5, power: 250, connectors: { pcie8: 0, hpwr16: 1 }, recommendedPsu: 750, fans: 3,
  },
  {
    id: 'gigabyte-rtx-4070-ti-super-gaming-oc-16g', category: 'gpu', brand: 'Gigabyte',
    name: 'GeForce RTX 4070 Ti Super Gaming OC', sku: 'GV-N407TSGAMING-OC-16GD',
    source: 'https://www.gigabyte.com/Graphics-Card/GV-N407TSGAMING-OC-16GD/sp',
    outputs: { dp: 3, hdmi: 1 },
    look: {
      // Gigabyte states three 90 mm fans. Its photos blur the blades; eleven is an estimate. Board length estimated.
      fanSizes: [90, 90, 90], blades: 11, fanRing: 'none', pcb: 180,
      finish: { shroud: 'black', back: 'grey' },
      backplate: { open: 'window', from: 0.61, to: 0.95, span: 0.85 },
      shroud: { cut: 8, corners: 'all', pattern: 'stripes', wrap: 0.35 },
      edge: { fins: [[0.05, 0.95]], plate: [0.68, 0.92] },
      power: { at: 150, recessed: true }, lights: { fans: true, edge: [0.7, 0.9] }, tail: 'closed', bracket: 'slants',
    },
    chip: 'GeForce RTX 4070 Ti SUPER', length: 300, height: 130, thickness: 57.6,
    slots: 2.83, // derived from the 57.6 mm thickness
    power: 285, connectors: { pcie8: 0, hpwr16: 1 }, recommendedPsu: 750, fans: 3,
  },
  {
    id: 'asus-tuf-gaming-rtx-4080-super-16gb', category: 'gpu', brand: 'ASUS',
    name: 'TUF Gaming GeForce RTX 4080 Super', sku: 'TUF-RTX4080S-16G-GAMING',
    source: 'https://www.asus.com/motherboards-components/graphics-cards/tuf-gaming/tuf-rtx4080s-16g-gaming/techspec/',
    outputs: { dp: 3, hdmi: 2 },
    look: {
      fanSizes: [104, 104, 104], blades: 7, fanRing: 'full', pcb: 225, // fan and board sizes estimated from ASUS's photos
      finish: { shroud: 'grey', back: 'black' },
      backplate: { open: 'bars', from: 0.665, to: 0.955, span: 0.83, chip: { at: 0.27, size: 70, cross: true } },
      shroud: { cut: 8, corners: 'all', pattern: 'wedges', wrap: 0.4 },
      edge: { fins: [[0.05, 0.75]], plate: [0.21, 0.72] },
      power: { at: 200, recessed: true }, lights: { edge: [0.77, 0.98] }, tail: 'cage', bracket: 'slots',
    },
    chip: 'GeForce RTX 4080 SUPER', length: 348.2, height: 150, thickness: 72.6,
    slots: 3.65, power: 320, connectors: { pcie8: 0, hpwr16: 1 }, recommendedPsu: 850, fans: 3,
  },
  {
    id: 'asus-rog-strix-rtx-4090', category: 'gpu', brand: 'ASUS',
    name: 'ROG Strix GeForce RTX 4090', sku: 'ROG-STRIX-RTX4090-24G-GAMING',
    source: 'https://rog.asus.com/graphics-cards/graphics-cards/rog-strix/rog-strix-rtx4090-24g-gaming-model/spec/',
    outputs: { dp: 3, hdmi: 2 },
    look: {
      fanSizes: [104, 104, 104], blades: 7, fanRing: 'full', pcb: 220, // fan size estimated from ASUS's photos; board length as a review reports it
      finish: { shroud: 'black', back: 'black' },
      backplate: { open: 'grid', from: 0.62, to: 0.95, span: 0.82, chip: { at: 0.27, size: 72, cross: true } },
      shroud: { cut: 0, corners: 'tail', pattern: 'stripes', wrap: 0.45 },
      edge: { fins: [[0.08, 0.9]] },
      power: { at: 201, recessed: true }, lights: { edge: [0.6, 0.96], tail: true }, tail: 'louvres', bracket: 'slots',
    },
    chip: 'GeForce RTX 4090', length: 357.6, height: 149.3, thickness: 70.1,
    slots: 3.5, power: 450, connectors: { pcie8: 0, hpwr16: 1 }, recommendedPsu: 1000, fans: 3,
  },
  {
    id: 'msi-rtx-5080-gaming-trio-oc-16g', category: 'gpu', brand: 'MSI',
    name: 'GeForce RTX 5080 Gaming Trio OC', sku: 'G5080-16GTC',
    source: 'https://www.msi.com/Graphics-Card/GeForce-RTX-5080-16G-GAMING-TRIO-OC/Specification',
    outputs: { dp: 3, hdmi: 1 },
    look: {
      fanSizes: [100, 100, 100], blades: 7, fanRing: 'full', pcb: 185, // fan and board sizes estimated from MSI's photos
      finish: { shroud: 'grey', back: 'black' },
      backplate: { open: 'bars', from: 0.56, to: 0.96, span: 0.84 },
      shroud: { cut: 6, corners: 'tail', pattern: 'wedges', wrap: 0.4 },
      // Read off an angled photo of the top edge; positions are approximate
      edge: { fins: [[0.05, 0.38], [0.5, 0.81]], plate: [0.22, 0.7] },
      power: { at: 160, recessed: true }, // position estimated from MSI's photos
      lights: { edge: [0.56, 0.62] }, tail: 'closed', bracket: 'truss',
    },
    chip: 'GeForce RTX 5080', length: 338, height: 140, thickness: 50,
    slots: 2.46, // derived from the 50 mm thickness
    power: 360, // MSI's figure for this board
    connectors: { pcie8: 0, hpwr16: 1 }, recommendedPsu: 850, fans: 3,
  },
  {
    id: 'gigabyte-rtx-5070-ti-gaming-oc-16g', category: 'gpu', brand: 'Gigabyte',
    name: 'GeForce RTX 5070 Ti Gaming OC', sku: 'GV-N507TGAMING-OC-16GD',
    source: 'https://www.gigabyte.com/Graphics-Card/GV-N507TGAMING-OC-16GD/sp',
    outputs: { dp: 3, hdmi: 1 },
    look: {
      // Fan sizes, blade count (the photos blur the blades) and board length estimated from Gigabyte's photos.
      fanSizes: [100, 100, 100], blades: 9, fanRing: 'none', pcb: 200,
      finish: { shroud: 'black', back: 'grey' },
      backplate: { open: 'window', from: 0.6, to: 0.95, span: 0.86, chip: { at: 0.28, size: 55, cross: true } },
      shroud: { cut: 8, corners: 'tail', pattern: 'plain', wrap: 0.33 },
      edge: { fins: [[0.05, 0.38], [0.43, 0.97]], plate: [0.45, 0.85] },
      power: { at: 172, recessed: true }, // position estimated from Gigabyte's photos
      lights: { fans: true, edge: [0.62, 0.82] }, tail: 'closed', bracket: 'slots',
    },
    chip: 'GeForce RTX 5070 Ti', length: 342, height: 142, thickness: 70,
    slots: 3.44, // derived from the 70 mm thickness
    power: 300, connectors: { pcie8: 0, hpwr16: 1 }, recommendedPsu: 750, fans: 3,
  },
  {
    id: 'asus-tuf-gaming-rtx-5090-32gb', category: 'gpu', brand: 'ASUS',
    name: 'TUF Gaming GeForce RTX 5090', sku: 'TUF-RTX5090-32G-GAMING',
    source: 'https://www.asus.com/motherboards-components/graphics-cards/tuf-gaming/tuf-rtx5090-32g-gaming/techspec/',
    outputs: { dp: 3, hdmi: 2 },
    look: {
      fanSizes: [104, 104, 104], blades: 7, fanRing: 'full', pcb: 215, // fan and board sizes estimated from ASUS's photos
      finish: { shroud: 'grey', back: 'grey' },
      // Chip window position and size estimated from an angled photo
      backplate: { open: 'bars', from: 0.62, to: 0.97, span: 0.85, chip: { at: 0.3, size: 50, cross: false } },
      shroud: { cut: 4, corners: 'all', pattern: 'rims', wrap: 0.5 },
      edge: { fins: [[0.04, 0.92]], plate: [0.22, 0.75] },
      power: { at: 203, recessed: true }, // position estimated from ASUS's photos
      lights: { edge: [0.82, 0.9] }, tail: 'louvres', bracket: 'slots',
    },
    chip: 'GeForce RTX 5090', length: 348, height: 146, thickness: 72,
    slots: 3.6, power: 575, connectors: { pcie8: 0, hpwr16: 1 }, recommendedPsu: 1000, fans: 3,
  },
  {
    id: 'msi-rtx-4070-super-ventus-2x-oc-12g', category: 'gpu', brand: 'MSI',
    name: 'GeForce RTX 4070 Super Ventus 2X OC', sku: 'RTX 4070 SUPER 12G VENTUS 2X OC',
    source: 'https://www.msi.com/Graphics-Card/GeForce-RTX-4070-SUPER-12G-VENTUS-2X-OC/Specification',
    outputs: { dp: 3, hdmi: 1 },
    look: {
      fanSizes: [100, 100], blades: 9, fanRing: 'none', pcb: 175, // fan size, blade count and board length estimated from MSI's photos
      finish: { shroud: 'silver', back: 'black' },
      backplate: { open: 'bars', from: 0.71, to: 0.97, span: 0.85, chip: { at: 0.39, size: 70, cross: true } },
      shroud: { cut: 12, corners: 'all', pattern: 'rims', wrap: 0.5 },
      edge: { fins: [[0.08, 0.92]] }, // MSI shows no view of this edge; estimated
      power: { at: 163, recessed: true }, // position estimated from MSI's photos
      lights: {}, tail: 'closed', bracket: 'rounds',
    },
    chip: 'GeForce RTX 4070 SUPER', length: 242, height: 125, thickness: 43,
    slots: 2.12, // derived from the 43 mm thickness
    power: 220, connectors: { pcie8: 0, hpwr16: 1 }, recommendedPsu: 650, fans: 2,
  },
  {
    id: 'sapphire-pulse-rx-7800-xt-16gb', category: 'gpu', brand: 'Sapphire',
    name: 'Pulse Radeon RX 7800 XT', sku: '11330-02-20G',
    source: 'https://www.sapphiretech.com/en/consumer/pulse-radeon-rx-7800-xt-16g-gddr6',
    outputs: { dp: 2, hdmi: 2 },
    look: {
      fanSizes: [95, 95], blades: 9, fanRing: 'full', pcb: 260, // fan and board sizes estimated from Sapphire's photos
      finish: { shroud: 'black', back: 'black' },
      backplate: { open: 'closed', from: 0, to: 0, span: 0, chip: { at: 0.43, size: 70, cross: true } },
      shroud: { cut: 10, corners: 'all', pattern: 'stripes', wrap: 0.33 },
      edge: { fins: [[0.33, 0.73]], plate: [0.03, 0.32] },
      power: { at: 227, recessed: true }, lights: {}, tail: 'closed', bracket: 'truss',
    },
    chip: 'Radeon RX 7800 XT', length: 280, height: 128.75, thickness: 52.57,
    slots: 2.5, power: 266, connectors: { pcie8: 2, hpwr16: 0 }, recommendedPsu: 700, fans: 2,
  },
  {
    id: 'sapphire-pulse-rx-9070-xt-16gb', category: 'gpu', brand: 'Sapphire',
    name: 'Pulse Radeon RX 9070 XT', sku: '11348-03-20G',
    source: 'https://www.sapphiretech.com/en/consumer/pulse-radeon-rx-9070-xt-16g-gddr6',
    outputs: { dp: 2, hdmi: 2 },
    look: {
      // Fan and board sizes estimated from Sapphire's photos; the middle fan is the smaller one.
      fanSizes: [100, 90, 100], blades: 7, fanRing: 'full', pcb: 200,
      finish: { shroud: 'black', back: 'black' },
      backplate: { open: 'bars', from: 0.63, to: 0.96, span: 0.8, chip: { at: 0.28, size: 58, cross: true } },
      shroud: { cut: 4, corners: 'all', pattern: 'wedges', wrap: 0.7 },
      edge: { fins: [[0.12, 0.33], [0.64, 0.76]], plate: [0.35, 0.45] },
      power: { at: 173, recessed: true }, lights: {}, tail: 'closed', bracket: 'truss',
    },
    chip: 'Radeon RX 9070 XT', length: 320, height: 120.25, thickness: 61.6,
    slots: 3, power: 304, connectors: { pcie8: 2, hpwr16: 0 }, recommendedPsu: 750, fans: 3,
  },
  {
    id: 'sapphire-nitro-plus-rx-7900-xtx-vapor-x-24gb', category: 'gpu', brand: 'Sapphire',
    name: 'Nitro+ Radeon RX 7900 XTX Vapor-X', sku: '11322-01-40G',
    source: 'https://www.sapphiretech.com/en/consumer/nitro-radeon-rx-7900-xtx-vaporx-24g-gddr6',
    outputs: { dp: 2, hdmi: 2 },
    look: {
      fanSizes: [100, 100, 100], blades: 9, fanRing: 'full', pcb: 275, // fan size and blade count from a teardown; board length estimated
      finish: { shroud: 'silver', back: 'silver' },
      backplate: { open: 'bars', from: 0.86, to: 0.99, span: 0.75, chip: { at: 0.36, size: 95, cross: true } },
      shroud: { cut: 6, corners: 'all', pattern: 'plain', wrap: 0.33 },
      edge: { fins: [[0.05, 0.95]] },
      power: { at: 246, recessed: true }, lights: { edge: [0.05, 0.98] }, tail: 'closed', bracket: 'mesh',
    },
    chip: 'Radeon RX 7900 XTX', length: 320, height: 135.75, thickness: 71.6,
    slots: 3.5,
    power: 420, // Sapphire's figure for this board; AMD's reference card is 355 W
    connectors: { pcie8: 3, hpwr16: 0 }, recommendedPsu: 800, fans: 3,
  },
  {
    id: 'powercolor-red-devil-rx-9070-xt-16gb', category: 'gpu', brand: 'PowerColor',
    name: 'Red Devil Radeon RX 9070 XT', sku: 'RX9070XT 16G-E/OC',
    source: 'https://www.powercolor.com/product-detail210.htm',
    outputs: { dp: 3, hdmi: 1 },
    look: {
      // PowerColor states three 100 mm fans. Blade count from its photos; board length estimated from a review's teardown photos.
      fanSizes: [100, 100, 100], blades: 9, fanRing: 'full', pcb: 220,
      finish: { shroud: 'black', back: 'black' },
      backplate: { open: 'window', from: 0.57, to: 0.95, span: 0.85, chip: { at: 0.26, size: 62, cross: true } },
      shroud: { cut: 18, corners: 'tail', pattern: 'wedges', wrap: 0.36 },
      edge: { fins: [[0.06, 0.94]] },
      power: { at: 188, recessed: true }, lights: { tail: true }, tail: 'closed', bracket: 'slants',
    },
    chip: 'Radeon RX 9070 XT', length: 340, height: 132, thickness: 69,
    slots: 3,
    power: 304, // AMD's figure; PowerColor prints none for this card
    connectors: { pcie8: 3, hpwr16: 0 }, recommendedPsu: 900, fans: 3,
  },
  {
    id: 'xfx-swift-rx-9070-xt-triple-fan-16gb', category: 'gpu', brand: 'XFX',
    name: 'Swift Radeon RX 9070 XT Triple Fan Gaming Edition', sku: 'RX-97TSWF3B9',
    source: 'https://xfxforce.com/shop/xfx-swift-amd-radeon-rx-9070xt-triple-fan-gaming-edition',
    outputs: { dp: 3, hdmi: 1 },
    look: {
      // Fan and board sizes estimated from XFX's photos; blade count as a review of the white edition of the same cooler counts it.
      fanSizes: [100, 100, 100], blades: 11, fanRing: 'none', pcb: 200,
      finish: { shroud: 'black', back: 'black' },
      backplate: { open: 'window', from: 0.62, to: 0.96, span: 0.72 },
      shroud: { cut: 4, corners: 'all', pattern: 'lines', wrap: 0.5 },
      edge: { fins: [[0.05, 0.47], [0.6, 0.96]] },
      power: { at: 176, recessed: true }, lights: { edge: [0.84, 0.96] }, tail: 'closed', bracket: 'slots',
    },
    chip: 'Radeon RX 9070 XT', length: 325,
    height: 120, // XFX prints 150 mm, which appears to include the bracket; the shroud measures about 120 mm in XFX's straight-on photo
    thickness: 65,
    slots: 3.5,
    power: 304, // AMD's figure; XFX prints none for this card
    connectors: { pcie8: 2, hpwr16: 0 }, recommendedPsu: 850, fans: 3,
  },
  {
    id: 'sapphire-pulse-rx-9060-xt-16gb', category: 'gpu', brand: 'Sapphire',
    name: 'Pulse Radeon RX 9060 XT', sku: '11350-03-20G',
    source: 'https://www.sapphiretech.com/en/consumer/pulse-radeon-rx-9060-xt-16g-gddr6',
    outputs: { dp: 1, hdmi: 2 },
    look: {
      fanSizes: [92, 92], blades: 7, fanRing: 'full', pcb: 170, // fan sizes from Sapphire's dimension drawing; board length estimated from its photos
      finish: { shroud: 'black', back: 'black' },
      backplate: { open: 'window', from: 0.73, to: 0.94, span: 0.85 },
      shroud: { cut: 0, corners: 'all', pattern: 'stripes', wrap: 0.45 },
      edge: { fins: [[0.03, 0.17]], plate: [0.17, 0.48] },
      power: { at: 138, recessed: true }, lights: {}, tail: 'closed', bracket: 'slants',
    },
    chip: 'Radeon RX 9060 XT', length: 240, height: 111.25, thickness: 46.08,
    slots: 2.3, power: 170, connectors: { pcie8: 1, hpwr16: 0 }, recommendedPsu: 450, fans: 2,
  },
  {
    id: 'intel-arc-b580-limited-edition-12gb', category: 'gpu', brand: 'Intel',
    name: 'Arc B580 Limited Edition', sku: '31P06HB0BA',
    source: 'https://www.intel.com/content/www/us/en/products/sku/241598/intel-arc-b580-graphics/specifications.html',
    outputs: { dp: 3, hdmi: 1 }, // Intel lists the port types only; the count is as a review's photo of the bracket shows it
    look: {
      // Intel publishes no photos of the card any more; fan size, blade count and board length are estimated from a review's photos.
      fanSizes: [90, 90], blades: 12, fanRing: 'none', pcb: 160,
      finish: { shroud: 'black', back: 'black' },
      backplate: { open: 'window', from: 0.57, to: 0.96, span: 0.77 },
      shroud: { cut: 6, corners: 'all', pattern: 'rims', wrap: 0.45 },
      edge: { fins: [[0.05, 0.95]] },
      power: { at: 137, recessed: true }, lights: {}, tail: 'closed', bracket: 'slots',
    },
    chip: 'Arc B580', length: 272, height: 115,
    thickness: 39, // Intel states two slots only; thickness as a review measured it
    slots: 2, power: 190, connectors: { pcie8: 1, hpwr16: 0 }, recommendedPsu: 600, fans: 2,
  },
  {
    id: 'asrock-rx-7700-xt-challenger-12gb-oc', category: 'gpu', brand: 'ASRock',
    name: 'Radeon RX 7700 XT Challenger 12GB OC', sku: 'RX7700XT CL 12GO',
    source: 'https://www.asrock.com/Graphics-Card/AMD/Radeon%20RX%207700%20XT%20Challenger%2012GB%20OC/index.asp',
    outputs: { dp: 3, hdmi: 1 },
    look: {
      fanSizes: [95, 95], blades: 9, fanRing: 'full', pcb: 255, // fan and board sizes estimated from ASRock's photos
      finish: { shroud: 'black', back: 'black' },
      backplate: { open: 'closed', from: 0, to: 0, span: 0 },
      shroud: { cut: 9, corners: 'all', pattern: 'stripes', wrap: 0.42 },
      edge: { fins: [[0.09, 0.5], [0.63, 0.95]] },
      power: { at: 233, recessed: true }, lights: {}, tail: 'closed', bracket: 'slants',
    },
    chip: 'Radeon RX 7700 XT', length: 267, height: 130, thickness: 51,
    slots: 2.51, // derived from the 51 mm thickness
    power: 245, // AMD's figure; ASRock prints none for this card
    connectors: { pcie8: 2, hpwr16: 0 }, recommendedPsu: 750, fans: 2,
  },
];
