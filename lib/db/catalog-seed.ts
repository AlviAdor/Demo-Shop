// Starting catalogue. It is written to the database on first run; after that the database is the source of truth.
import type { PhotoKey } from "../photos";

export type SeedProduct = {
  id: string; slug: string; name: string; category: string; price: number; colour: string;
  images: { key: PhotoKey; pos?: string }[]; sizes: string[]; tags: string[]; description: string; details: string[];
};

const CLOTHES = ["XS", "S", "M", "L", "XL"];
const WAIST = ["28", "30", "32", "34", "36"];
const SHOES = ["39", "40", "41", "42", "43", "44", "45"];

export const CATEGORY_SEED: { name: string; blurb: string; lead: string }[] = [
  { name: "Outerwear", blurb: "Coats and jackets cut with structure.", lead: "p01" },
  { name: "Knitwear", blurb: "Merino, wool and cotton, knitted to last.", lead: "p03" },
  { name: "Shirts", blurb: "Crisp poplin and brushed oxford.", lead: "p05" },
  { name: "Trousers", blurb: "Tailored lines, relaxed fits.", lead: "p07" },
  { name: "Footwear", blurb: "Leather and suede, resoled not replaced.", lead: "p09" },
  { name: "Bags", blurb: "Full-grain leather, quietly structured.", lead: "p11" },
];

export const PRODUCT_SEED: SeedProduct[] = [
  { id: "p01", slug: "longline-wool-coat", name: "Longline wool coat", category: "Outerwear", price: 329, colour: "Camel", images: [{ key: "coat-hat-editorial", pos: "50% 42%" }, { key: "coat-camel-street", pos: "50% 90%" }, { key: "coat-camel-stairs", pos: "55% 55%" }], sizes: CLOTHES, tags: ["classic", "work", "winter", "her", "him", "gift", "evening"], description: "A single-breasted coat in a heavy Italian wool blend. Notch lapels, welt pockets and a clean, long line.", details: ["80% wool, 20% polyamide", "Fully lined", "Dry clean only"] },
  { id: "p02", slug: "boxy-bomber-jacket", name: "Boxy bomber jacket", category: "Outerwear", price: 219, colour: "Rust", images: [{ key: "bomber-rust", pos: "50% 45%" }], sizes: CLOTHES, tags: ["everyday", "travel", "him", "her", "winter"], description: "A cropped bomber in water-repellent twill with a ribbed collar and hem. Easy over everything.", details: ["100% cotton shell", "Water repellent", "Ribbed trims"] },
  { id: "p03", slug: "cable-knit-sweater", name: "Cable knit sweater", category: "Knitwear", price: 119, colour: "Ecru", images: [{ key: "knit-cream", pos: "50% 50%" }], sizes: CLOTHES, tags: ["gift", "winter", "her", "him", "everyday", "classic"], description: "A chunky rib knit in soft lambswool with a relaxed shoulder and ribbed cuffs.", details: ["70% lambswool, 30% cotton", "Relaxed fit", "Hand wash cold"] },
  { id: "p04", slug: "merino-crewneck", name: "Merino crewneck", category: "Knitwear", price: 99, colour: "Oat", images: [{ key: "knit-oat", pos: "34% 40%" }], sizes: CLOTHES, tags: ["work", "everyday", "classic", "him", "her", "travel", "gift"], description: "A fine-gauge merino crewneck with a raglan sleeve. Light enough to layer, warm enough to wear alone.", details: ["100% extra-fine merino", "Regular fit", "Machine washable, wool cycle"] },
  { id: "p05", slug: "poplin-shirt", name: "Poplin shirt", category: "Shirts", price: 79, colour: "White", images: [{ key: "trousers-black-editorial", pos: "50% 6%" }], sizes: CLOTHES, tags: ["work", "classic", "everyday", "her", "him", "summer"], description: "A crisp cotton poplin shirt with a spread collar and a concealed placket.", details: ["100% organic cotton", "Regular fit", "Machine wash 40°"] },
  { id: "p06", slug: "oxford-shirt", name: "Oxford shirt", category: "Shirts", price: 85, colour: "Sky blue", images: [{ key: "shirt-blue", pos: "50% 50%" }], sizes: CLOTHES, tags: ["work", "everyday", "classic", "him", "summer", "gift"], description: "A brushed oxford with a button-down collar and a chest pocket. Gets better every wash.", details: ["100% cotton oxford", "Relaxed fit", "Machine wash 40°"] },
  { id: "p07", slug: "wide-leg-linen-trousers", name: "Wide-leg linen trousers", category: "Trousers", price: 129, colour: "Stone", images: [{ key: "linen-suit-editorial", pos: "50% 75%" }, { key: "trousers-black-editorial", pos: "50% 80%" }], sizes: WAIST, tags: ["work", "classic", "summer", "evening", "him", "her", "gift"], description: "High-waisted trousers in a fluid linen blend with a single pleat and a long, wide leg.", details: ["70% linen, 30% viscose", "High rise", "Machine wash 30°"] },
  { id: "p08", slug: "wide-leg-denim", name: "Wide-leg denim", category: "Trousers", price: 99, colour: "Mid blue", images: [{ key: "denim-wideleg", pos: "50% 55%" }], sizes: WAIST, tags: ["everyday", "travel", "her", "him", "summer"], description: "Rigid organic denim in a wide, straight cut that sits at the waist.", details: ["100% organic cotton", "Wide leg", "Machine wash 30°"] },
  { id: "p09", slug: "leather-chelsea-boot", name: "Leather chelsea boot", category: "Footwear", price: 189, colour: "Dark brown", images: [{ key: "chelsea-wood", pos: "50% 50%" }, { key: "chelsea-studio", pos: "50% 50%" }], sizes: SHOES, tags: ["classic", "work", "winter", "him", "her", "gift", "evening"], description: "A polished calf leather chelsea boot on a stacked leather heel with a Goodyear-welted sole.", details: ["Calf leather upper", "Leather lining", "Resoleable"] },
  { id: "p10", slug: "suede-loafer", name: "Suede loafer", category: "Footwear", price: 149, colour: "Tobacco", images: [{ key: "loafers-suede", pos: "50% 52%" }], sizes: SHOES, tags: ["everyday", "summer", "work", "him", "her", "travel"], description: "A soft suede penny loafer with a moulded footbed and a flexible leather sole.", details: ["Suede upper", "Leather sole", "Brush clean"] },
  { id: "p11", slug: "leather-utility-bag", name: "Leather utility bag", category: "Bags", price: 169, colour: "Cognac", images: [{ key: "bag-cognac-utility", pos: "50% 55%" }], sizes: ["One size"], tags: ["work", "gift", "classic", "her", "him", "travel"], description: "A roomy vegetable-tanned leather shoulder bag with two front pockets and contrast stitching.", details: ["Vegetable-tanned leather", "Zip main compartment", "Two front pockets"] },
  { id: "p12", slug: "leather-barrel-crossbody", name: "Leather barrel crossbody", category: "Bags", price: 139, colour: "Cognac", images: [{ key: "bag-crossbody", pos: "58% 28%" }], sizes: ["One size"], tags: ["everyday", "travel", "gift", "her", "evening", "summer"], description: "A small barrel crossbody in butter-soft full-grain leather with a slim adjustable strap.", details: ["Full-grain leather", "Adjustable strap", "Zip closure"] },
];
