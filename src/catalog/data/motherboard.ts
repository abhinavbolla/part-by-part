import type { MotherboardPart } from '../types.ts';

// m2Slots lists each slot in the board's own numbering: the longest drive it
// takes (80 = 2280, 110 = 22110) and whether it accepts SATA M.2 drives.
export const MOTHERBOARDS: MotherboardPart[] = [
  {
    id: 'msi-b650-tomahawk-wifi', category: 'motherboard', brand: 'MSI', name: 'MAG B650 Tomahawk WiFi',
    sku: 'MAG B650 TOMAHAWK WIFI',
    source: 'https://www.msi.com/Motherboard/MAG-B650-TOMAHAWK-WIFI/Specification',
    socket: 'AM5', chipset: 'B650', formFactor: 'ATX', ramType: 'DDR5', ramSlots: 4, maxRamGb: 256,
    m2Slots: [
      { maxLength: 110, interfaces: ['nvme'] },
      { maxLength: 80, interfaces: ['nvme'] },
      { maxLength: 80, interfaces: ['nvme'] },
    ],
    sataPorts: 6, pcieX16Slots: 2, epsConnectors: 2, fanHeaders: 8,
  },
  {
    id: 'asus-rog-strix-b650e-f-gaming-wifi', category: 'motherboard', brand: 'ASUS',
    name: 'ROG Strix B650E-F Gaming WiFi', sku: 'ROG STRIX B650E-F GAMING WIFI',
    source: 'https://rog.asus.com/motherboards/rog-strix/rog-strix-b650e-f-gaming-wifi-model/spec/',
    socket: 'AM5', chipset: 'B650', formFactor: 'ATX', ramType: 'DDR5', ramSlots: 4, maxRamGb: 192,
    m2Slots: [
      { maxLength: 80, interfaces: ['nvme'] },
      { maxLength: 110, interfaces: ['nvme'] },
      { maxLength: 110, interfaces: ['nvme'] },
    ],
    // One 8-pin CPU socket plus a 4-pin +12 V.
    sataPorts: 4, pcieX16Slots: 2, epsConnectors: 1, fanHeaders: 7,
  },
  {
    id: 'gigabyte-x870-aorus-elite-wifi7', category: 'motherboard', brand: 'Gigabyte',
    name: 'X870 Aorus Elite WiFi7', sku: 'X870 AORUS ELITE WIFI7',
    source: 'https://www.gigabyte.com/Motherboard/X870-AORUS-ELITE-WIFI7-rev-10-11/sp',
    socket: 'AM5', chipset: 'X870', formFactor: 'ATX', ramType: 'DDR5', ramSlots: 4, maxRamGb: 256,
    m2Slots: [
      { maxLength: 110, interfaces: ['nvme'] },
      { maxLength: 110, interfaces: ['nvme'] },
      { maxLength: 110, interfaces: ['nvme'] },
      { maxLength: 110, interfaces: ['nvme'] },
    ],
    sataPorts: 4, pcieX16Slots: 3, epsConnectors: 2, fanHeaders: 8,
  },
  {
    id: 'msi-mag-z790-tomahawk-wifi', category: 'motherboard', brand: 'MSI', name: 'MAG Z790 Tomahawk WiFi',
    sku: 'MAG Z790 TOMAHAWK WIFI',
    source: 'https://www.msi.com/Motherboard/MAG-Z790-TOMAHAWK-WIFI/Specification',
    socket: 'LGA1700', chipset: 'Z790', formFactor: 'ATX', ramType: 'DDR5', ramSlots: 4, maxRamGb: 256,
    m2Slots: [
      { maxLength: 110, interfaces: ['nvme'] },
      { maxLength: 80, interfaces: ['nvme'] },
      { maxLength: 80, interfaces: ['nvme', 'sata'] },
      { maxLength: 80, interfaces: ['nvme'] },
    ],
    sataPorts: 7, pcieX16Slots: 2, epsConnectors: 2, fanHeaders: 8,
  },
  {
    id: 'msi-pro-z790-p-wifi-ddr4', category: 'motherboard', brand: 'MSI', name: 'PRO Z790-P WiFi DDR4',
    sku: 'PRO Z790-P WIFI DDR4',
    source: 'https://www.msi.com/Motherboard/PRO-Z790-P-WIFI-DDR4/Specification',
    socket: 'LGA1700', chipset: 'Z790', formFactor: 'ATX', ramType: 'DDR4', ramSlots: 4, maxRamGb: 128,
    m2Slots: [
      { maxLength: 110, interfaces: ['nvme'] },
      { maxLength: 80, interfaces: ['nvme'] },
      { maxLength: 80, interfaces: ['nvme', 'sata'] },
      { maxLength: 80, interfaces: ['nvme', 'sata'] },
    ],
    sataPorts: 6, pcieX16Slots: 3, epsConnectors: 2, fanHeaders: 8,
  },
  {
    id: 'msi-mag-z890-tomahawk-wifi', category: 'motherboard', brand: 'MSI', name: 'MAG Z890 Tomahawk WiFi',
    sku: 'MAG Z890 TOMAHAWK WIFI',
    source: 'https://www.msi.com/Motherboard/MAG-Z890-TOMAHAWK-WIFI/Specification',
    socket: 'LGA1851', chipset: 'Z890', formFactor: 'ATX', ramType: 'DDR5', ramSlots: 4, maxRamGb: 256,
    m2Slots: [
      { maxLength: 80, interfaces: ['nvme'] },
      { maxLength: 110, interfaces: ['nvme'] },
      { maxLength: 80, interfaces: ['nvme'] },
      { maxLength: 80, interfaces: ['nvme', 'sata'] },
    ],
    sataPorts: 4, pcieX16Slots: 3, epsConnectors: 2, fanHeaders: 8,
  },
  {
    id: 'asus-tuf-gaming-b650m-plus-wifi', category: 'motherboard', brand: 'ASUS',
    name: 'TUF Gaming B650M-Plus WiFi', sku: 'TUF GAMING B650M-PLUS WIFI',
    source: 'https://www.asus.com/motherboards-components/motherboards/tuf-gaming/tuf-gaming-b650m-plus-wifi/techspec/',
    socket: 'AM5', chipset: 'B650', formFactor: 'mATX', ramType: 'DDR5', ramSlots: 4, maxRamGb: 256,
    m2Slots: [
      { maxLength: 80, interfaces: ['nvme'] },
      { maxLength: 80, interfaces: ['nvme'] },
    ],
    // One 8-pin CPU socket plus a 4-pin +12 V.
    sataPorts: 4, pcieX16Slots: 2, epsConnectors: 1, fanHeaders: 6,
  },
  {
    id: 'asus-rog-strix-b650e-i-gaming-wifi', category: 'motherboard', brand: 'ASUS',
    name: 'ROG Strix B650E-I Gaming WiFi', sku: 'ROG STRIX B650E-I GAMING WIFI',
    source: 'https://rog.asus.com/motherboards/rog-strix/rog-strix-b650e-i-gaming-wifi-model/spec/',
    socket: 'AM5', chipset: 'B650', formFactor: 'Mini-ITX', ramType: 'DDR5', ramSlots: 2, maxRamGb: 96,
    m2Slots: [
      { maxLength: 80, interfaces: ['nvme'] },
      { maxLength: 80, interfaces: ['nvme'] },
    ],
    sataPorts: 2, pcieX16Slots: 1, epsConnectors: 1, fanHeaders: 3,
  },
];
