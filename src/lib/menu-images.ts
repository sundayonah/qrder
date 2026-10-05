/** Dish-specific photos so labels match what's shown. */
const BY_ID: Record<string, string> = {
  // Rice / mains
  jollof:
    "https://images.unsplash.com/photo-1638436684761-7e59f8a9072f?w=800&h=600&fit=crop",
  "jollof-chicken":
    "https://images.unsplash.com/photo-1664992960082-0ea299a9c53e?w=800&h=600&fit=crop",
  "jollof-beef":
    "https://images.unsplash.com/photo-1665334217407-6688e6941a47?w=800&h=600&fit=crop",
  "fried-rice":
    "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&h=600&fit=crop",
  "coconut-rice":
    "https://images.unsplash.com/photo-1516684669134-de6f7c473a2a?w=800&h=600&fit=crop",
  ofada:
    "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&h=600&fit=crop",
  "native-rice":
    "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&h=600&fit=crop",

  // Soups
  egusi:
    "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&h=600&fit=crop",
  ogbono:
    "https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=800&h=600&fit=crop",
  okro:
    "https://images.unsplash.com/photo-1547592180-85f173990554?w=800&h=600&fit=crop",
  edikaikong:
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop",
  afang:
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=600&fit=crop",
  "ewedu-gbegiri":
    "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&h=600&fit=crop",
  "pepper-soup-goat":
    "https://images.unsplash.com/photo-1604908177522-402487ecbfd4?w=800&h=600&fit=crop",
  "pepper-soup-catfish":
    "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800&h=600&fit=crop",
  "fisherman-soup":
    "https://images.unsplash.com/photo-1559847844-5315695dadae?w=800&h=600&fit=crop",

  // Grill / protein
  suya:
    "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&h=600&fit=crop",
  "chicken-suya":
    "https://images.unsplash.com/photo-1527477396000-e27170b0c2b3?w=800&h=600&fit=crop",
  chicken:
    "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=800&h=600&fit=crop",
  "fried-chicken":
    "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=800&h=600&fit=crop",
  asun:
    "https://images.unsplash.com/photo-1529042410759-befb1204b468?w=800&h=600&fit=crop",
  nkwobi:
    "https://images.unsplash.com/photo-1432139509613-5c4255815697?w=800&h=600&fit=crop",
  "isi-ewu":
    "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&h=600&fit=crop",

  // Other mains
  "yam-porridge":
    "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&h=600&fit=crop",
  "beans-porridge":
    "https://images.unsplash.com/photo-1546549032-9571cd6b27df?w=800&h=600&fit=crop",
  spaghetti:
    "https://images.unsplash.com/photo-1622973536968-3ead9e780960?w=800&h=600&fit=crop",
  indomie:
    "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&h=600&fit=crop",
  "shawarma-chicken":
    "https://images.unsplash.com/photo-1529006557810-274b0b6def8d?w=800&h=600&fit=crop",
  burger:
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&h=600&fit=crop",
  "pepperoni-pizza":
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop",
  "bbq-wings":
    "https://images.unsplash.com/photo-1527477396000-e27170b0c2b3?w=800&h=600&fit=crop",

  // Swallow
  "pounded-yam":
    "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=800&h=600&fit=crop",
  eba: "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=800&h=600&fit=crop",
  fufu:
    "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=800&h=600&fit=crop",
  amala:
    "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&h=600&fit=crop",
  semo:
    "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=800&h=600&fit=crop",
  wheat:
    "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=800&h=600&fit=crop",

  // Sides
  plantain:
    "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=800&h=600&fit=crop",
  "moi-moi":
    "https://images.unsplash.com/photo-1546549032-9571cd6b27df?w=800&h=600&fit=crop",
  colslaw:
    "https://images.unsplash.com/photo-1625938145744-e380515394d0?w=800&h=600&fit=crop",
  salad:
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=600&fit=crop",
  fries:
    "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800&h=600&fit=crop",
  "yam-chips":
    "https://images.unsplash.com/photo-1518013437150-e0d4c7a6d6b9?w=800&h=600&fit=crop",
  "potato-wedges":
    "https://images.unsplash.com/photo-1518013437150-e0d4c7a6d6b9?w=800&h=600&fit=crop",
  "extra-meat":
    "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&h=600&fit=crop",
  "extra-fish":
    "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800&h=600&fit=crop",
  egg: "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=800&h=600&fit=crop",

  // Small chops
  "puff-puff":
    "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&h=600&fit=crop",
  "spring-rolls":
    "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&h=600&fit=crop",
  samosa:
    "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&h=600&fit=crop",
  gizzard:
    "https://images.unsplash.com/photo-1529042410759-befb1204b468?w=800&h=600&fit=crop",
  "chicken-nuggets":
    "https://images.unsplash.com/photo-1562967914-608f82629710?w=800&h=600&fit=crop",
  "sharwama-small-chops":
    "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=800&h=600&fit=crop",

  // Drinks
  zobo:
    "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=800&h=600&fit=crop",
  chapman:
    "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&h=600&fit=crop",
  "smoothie-mango":
    "https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=800&h=600&fit=crop",
  "smoothie-pineapple":
    "https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=800&h=600&fit=crop",
  "fresh-orange":
    "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=800&h=600&fit=crop",
  malt:
    "https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=800&h=600&fit=crop",
  coke:
    "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=800&h=600&fit=crop",
  fanta:
    "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&h=600&fit=crop",
  sprite:
    "https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=800&h=600&fit=crop",
  water:
    "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=800&h=600&fit=crop",
  "soda-water":
    "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=800&h=600&fit=crop",
  hollandia:
    "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&h=600&fit=crop",
  tea: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&h=600&fit=crop",
  coffee:
    "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&h=600&fit=crop",

  // Desserts
  "ice-cream":
    "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&h=600&fit=crop",
  "chin-chin":
    "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800&h=600&fit=crop",
  "cake-slice":
    "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&h=600&fit=crop",
  "fruit-salad":
    "https://images.unsplash.com/photo-1564093497595-593b23d0d2a3?w=800&h=600&fit=crop",
};

const FALLBACK =
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop";

/** Bump when dish photos change so Mongo/memory reseeds. */
export const MENU_IMAGE_VERSION = 4;

export function imageForItem(id: string, category?: string): string {
  return BY_ID[id] ?? FALLBACK;
}

export function withMenuImages<
  T extends { id: string; category: string; image?: string },
>(items: T[]): (T & { image: string })[] {
  return items.map((item) => ({
    ...item,
    image: BY_ID[item.id] ?? item.image ?? FALLBACK,
  }));
}
