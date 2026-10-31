// Diyalog düğümleri durum bağımlıdır. Bir düğüm: { speaker, text, choices:[{ text, action?, next? }] }
// action: { type: 'startQuest'|'completeQuest'|'openShop'|'close', id? }
export function mareDialogue(ctx) {
  const st = ctx.quests.status('shadows_road');
  if (st === 'available') return {
    speaker: 'Yaşlı Maren',
    text: 'Yabancı… kılıcın var, gözlerin kararlı. Kuzeybatıdaki Gözcü Yolu’nda goblinler kamp kurdu; ardında da Yosun Trolü var. Dört akıncıyı ve trolü yenersen köy sana borçlu kalır.',
    choices: [
      { text: 'Görevi kabul et', action: { type: 'startQuest', id: 'shadows_road' }, next: 'accepted' },
      { text: 'Daha sonra', action: { type: 'close' } },
    ],
    nodes: { accepted: { speaker: 'Yaşlı Maren', text: 'Teşekkür ederim. Yolu tutarsan kuzeybatıdaki taş işaretleri izle. Dikkatli ol; trolün darbeleri ağırdır. Gerekirse bloklamayı ve kaçınmayı unutma.', choices: [{ text: 'Hazırım', action: { type: 'close' } }] } },
  };
  if (st === 'active') return {
    speaker: 'Yaşlı Maren',
    text: 'Henüz işin bitmedi. Goblinler ve Yosun Trolü hâlâ Gözcü Yolu’nda. Görev günlüğünü (J) kontrol et.',
    choices: [{ text: 'Devam edeceğim', action: { type: 'close' } }],
  };
  if (st === 'ready') return {
    speaker: 'Yaşlı Maren',
    text: 'Gözcü Mührü! Yani başardın… Fellhaven’ın nefes alması için sana borçluyuz. Al ödülünü.',
    choices: [{ text: 'Ödülü al', action: { type: 'completeQuest', id: 'shadows_road' }, next: 'done' }],
    nodes: { done: { speaker: 'Yaşlı Maren', text: 'Yol artık güvende. İstersen Torin’in demirhanesine uğra; yeni bir kılıç için paran var.', choices: [{ text: 'Güle güle', action: { type: 'close' } }] } },
  };
  return { speaker: 'Yaşlı Maren', text: 'Fellhaven seni unutmayacak. Ormanlar sessiz, ama dağlarda daha fazla sır var…', choices: [{ text: 'Görüşürüz', action: { type: 'close' } }] };
}
export function torinDialogue() {
  return {
    speaker: 'Demirci Torin',
    text: 'Ateş sıcak, çelik soğuk. Alacak mısın, satacak mısın?',
    choices: [
      { text: 'Alışveriş yap', action: { type: 'openShop', id: 'torin' } },
      { text: 'Sadece bakıyorum', action: { type: 'close' } },
    ],
  };
}
export const SHOPS = {
  torin: { name: 'Torin’in Demirhanesi', stock: ['health_potion', 'stamina_tonic', 'bread', 'iron_sword', 'leather_vest', 'chain_shirt'] },
};
