import type { GpuPart } from '../types.ts';

// `power` is the chip maker's total graphics power unless the board maker
// publishes its own figure for the card, in which case that is used.
export const GPUS: GpuPart[] = [
  {
    id: 'msi-rtx-4060-ventus-2x-black-8g-oc', category: 'gpu', brand: 'MSI',
    name: 'GeForce RTX 4060 Ventus 2X', sku: 'RTX 4060 VENTUS 2X BLACK 8G OC',
    source: 'https://www.msi.com/Graphics-Card/GeForce-RTX-4060-VENTUS-2X-BLACK-8G-OC/Specification',
    outputs: { dp: 3, hdmi: 1 },
    chip: 'GeForce RTX 4060', length: 199, height: 120, thickness: 41,
    slots: 2.02, // derived from the 41 mm thickness
    power: 115, connectors: { pcie8: 1, hpwr16: 0 }, recommendedPsu: 550, fans: 2,
  },
  {
    id: 'asus-dual-rtx-4070', category: 'gpu', brand: 'ASUS',
    name: 'Dual GeForce RTX 4070', sku: 'DUAL-RTX4070-12G',
    source: 'https://www.asus.com/motherboards-components/graphics-cards/dual/dual-rtx4070-12g/techspec/',
    outputs: { dp: 3, hdmi: 1 },
    chip: 'GeForce RTX 4070', length: 267, height: 133.9, thickness: 51.1,
    slots: 2.56, power: 200, connectors: { pcie8: 1, hpwr16: 0 }, recommendedPsu: 650, fans: 2,
  },
  {
    id: 'asus-prime-rtx-5070-12gb', category: 'gpu', brand: 'ASUS',
    name: 'Prime GeForce RTX 5070', sku: 'PRIME-RTX5070-12G',
    source: 'https://www.asus.com/motherboards-components/graphics-cards/prime/prime-rtx5070-12g/techspec/',
    outputs: { dp: 3, hdmi: 1 },
    chip: 'GeForce RTX 5070', length: 304, height: 126, thickness: 50,
    slots: 2.5, power: 250, connectors: { pcie8: 0, hpwr16: 1 }, recommendedPsu: 750, fans: 3,
  },
  {
    id: 'gigabyte-rtx-4070-ti-super-gaming-oc-16g', category: 'gpu', brand: 'Gigabyte',
    name: 'GeForce RTX 4070 Ti Super Gaming OC', sku: 'GV-N407TSGAMING-OC-16GD',
    source: 'https://www.gigabyte.com/Graphics-Card/GV-N407TSGAMING-OC-16GD/sp',
    outputs: { dp: 3, hdmi: 1 },
    chip: 'GeForce RTX 4070 Ti SUPER', length: 300, height: 130, thickness: 57.6,
    slots: 2.83, // derived from the 57.6 mm thickness
    power: 285, connectors: { pcie8: 0, hpwr16: 1 }, recommendedPsu: 750, fans: 3,
  },
  {
    id: 'asus-tuf-gaming-rtx-4080-super-16gb', category: 'gpu', brand: 'ASUS',
    name: 'TUF Gaming GeForce RTX 4080 Super', sku: 'TUF-RTX4080S-16G-GAMING',
    source: 'https://www.asus.com/motherboards-components/graphics-cards/tuf-gaming/tuf-rtx4080s-16g-gaming/techspec/',
    outputs: { dp: 3, hdmi: 2 },
    chip: 'GeForce RTX 4080 SUPER', length: 348.2, height: 150, thickness: 72.6,
    slots: 3.65, power: 320, connectors: { pcie8: 0, hpwr16: 1 }, recommendedPsu: 850, fans: 3,
  },
  {
    id: 'asus-rog-strix-rtx-4090', category: 'gpu', brand: 'ASUS',
    name: 'ROG Strix GeForce RTX 4090', sku: 'ROG-STRIX-RTX4090-24G-GAMING',
    source: 'https://rog.asus.com/graphics-cards/graphics-cards/rog-strix/rog-strix-rtx4090-24g-gaming-model/spec/',
    outputs: { dp: 3, hdmi: 2 },
    chip: 'GeForce RTX 4090', length: 357.6, height: 149.3, thickness: 70.1,
    slots: 3.5, power: 450, connectors: { pcie8: 0, hpwr16: 1 }, recommendedPsu: 1000, fans: 3,
  },
  {
    id: 'sapphire-pulse-rx-7800-xt-16gb', category: 'gpu', brand: 'Sapphire',
    name: 'Pulse Radeon RX 7800 XT', sku: '11330-02-20G',
    source: 'https://www.sapphiretech.com/en/consumer/pulse-radeon-rx-7800-xt-16g-gddr6',
    outputs: { dp: 2, hdmi: 2 },
    chip: 'Radeon RX 7800 XT', length: 280, height: 128.75, thickness: 52.57,
    slots: 2.5, power: 266, connectors: { pcie8: 2, hpwr16: 0 }, recommendedPsu: 700, fans: 2,
  },
  {
    id: 'sapphire-pulse-rx-9070-xt-16gb', category: 'gpu', brand: 'Sapphire',
    name: 'Pulse Radeon RX 9070 XT', sku: '11348-03-20G',
    source: 'https://www.sapphiretech.com/en/consumer/pulse-radeon-rx-9070-xt-16g-gddr6',
    outputs: { dp: 2, hdmi: 2 },
    chip: 'Radeon RX 9070 XT', length: 320, height: 120.25, thickness: 61.6,
    slots: 3, power: 304, connectors: { pcie8: 2, hpwr16: 0 }, recommendedPsu: 750, fans: 3,
  },
  {
    id: 'sapphire-nitro-plus-rx-7900-xtx-vapor-x-24gb', category: 'gpu', brand: 'Sapphire',
    name: 'Nitro+ Radeon RX 7900 XTX Vapor-X', sku: '11322-01-40G',
    source: 'https://www.sapphiretech.com/en/consumer/nitro-radeon-rx-7900-xtx-vaporx-24g-gddr6',
    outputs: { dp: 2, hdmi: 2 },
    chip: 'Radeon RX 7900 XTX', length: 320, height: 135.75, thickness: 71.6,
    slots: 3.5,
    power: 420, // Sapphire's figure for this board; AMD's reference card is 355 W
    connectors: { pcie8: 3, hpwr16: 0 }, recommendedPsu: 800, fans: 3,
  },
];
