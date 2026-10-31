// Eşya veritabanı. Yeni eşya eklemek için yalnızca buraya bir kayıt eklemek yeterlidir.
// type: weapon | armor | potion | food | material | quest
export const ITEM_TYPES = ['weapon', 'armor', 'potion', 'food', 'material', 'quest'];
export const TYPE_LABEL = { weapon: 'Silah', armor: 'Zırh', potion: 'İksir', food: 'Yiyecek', material: 'Malzeme', quest: 'Görev Eşyası' };

export const ITEMS = {
  rusty_sword:   { id: 'rusty_sword', name: 'Paslı Kılıç', type: 'weapon', icon: '🗡️', damage: 12, reach: 2.4, value: 8, stack: 1, desc: 'Köy nöbetçilerinden kalma eski bir kılıç.' },
  iron_sword:    { id: 'iron_sword', name: 'Demir Kılıç', type: 'weapon', icon: '⚔️', damage: 18, reach: 2.6, value: 60, stack: 1, desc: 'Torin’in dövdüğü dengeli bir kılıç.' },
  wardens_blade: { id: 'wardens_blade', name: 'Gözcü Pala', type: 'weapon', icon: '🗡️', damage: 24, reach: 2.8, value: 140, stack: 1, desc: 'Fellhaven gözcülerinin ödül palası.' },
  leather_vest:  { id: 'leather_vest', name: 'Deri Yelek', type: 'armor', icon: '🦺', defense: 2, value: 25, stack: 1, desc: 'Hafif ve hareketi kısıtlamayan koruma.' },
  chain_shirt:   { id: 'chain_shirt', name: 'Zincir Gömlek', type: 'armor', icon: '🛡️', defense: 5, value: 90, stack: 1, desc: 'Ağır ama güvenilir.' },
  health_potion: { id: 'health_potion', name: 'Can İksiri', type: 'potion', icon: '🧪', heal: 45, value: 20, stack: 10, desc: 'Canı 45 yeniler.' },
  stamina_tonic: { id: 'stamina_tonic', name: 'Dayanıklılık Tonik', type: 'potion', icon: '🍶', stamina: 100, value: 15, stack: 10, desc: 'Dayanıklılığı tamamen doldurur.' },
  bread:         { id: 'bread', name: 'Ekmek', type: 'food', icon: '🍞', heal: 15, value: 4, stack: 10, desc: 'Canı 15 yeniler.' },
  apple:         { id: 'apple', name: 'Elma', type: 'food', icon: '🍎', heal: 8, value: 2, stack: 10, desc: 'Canı 8 yeniler.' },
  wild_herb:     { id: 'wild_herb', name: 'Yabani Ot', type: 'material', icon: '🌿', value: 3, stack: 20, desc: 'İksir yapımında kullanılır (ileride).' },
  goblin_fang:   { id: 'goblin_fang', name: 'Goblin Dişi', type: 'material', icon: '🦷', value: 6, stack: 20, desc: 'Tüccarlar bunu satın alır.' },
  wardens_sigil: { id: 'wardens_sigil', name: 'Gözcü Mührü', type: 'quest', icon: '🔱', value: 0, stack: 1, desc: 'Yosun Trolü’nün taşıdığı eski mühür. Maren’e götür.' },
};

export const getItem = id => ITEMS[id] || null;
export const isConsumable = it => !!it && (it.type === 'potion' || it.type === 'food');
export const isEquippable = it => !!it && (it.type === 'weapon' || it.type === 'armor');
export const slotOf = it => (it.type === 'weapon' ? 'weapon' : it.type === 'armor' ? 'armor' : null);
export const sellPrice = it => Math.floor((it.value || 0) / 2);
