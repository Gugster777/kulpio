// Source section: 00-locales-03.js
const L16 = {
  en:{photoLbl:"Photo"}, ru:{photoLbl:"Фото"}, ro:{photoLbl:"Foto"}, de:{photoLbl:"Foto"},
  fr:{photoLbl:"Photo"}, es:{photoLbl:"Foto"}, it:{photoLbl:"Foto"}, pt:{photoLbl:"Foto"},
  pl:{photoLbl:"Zdjęcie"}, tr:{photoLbl:"Fotoğraf"}, ar:{photoLbl:"صورة"}, zh:{photoLbl:"照片"},
  ja:{photoLbl:"写真"}, ko:{photoLbl:"사진"}, hi:{photoLbl:"फ़ोटो"}, uk:{photoLbl:"Фото"},
  nl:{photoLbl:"Foto"}, sv:{photoLbl:"Foto"}, no:{photoLbl:"Foto"}, da:{photoLbl:"Foto"},
  fi:{photoLbl:"Kuva"}, cs:{photoLbl:"Fotka"}, sk:{photoLbl:"Fotka"}, hu:{photoLbl:"Fotó"},
  bg:{photoLbl:"Снимка"}, sr:{photoLbl:"Fotografija"}, hr:{photoLbl:"Fotografija"},
  el:{photoLbl:"Φωτογραφία"}, he:{photoLbl:"תמונה"}, th:{photoLbl:"รูปถ่าย"},
  id:{photoLbl:"Foto"}, ms:{photoLbl:"Foto"}, vi:{photoLbl:"Ảnh"},
};
for (const lng in L16) L[lng] = Object.assign(L[lng] || {}, L16[lng]);

// One-button filter/sort menu on Home.
const L17 = {
  en:{filterLbl:"Filter",sortLbl:"Sort"}, ru:{filterLbl:"Фильтр",sortLbl:"Сортировка"},
  ro:{filterLbl:"Filtru",sortLbl:"Sortare"}, de:{filterLbl:"Filter",sortLbl:"Sortierung"},
  fr:{filterLbl:"Filtre",sortLbl:"Tri"}, es:{filterLbl:"Filtro",sortLbl:"Orden"},
  it:{filterLbl:"Filtro",sortLbl:"Ordina"}, pt:{filterLbl:"Filtro",sortLbl:"Ordenar"},
  pl:{filterLbl:"Filtr",sortLbl:"Sortowanie"}, tr:{filterLbl:"Filtre",sortLbl:"Sıralama"},
  ar:{filterLbl:"تصفية",sortLbl:"ترتيب"}, zh:{filterLbl:"筛选",sortLbl:"排序"},
  ja:{filterLbl:"フィルター",sortLbl:"並べ替え"}, ko:{filterLbl:"필터",sortLbl:"정렬"},
  hi:{filterLbl:"फ़िल्टर",sortLbl:"क्रम"}, uk:{filterLbl:"Фільтр",sortLbl:"Сортування"},
  nl:{filterLbl:"Filter",sortLbl:"Sorteren"}, sv:{filterLbl:"Filter",sortLbl:"Sortering"},
  no:{filterLbl:"Filter",sortLbl:"Sortering"}, da:{filterLbl:"Filter",sortLbl:"Sortering"},
  fi:{filterLbl:"Suodatin",sortLbl:"Lajittelu"}, cs:{filterLbl:"Filtr",sortLbl:"Řazení"},
  sk:{filterLbl:"Filter",sortLbl:"Zoradenie"}, hu:{filterLbl:"Szűrő",sortLbl:"Rendezés"},
  bg:{filterLbl:"Филтър",sortLbl:"Подредба"}, sr:{filterLbl:"Filter",sortLbl:"Sortiranje"},
  hr:{filterLbl:"Filtar",sortLbl:"Sortiranje"}, el:{filterLbl:"Φίλτρο",sortLbl:"Ταξινόμηση"},
  he:{filterLbl:"סינון",sortLbl:"מיון"}, th:{filterLbl:"ตัวกรอง",sortLbl:"เรียงลำดับ"},
  id:{filterLbl:"Filter",sortLbl:"Urutkan"}, ms:{filterLbl:"Penapis",sortLbl:"Isih"},
  vi:{filterLbl:"Bộ lọc",sortLbl:"Sắp xếp"},
};
for (const lng in L17) L[lng] = Object.assign(L[lng] || {}, L17[lng]);

// "Week ahead" expiry-strip title, all 33 languages.
const L18 = {
  en:{weekAhead:"Week ahead"}, ru:{weekAhead:"Ближайшая неделя"},
  ro:{weekAhead:"Săptămâna următoare"}, de:{weekAhead:"Wochenüberblick"},
  fr:{weekAhead:"La semaine à venir"}, es:{weekAhead:"Próximos 7 días"},
  it:{weekAhead:"Prossimi 7 giorni"}, pt:{weekAhead:"Próximos 7 dias"},
  pl:{weekAhead:"Nadchodzący tydzień"}, tr:{weekAhead:"Önümüzdeki hafta"},
  ar:{weekAhead:"الأسبوع القادم"}, zh:{weekAhead:"未来一周"},
  ja:{weekAhead:"今後1週間"}, ko:{weekAhead:"앞으로 일주일"},
  hi:{weekAhead:"आने वाला सप्ताह"}, uk:{weekAhead:"Найближчий тиждень"},
  nl:{weekAhead:"Komende week"}, sv:{weekAhead:"Veckan framöver"},
  no:{weekAhead:"Uken fremover"}, da:{weekAhead:"Ugen frem"},
  fi:{weekAhead:"Tuleva viikko"}, cs:{weekAhead:"Nadcházející týden"},
  sk:{weekAhead:"Nadchádzajúci týždeň"}, hu:{weekAhead:"A következő hét"},
  bg:{weekAhead:"Предстоящата седмица"}, sr:{weekAhead:"Narednih 7 dana"},
  hr:{weekAhead:"Sljedećih 7 dana"}, el:{weekAhead:"Η επόμενη εβδομάδα"},
  he:{weekAhead:"השבוע הקרוב"}, th:{weekAhead:"สัปดาห์ข้างหน้า"},
  id:{weekAhead:"Seminggu ke depan"}, ms:{weekAhead:"Seminggu akan datang"},
  vi:{weekAhead:"Tuần tới"},
};
for (const lng in L18) L[lng] = Object.assign(L[lng] || {}, L18[lng]);

// Achievement badge names + descriptions ({x} = money threshold), all 33 languages.
const L19 = {
  en:{achTitle:"Achievements",achFirst:"First bite",achFirstD:"Use your first item in time",achUse25:"Clean plate",achUse25D:"Use 25 items before they expire",achUse100:"Master chef",achUse100D:"Use 100 items before they expire",achWeek:"Fresh week",achWeekD:"7 days without wasting anything",achMonth:"Fresh month",achMonthD:"30 days without wasting anything",achFull:"Full house",achFullD:"Keep 15 items in the fridge at once",achSaver:"Money guardian",achSaverD:"Save {x} by eating food in time"},
  ru:{achTitle:"Достижения",achFirst:"Первый кусочек",achFirstD:"Используйте первый продукт вовремя",achUse25:"Чистая тарелка",achUse25D:"Используйте 25 продуктов до срока",achUse100:"Шеф-повар",achUse100D:"Используйте 100 продуктов до срока",achWeek:"Свежая неделя",achWeekD:"7 дней без выброшенной еды",achMonth:"Свежий месяц",achMonthD:"30 дней без выброшенной еды",achFull:"Полный дом",achFullD:"15 продуктов в холодильнике сразу",achSaver:"Хранитель денег",achSaverD:"Сэкономьте {x}, съедая еду вовремя"},
  ro:{achTitle:"Realizări",achFirst:"Prima mușcătură",achFirstD:"Folosește primul produs la timp",achUse25:"Farfurie curată",achUse25D:"Folosește 25 de produse înainte să expire",achUse100:"Maestru bucătar",achUse100D:"Folosește 100 de produse înainte să expire",achWeek:"Săptămână proaspătă",achWeekD:"7 zile fără risipă",achMonth:"Lună proaspătă",achMonthD:"30 de zile fără risipă",achFull:"Casă plină",achFullD:"Ține 15 produse în frigider deodată",achSaver:"Paznicul banilor",achSaverD:"Economisește {x} mâncând la timp"},
  de:{achTitle:"Erfolge",achFirst:"Erster Bissen",achFirstD:"Verbrauche dein erstes Produkt rechtzeitig",achUse25:"Leerer Teller",achUse25D:"Verbrauche 25 Produkte vor dem Ablauf",achUse100:"Meisterkoch",achUse100D:"Verbrauche 100 Produkte vor dem Ablauf",achWeek:"Frische Woche",achWeekD:"7 Tage ohne Verschwendung",achMonth:"Frischer Monat",achMonthD:"30 Tage ohne Verschwendung",achFull:"Volles Haus",achFullD:"15 Produkte gleichzeitig im Kühlschrank",achSaver:"Geldwächter",achSaverD:"Spare {x}, indem du rechtzeitig isst"},
  fr:{achTitle:"Succès",achFirst:"Première bouchée",achFirstD:"Utilise ton premier produit à temps",achUse25:"Assiette propre",achUse25D:"Utilise 25 produits avant expiration",achUse100:"Chef étoilé",achUse100D:"Utilise 100 produits avant expiration",achWeek:"Semaine fraîche",achWeekD:"7 jours sans gaspillage",achMonth:"Mois frais",achMonthD:"30 jours sans gaspillage",achFull:"Frigo plein",achFullD:"Garde 15 produits au frigo à la fois",achSaver:"Gardien des sous",achSaverD:"Économise {x} en mangeant à temps"},
  es:{achTitle:"Logros",achFirst:"Primer bocado",achFirstD:"Usa tu primer producto a tiempo",achUse25:"Plato limpio",achUse25D:"Usa 25 productos antes de que caduquen",achUse100:"Chef maestro",achUse100D:"Usa 100 productos antes de que caduquen",achWeek:"Semana fresca",achWeekD:"7 días sin desperdiciar nada",achMonth:"Mes fresco",achMonthD:"30 días sin desperdiciar nada",achFull:"Casa llena",achFullD:"Ten 15 productos en la nevera a la vez",achSaver:"Guardián del dinero",achSaverD:"Ahorra {x} comiendo a tiempo"},
  it:{achTitle:"Traguardi",achFirst:"Primo morso",achFirstD:"Usa il tuo primo prodotto in tempo",achUse25:"Piatto pulito",achUse25D:"Usa 25 prodotti prima della scadenza",achUse100:"Chef stellato",achUse100D:"Usa 100 prodotti prima della scadenza",achWeek:"Settimana fresca",achWeekD:"7 giorni senza sprechi",achMonth:"Mese fresco",achMonthD:"30 giorni senza sprechi",achFull:"Casa piena",achFullD:"Tieni 15 prodotti in frigo insieme",achSaver:"Guardiano dei soldi",achSaverD:"Risparmia {x} mangiando in tempo"},
  pt:{achTitle:"Conquistas",achFirst:"Primeira mordida",achFirstD:"Use seu primeiro produto a tempo",achUse25:"Prato limpo",achUse25D:"Use 25 produtos antes de vencerem",achUse100:"Chef mestre",achUse100D:"Use 100 produtos antes de vencerem",achWeek:"Semana fresca",achWeekD:"7 dias sem desperdício",achMonth:"Mês fresco",achMonthD:"30 dias sem desperdício",achFull:"Casa cheia",achFullD:"Tenha 15 produtos na geladeira ao mesmo tempo",achSaver:"Guardião do dinheiro",achSaverD:"Economize {x} comendo a tempo"},
  pl:{achTitle:"Osiągnięcia",achFirst:"Pierwszy kęs",achFirstD:"Zużyj pierwszy produkt na czas",achUse25:"Czysty talerz",achUse25D:"Zużyj 25 produktów przed terminem",achUse100:"Mistrz kuchni",achUse100D:"Zużyj 100 produktów przed terminem",achWeek:"Świeży tydzień",achWeekD:"7 dni bez marnowania",achMonth:"Świeży miesiąc",achMonthD:"30 dni bez marnowania",achFull:"Pełna lodówka",achFullD:"Miej 15 produktów w lodówce naraz",achSaver:"Strażnik pieniędzy",achSaverD:"Zaoszczędź {x}, jedząc na czas"},
  tr:{achTitle:"Başarılar",achFirst:"İlk lokma",achFirstD:"İlk ürününü zamanında tüket",achUse25:"Temiz tabak",achUse25D:"25 ürünü süresi dolmadan tüket",achUse100:"Usta şef",achUse100D:"100 ürünü süresi dolmadan tüket",achWeek:"Taze hafta",achWeekD:"7 gün hiç israf yok",achMonth:"Taze ay",achMonthD:"30 gün hiç israf yok",achFull:"Dolu ev",achFullD:"Buzdolabında aynı anda 15 ürün bulundur",achSaver:"Para bekçisi",achSaverD:"Zamanında yiyerek {x} biriktir"},
  ar:{achTitle:"الإنجازات",achFirst:"القضمة الأولى",achFirstD:"استخدم أول منتج في وقته",achUse25:"طبق نظيف",achUse25D:"استخدم 25 منتجاً قبل انتهاء صلاحيتها",achUse100:"طاهٍ ماهر",achUse100D:"استخدم 100 منتج قبل انتهاء صلاحيتها",achWeek:"أسبوع طازج",achWeekD:"7 أيام دون هدر",achMonth:"شهر طازج",achMonthD:"30 يوماً دون هدر",achFull:"بيت ممتلئ",achFullD:"احتفظ بـ15 منتجاً في الثلاجة معاً",achSaver:"حارس المال",achSaverD:"وفّر {x} بتناول الطعام في وقته"},
  zh:{achTitle:"成就",achFirst:"第一口",achFirstD:"及时用掉第一件食材",achUse25:"光盘行动",achUse25D:"在过期前用掉25件食材",achUse100:"大厨",achUse100D:"在过期前用掉100件食材",achWeek:"新鲜一周",achWeekD:"连续7天零浪费",achMonth:"新鲜一月",achMonthD:"连续30天零浪费",achFull:"满满一冰箱",achFullD:"冰箱同时存放15件食材",achSaver:"省钱卫士",achSaverD:"按时吃完，省下{x}"},
  ja:{achTitle:"実績",achFirst:"最初のひと口",achFirstD:"最初の食材を期限内に使う",achUse25:"完食",achUse25D:"25個の食材を期限内に使う",achUse100:"マスターシェフ",achUse100D:"100個の食材を期限内に使う",achWeek:"フレッシュな1週間",achWeekD:"7日間むだなし",achMonth:"フレッシュな1か月",achMonthD:"30日間むだなし",achFull:"満杯の冷蔵庫",achFullD:"冷蔵庫に同時に15個保存",achSaver:"節約の達人",achSaverD:"期限内に食べて{x}節約"},
  ko:{achTitle:"업적",achFirst:"첫 한 입",achFirstD:"첫 식품을 제때 사용하기",achUse25:"깨끗한 접시",achUse25D:"식품 25개를 기한 내 사용",achUse100:"마스터 셰프",achUse100D:"식품 100개를 기한 내 사용",achWeek:"신선한 일주일",achWeekD:"7일 동안 낭비 없음",achMonth:"신선한 한 달",achMonthD:"30일 동안 낭비 없음",achFull:"가득 찬 냉장고",achFullD:"냉장고에 한 번에 15개 보관",achSaver:"절약 지킴이",achSaverD:"제때 먹어서 {x} 절약"},
  hi:{achTitle:"उपलब्धियाँ",achFirst:"पहला निवाला",achFirstD:"पहला उत्पाद समय पर इस्तेमाल करें",achUse25:"साफ़ थाली",achUse25D:"25 उत्पाद समाप्ति से पहले इस्तेमाल करें",achUse100:"मास्टर शेफ़",achUse100D:"100 उत्पाद समाप्ति से पहले इस्तेमाल करें",achWeek:"ताज़ा सप्ताह",achWeekD:"7 दिन बिना बर्बादी",achMonth:"ताज़ा महीना",achMonthD:"30 दिन बिना बर्बादी",achFull:"भरा घर",achFullD:"फ्रिज में एक साथ 15 उत्पाद रखें",achSaver:"पैसों का रक्षक",achSaverD:"समय पर खाकर {x} बचाएँ"},
  uk:{achTitle:"Досягнення",achFirst:"Перший шматочок",achFirstD:"Використайте перший продукт вчасно",achUse25:"Чиста тарілка",achUse25D:"Використайте 25 продуктів до кінця терміну",achUse100:"Шеф-кухар",achUse100D:"Використайте 100 продуктів до кінця терміну",achWeek:"Свіжий тиждень",achWeekD:"7 днів без викинутої їжі",achMonth:"Свіжий місяць",achMonthD:"30 днів без викинутої їжі",achFull:"Повний дім",achFullD:"15 продуктів у холодильнику одночасно",achSaver:"Охоронець грошей",achSaverD:"Заощадьте {x}, з'їдаючи їжу вчасно"},
  nl:{achTitle:"Prestaties",achFirst:"Eerste hap",achFirstD:"Gebruik je eerste product op tijd",achUse25:"Schoon bord",achUse25D:"Gebruik 25 producten vóór de datum",achUse100:"Meesterkok",achUse100D:"Gebruik 100 producten vóór de datum",achWeek:"Frisse week",achWeekD:"7 dagen zonder verspilling",achMonth:"Frisse maand",achMonthD:"30 dagen zonder verspilling",achFull:"Vol huis",achFullD:"Houd 15 producten tegelijk in de koelkast",achSaver:"Geldbewaker",achSaverD:"Bespaar {x} door op tijd te eten"},
  sv:{achTitle:"Prestationer",achFirst:"Första tuggan",achFirstD:"Använd din första vara i tid",achUse25:"Ren tallrik",achUse25D:"Använd 25 varor innan de går ut",achUse100:"Mästerkock",achUse100D:"Använd 100 varor innan de går ut",achWeek:"Fräsch vecka",achWeekD:"7 dagar utan svinn",achMonth:"Fräsch månad",achMonthD:"30 dagar utan svinn",achFull:"Fullt hus",achFullD:"Ha 15 varor i kylen samtidigt",achSaver:"Pengavakt",achSaverD:"Spara {x} genom att äta i tid"},
  no:{achTitle:"Prestasjoner",achFirst:"Første bit",achFirstD:"Bruk din første vare i tide",achUse25:"Ren tallerken",achUse25D:"Bruk 25 varer før de går ut",achUse100:"Mesterkokk",achUse100D:"Bruk 100 varer før de går ut",achWeek:"Fersk uke",achWeekD:"7 dager uten svinn",achMonth:"Fersk måned",achMonthD:"30 dager uten svinn",achFull:"Fullt hus",achFullD:"Ha 15 varer i kjøleskapet samtidig",achSaver:"Pengevokter",achSaverD:"Spar {x} ved å spise i tide"},
  da:{achTitle:"Præstationer",achFirst:"Første bid",achFirstD:"Brug din første vare i tide",achUse25:"Ren tallerken",achUse25D:"Brug 25 varer før de udløber",achUse100:"Mesterkok",achUse100D:"Brug 100 varer før de udløber",achWeek:"Frisk uge",achWeekD:"7 dage uden madspild",achMonth:"Frisk måned",achMonthD:"30 dage uden madspild",achFull:"Fuldt hus",achFullD:"Hav 15 varer i køleskabet på én gang",achSaver:"Pengevogter",achSaverD:"Spar {x} ved at spise i tide"},
  fi:{achTitle:"Saavutukset",achFirst:"Ensimmäinen suupala",achFirstD:"Käytä ensimmäinen tuote ajoissa",achUse25:"Puhdas lautanen",achUse25D:"Käytä 25 tuotetta ennen vanhenemista",achUse100:"Mestarikokki",achUse100D:"Käytä 100 tuotetta ennen vanhenemista",achWeek:"Tuore viikko",achWeekD:"7 päivää ilman hävikkiä",achMonth:"Tuore kuukausi",achMonthD:"30 päivää ilman hävikkiä",achFull:"Täysi talo",achFullD:"Pidä 15 tuotetta jääkaapissa kerralla",achSaver:"Rahanvartija",achSaverD:"Säästä {x} syömällä ajoissa"},
  cs:{achTitle:"Úspěchy",achFirst:"První sousto",achFirstD:"Spotřebuj první potravinu včas",achUse25:"Čistý talíř",achUse25D:"Spotřebuj 25 potravin před expirací",achUse100:"Mistr kuchař",achUse100D:"Spotřebuj 100 potravin před expirací",achWeek:"Svěží týden",achWeekD:"7 dní bez plýtvání",achMonth:"Svěží měsíc",achMonthD:"30 dní bez plýtvání",achFull:"Plný dům",achFullD:"Měj v lednici 15 potravin najednou",achSaver:"Strážce peněz",achSaverD:"Ušetři {x} včasným snědením"},
  sk:{achTitle:"Úspechy",achFirst:"Prvé sústo",achFirstD:"Spotrebuj prvú potravinu včas",achUse25:"Čistý tanier",achUse25D:"Spotrebuj 25 potravín pred expiráciou",achUse100:"Majster kuchár",achUse100D:"Spotrebuj 100 potravín pred expiráciou",achWeek:"Svieži týždeň",achWeekD:"7 dní bez plytvania",achMonth:"Svieži mesiac",achMonthD:"30 dní bez plytvania",achFull:"Plný dom",achFullD:"Maj v chladničke 15 potravín naraz",achSaver:"Strážca peňazí",achSaverD:"Ušetri {x} včasným zjedením"},
  hu:{achTitle:"Eredmények",achFirst:"Első falat",achFirstD:"Használd fel az első terméket időben",achUse25:"Tiszta tányér",achUse25D:"Használj fel 25 terméket lejárat előtt",achUse100:"Mesterszakács",achUse100D:"Használj fel 100 terméket lejárat előtt",achWeek:"Friss hét",achWeekD:"7 nap pazarlás nélkül",achMonth:"Friss hónap",achMonthD:"30 nap pazarlás nélkül",achFull:"Teli ház",achFullD:"Tarts 15 terméket egyszerre a hűtőben",achSaver:"Pénzőrző",achSaverD:"Egyél időben, és spórolj meg {x}"},
  bg:{achTitle:"Постижения",achFirst:"Първа хапка",achFirstD:"Използвай първия продукт навреме",achUse25:"Чиста чиния",achUse25D:"Използвай 25 продукта преди срока",achUse100:"Майстор готвач",achUse100D:"Използвай 100 продукта преди срока",achWeek:"Свежа седмица",achWeekD:"7 дни без разхищение",achMonth:"Свеж месец",achMonthD:"30 дни без разхищение",achFull:"Пълна къща",achFullD:"Дръж 15 продукта в хладилника наведнъж",achSaver:"Пазител на парите",achSaverD:"Спести {x}, като ядеш навреме"},
  sr:{achTitle:"Dostignuća",achFirst:"Prvi zalogaj",achFirstD:"Iskoristi prvi proizvod na vreme",achUse25:"Čist tanjir",achUse25D:"Iskoristi 25 proizvoda pre isteka",achUse100:"Majstor kuvar",achUse100D:"Iskoristi 100 proizvoda pre isteka",achWeek:"Sveža nedelja",achWeekD:"7 dana bez bacanja hrane",achMonth:"Svež mesec",achMonthD:"30 dana bez bacanja hrane",achFull:"Puna kuća",achFullD:"Drži 15 proizvoda u frižideru odjednom",achSaver:"Čuvar novca",achSaverD:"Uštedi {x} jedući na vreme"},
  hr:{achTitle:"Postignuća",achFirst:"Prvi zalogaj",achFirstD:"Iskoristi prvi proizvod na vrijeme",achUse25:"Čist tanjur",achUse25D:"Iskoristi 25 proizvoda prije isteka",achUse100:"Majstor kuhar",achUse100D:"Iskoristi 100 proizvoda prije isteka",achWeek:"Svježi tjedan",achWeekD:"7 dana bez bacanja hrane",achMonth:"Svježi mjesec",achMonthD:"30 dana bez bacanja hrane",achFull:"Puna kuća",achFullD:"Drži 15 proizvoda u hladnjaku odjednom",achSaver:"Čuvar novca",achSaverD:"Uštedi {x} jedući na vrijeme"},
  el:{achTitle:"Επιτεύγματα",achFirst:"Πρώτη μπουκιά",achFirstD:"Χρησιμοποίησε το πρώτο προϊόν εγκαίρως",achUse25:"Καθαρό πιάτο",achUse25D:"Χρησιμοποίησε 25 προϊόντα πριν λήξουν",achUse100:"Αρχιμάγειρας",achUse100D:"Χρησιμοποίησε 100 προϊόντα πριν λήξουν",achWeek:"Φρέσκια εβδομάδα",achWeekD:"7 μέρες χωρίς σπατάλη",achMonth:"Φρέσκος μήνας",achMonthD:"30 μέρες χωρίς σπατάλη",achFull:"Γεμάτο σπίτι",achFullD:"Κράτα 15 προϊόντα στο ψυγείο ταυτόχρονα",achSaver:"Φύλακας χρημάτων",achSaverD:"Εξοικονόμησε {x} τρώγοντας εγκαίρως"},
  he:{achTitle:"הישגים",achFirst:"ביס ראשון",achFirstD:"השתמשו במוצר הראשון בזמן",achUse25:"צלחת נקייה",achUse25D:"השתמשו ב-25 מוצרים לפני שיפוגו",achUse100:"שף אמן",achUse100D:"השתמשו ב-100 מוצרים לפני שיפוגו",achWeek:"שבוע טרי",achWeekD:"7 ימים בלי בזבוז",achMonth:"חודש טרי",achMonthD:"30 ימים בלי בזבוז",achFull:"בית מלא",achFullD:"החזיקו 15 מוצרים במקרר בו-זמנית",achSaver:"שומר הכסף",achSaverD:"חסכו {x} באכילה בזמן"},
  th:{achTitle:"ความสำเร็จ",achFirst:"คำแรก",achFirstD:"ใช้ของชิ้นแรกให้ทันเวลา",achUse25:"จานสะอาด",achUse25D:"ใช้ของ 25 ชิ้นก่อนหมดอายุ",achUse100:"เชฟมือฉมัง",achUse100D:"ใช้ของ 100 ชิ้นก่อนหมดอายุ",achWeek:"สัปดาห์สดใหม่",achWeekD:"7 วันไม่ทิ้งอาหารเลย",achMonth:"เดือนสดใหม่",achMonthD:"30 วันไม่ทิ้งอาหารเลย",achFull:"บ้านเต็ม",achFullD:"มีของในตู้เย็นพร้อมกัน 15 ชิ้น",achSaver:"ผู้พิทักษ์เงิน",achSaverD:"ประหยัด {x} ด้วยการกินให้ทัน"},
  id:{achTitle:"Pencapaian",achFirst:"Gigitan pertama",achFirstD:"Gunakan produk pertamamu tepat waktu",achUse25:"Piring bersih",achUse25D:"Gunakan 25 produk sebelum kedaluwarsa",achUse100:"Chef andal",achUse100D:"Gunakan 100 produk sebelum kedaluwarsa",achWeek:"Minggu segar",achWeekD:"7 hari tanpa membuang makanan",achMonth:"Bulan segar",achMonthD:"30 hari tanpa membuang makanan",achFull:"Rumah penuh",achFullD:"Simpan 15 produk di kulkas sekaligus",achSaver:"Penjaga uang",achSaverD:"Hemat {x} dengan makan tepat waktu"},
  ms:{achTitle:"Pencapaian",achFirst:"Gigitan pertama",achFirstD:"Guna produk pertama anda tepat pada masanya",achUse25:"Pinggan bersih",achUse25D:"Guna 25 produk sebelum luput",achUse100:"Cef mahir",achUse100D:"Guna 100 produk sebelum luput",achWeek:"Minggu segar",achWeekD:"7 hari tanpa pembaziran",achMonth:"Bulan segar",achMonthD:"30 hari tanpa pembaziran",achFull:"Rumah penuh",achFullD:"Simpan 15 produk dalam peti sejuk serentak",achSaver:"Penjaga wang",achSaverD:"Jimat {x} dengan makan tepat pada masa"},
  vi:{achTitle:"Thành tích",achFirst:"Miếng đầu tiên",achFirstD:"Dùng sản phẩm đầu tiên đúng hạn",achUse25:"Đĩa sạch",achUse25D:"Dùng 25 sản phẩm trước khi hết hạn",achUse100:"Đầu bếp bậc thầy",achUse100D:"Dùng 100 sản phẩm trước khi hết hạn",achWeek:"Tuần tươi mới",achWeekD:"7 ngày không lãng phí",achMonth:"Tháng tươi mới",achMonthD:"30 ngày không lãng phí",achFull:"Nhà đầy ắp",achFullD:"Giữ 15 sản phẩm trong tủ lạnh cùng lúc",achSaver:"Người giữ tiền",achSaverD:"Tiết kiệm {x} bằng cách ăn đúng hạn"},
};
for (const lng in L19) L[lng] = Object.assign(L[lng] || {}, L19[lng]);

// "Money at risk" card title (Savings tab), all 33 languages.
const L20 = {
  en:{moneyAtRisk:"Money at risk"}, ru:{moneyAtRisk:"Деньги под угрозой"},
  ro:{moneyAtRisk:"Bani în pericol"}, de:{moneyAtRisk:"Geld in Gefahr"},
  fr:{moneyAtRisk:"Argent en jeu"}, es:{moneyAtRisk:"Dinero en riesgo"},
  it:{moneyAtRisk:"Soldi a rischio"}, pt:{moneyAtRisk:"Dinheiro em risco"},
  pl:{moneyAtRisk:"Zagrożone pieniądze"}, tr:{moneyAtRisk:"Risk altındaki para"},
  ar:{moneyAtRisk:"أموال في خطر"}, zh:{moneyAtRisk:"面临损失的钱"},
  ja:{moneyAtRisk:"失われそうなお金"}, ko:{moneyAtRisk:"잃을 수 있는 돈"},
  hi:{moneyAtRisk:"जोखिम में पैसा"}, uk:{moneyAtRisk:"Гроші під загрозою"},
  nl:{moneyAtRisk:"Geld op het spel"}, sv:{moneyAtRisk:"Pengar i farozonen"},
  no:{moneyAtRisk:"Penger i faresonen"}, da:{moneyAtRisk:"Penge i farezonen"},
  fi:{moneyAtRisk:"Rahat vaarassa"}, cs:{moneyAtRisk:"Peníze v ohrožení"},
  sk:{moneyAtRisk:"Peniaze v ohrození"}, hu:{moneyAtRisk:"Veszélyben lévő pénz"},
  bg:{moneyAtRisk:"Пари в риск"}, sr:{moneyAtRisk:"Novac u opasnosti"},
  hr:{moneyAtRisk:"Novac u opasnosti"}, el:{moneyAtRisk:"Χρήματα σε κίνδυνο"},
  he:{moneyAtRisk:"כסף בסיכון"}, th:{moneyAtRisk:"เงินที่เสี่ยงสูญ"},
  id:{moneyAtRisk:"Uang berisiko hilang"}, ms:{moneyAtRisk:"Wang berisiko hilang"},
  vi:{moneyAtRisk:"Tiền có nguy cơ mất"},
};
for (const lng in L20) L[lng] = Object.assign(L[lng] || {}, L20[lng]);

// Month-recap card (Profile) + share, all 33 languages.
const L21 = {
  en:{recapTitle:"This month",recapEaten:"eaten in time",recapWasted:"wasted",recapTop:"Most eaten",recapShare:"Share",recapCopied:"Copied!"},
  ru:{recapTitle:"В этом месяце",recapEaten:"съедено вовремя",recapWasted:"выброшено",recapTop:"Чаще всего ели",recapShare:"Поделиться",recapCopied:"Скопировано!"},
  ro:{recapTitle:"Luna aceasta",recapEaten:"mâncate la timp",recapWasted:"aruncate",recapTop:"Cel mai des mâncat",recapShare:"Distribuie",recapCopied:"Copiat!"},
  de:{recapTitle:"Diesen Monat",recapEaten:"rechtzeitig gegessen",recapWasted:"weggeworfen",recapTop:"Am häufigsten gegessen",recapShare:"Teilen",recapCopied:"Kopiert!"},
  fr:{recapTitle:"Ce mois-ci",recapEaten:"mangés à temps",recapWasted:"gaspillés",recapTop:"Le plus mangé",recapShare:"Partager",recapCopied:"Copié !"},
  es:{recapTitle:"Este mes",recapEaten:"comidos a tiempo",recapWasted:"desperdiciados",recapTop:"Lo más comido",recapShare:"Compartir",recapCopied:"¡Copiado!"},
  it:{recapTitle:"Questo mese",recapEaten:"mangiati in tempo",recapWasted:"sprecati",recapTop:"Il più mangiato",recapShare:"Condividi",recapCopied:"Copiato!"},
  pt:{recapTitle:"Este mês",recapEaten:"comidos a tempo",recapWasted:"desperdiçados",recapTop:"Mais comido",recapShare:"Compartilhar",recapCopied:"Copiado!"},
  pl:{recapTitle:"W tym miesiącu",recapEaten:"zjedzone na czas",recapWasted:"zmarnowane",recapTop:"Najczęściej jedzone",recapShare:"Udostępnij",recapCopied:"Skopiowano!"},
  tr:{recapTitle:"Bu ay",recapEaten:"zamanında yenen",recapWasted:"israf edilen",recapTop:"En çok yenen",recapShare:"Paylaş",recapCopied:"Kopyalandı!"},
  ar:{recapTitle:"هذا الشهر",recapEaten:"أُكلت في وقتها",recapWasted:"أُهدرت",recapTop:"الأكثر تناولاً",recapShare:"مشاركة",recapCopied:"تم النسخ!"},
  zh:{recapTitle:"本月",recapEaten:"按时吃掉",recapWasted:"浪费",recapTop:"吃得最多",recapShare:"分享",recapCopied:"已复制！"},
  ja:{recapTitle:"今月",recapEaten:"期限内に消費",recapWasted:"むだにした",recapTop:"一番食べた物",recapShare:"共有",recapCopied:"コピーしました！"},
  ko:{recapTitle:"이번 달",recapEaten:"제때 먹음",recapWasted:"낭비함",recapTop:"가장 많이 먹은 것",recapShare:"공유",recapCopied:"복사됨!"},
  hi:{recapTitle:"इस महीने",recapEaten:"समय पर खाए",recapWasted:"बर्बाद हुए",recapTop:"सबसे ज़्यादा खाया",recapShare:"साझा करें",recapCopied:"कॉपी हो गया!"},
  uk:{recapTitle:"Цього місяця",recapEaten:"з'їдено вчасно",recapWasted:"викинуто",recapTop:"Найчастіше їли",recapShare:"Поділитися",recapCopied:"Скопійовано!"},
  nl:{recapTitle:"Deze maand",recapEaten:"op tijd gegeten",recapWasted:"verspild",recapTop:"Meest gegeten",recapShare:"Delen",recapCopied:"Gekopieerd!"},
  sv:{recapTitle:"Den här månaden",recapEaten:"ätna i tid",recapWasted:"slängda",recapTop:"Mest äten",recapShare:"Dela",recapCopied:"Kopierat!"},
  no:{recapTitle:"Denne måneden",recapEaten:"spist i tide",recapWasted:"kastet",recapTop:"Mest spist",recapShare:"Del",recapCopied:"Kopiert!"},
  da:{recapTitle:"Denne måned",recapEaten:"spist i tide",recapWasted:"smidt ud",recapTop:"Mest spist",recapShare:"Del",recapCopied:"Kopieret!"},
  fi:{recapTitle:"Tässä kuussa",recapEaten:"syöty ajoissa",recapWasted:"hukattu",recapTop:"Eniten syöty",recapShare:"Jaa",recapCopied:"Kopioitu!"},
  cs:{recapTitle:"Tento měsíc",recapEaten:"snědeno včas",recapWasted:"vyhozeno",recapTop:"Nejčastěji jedené",recapShare:"Sdílet",recapCopied:"Zkopírováno!"},
  sk:{recapTitle:"Tento mesiac",recapEaten:"zjedené včas",recapWasted:"vyhodené",recapTop:"Najčastejšie jedené",recapShare:"Zdieľať",recapCopied:"Skopírované!"},
  hu:{recapTitle:"Ebben a hónapban",recapEaten:"időben megevett",recapWasted:"kidobott",recapTop:"Leggyakrabban evett",recapShare:"Megosztás",recapCopied:"Másolva!"},
  bg:{recapTitle:"Този месец",recapEaten:"изядени навреме",recapWasted:"изхвърлени",recapTop:"Най-често ядено",recapShare:"Сподели",recapCopied:"Копирано!"},
  sr:{recapTitle:"Ovog meseca",recapEaten:"pojedeno na vreme",recapWasted:"bačeno",recapTop:"Najčešće jedeno",recapShare:"Podeli",recapCopied:"Kopirano!"},
  hr:{recapTitle:"Ovog mjeseca",recapEaten:"pojedeno na vrijeme",recapWasted:"bačeno",recapTop:"Najčešće jedeno",recapShare:"Podijeli",recapCopied:"Kopirano!"},
  el:{recapTitle:"Αυτόν τον μήνα",recapEaten:"φαγώθηκαν εγκαίρως",recapWasted:"σπαταλήθηκαν",recapTop:"Το πιο φαγωμένο",recapShare:"Κοινοποίηση",recapCopied:"Αντιγράφηκε!"},
  he:{recapTitle:"החודש",recapEaten:"נאכלו בזמן",recapWasted:"בוזבזו",recapTop:"הנאכל ביותר",recapShare:"שיתוף",recapCopied:"הועתק!"},
  th:{recapTitle:"เดือนนี้",recapEaten:"กินทันเวลา",recapWasted:"ทิ้งไป",recapTop:"กินบ่อยที่สุด",recapShare:"แชร์",recapCopied:"คัดลอกแล้ว!"},
  id:{recapTitle:"Bulan ini",recapEaten:"dimakan tepat waktu",recapWasted:"terbuang",recapTop:"Paling sering dimakan",recapShare:"Bagikan",recapCopied:"Tersalin!"},
  ms:{recapTitle:"Bulan ini",recapEaten:"dimakan tepat masa",recapWasted:"dibazirkan",recapTop:"Paling kerap dimakan",recapShare:"Kongsi",recapCopied:"Disalin!"},
  vi:{recapTitle:"Tháng này",recapEaten:"ăn đúng hạn",recapWasted:"lãng phí",recapTop:"Ăn nhiều nhất",recapShare:"Chia sẻ",recapCopied:"Đã sao chép!"},
};
for (const lng in L21) L[lng] = Object.assign(L[lng] || {}, L21[lng]);

// Shopping-list estimated total, all 33 languages.
const L22 = {
  en:{estTotal:"Estimated total"}, ru:{estTotal:"Примерная сумма"},
  ro:{estTotal:"Total estimat"}, de:{estTotal:"Geschätzte Summe"},
  fr:{estTotal:"Total estimé"}, es:{estTotal:"Total estimado"},
  it:{estTotal:"Totale stimato"}, pt:{estTotal:"Total estimado"},
  pl:{estTotal:"Szacowana suma"}, tr:{estTotal:"Tahmini toplam"},
  ar:{estTotal:"الإجمالي التقديري"}, zh:{estTotal:"预计总额"},
  ja:{estTotal:"合計の目安"}, ko:{estTotal:"예상 합계"},
  hi:{estTotal:"अनुमानित कुल"}, uk:{estTotal:"Орієнтовна сума"},
  nl:{estTotal:"Geschat totaal"}, sv:{estTotal:"Uppskattad summa"},
  no:{estTotal:"Anslått sum"}, da:{estTotal:"Anslået sum"},
  fi:{estTotal:"Arvioitu summa"}, cs:{estTotal:"Odhadovaná částka"},
  sk:{estTotal:"Odhadovaná suma"}, hu:{estTotal:"Becsült összeg"},
  bg:{estTotal:"Приблизителна сума"}, sr:{estTotal:"Procenjen iznos"},
  hr:{estTotal:"Procijenjeni iznos"}, el:{estTotal:"Εκτιμώμενο σύνολο"},
  he:{estTotal:"סכום משוער"}, th:{estTotal:"ยอดรวมโดยประมาณ"},
  id:{estTotal:"Perkiraan total"}, ms:{estTotal:"Jumlah anggaran"},
  vi:{estTotal:"Tổng ước tính"},
};
for (const lng in L22) L[lng] = Object.assign(L[lng] || {}, L22[lng]);

// Price-trend tooltip ("was <old price>"), all 33 languages.
const L23 = {
  en:{priceWas:"was"}, ru:{priceWas:"было"}, ro:{priceWas:"era"},
  de:{priceWas:"vorher"}, fr:{priceWas:"avant"}, es:{priceWas:"antes"},
  it:{priceWas:"prima"}, pt:{priceWas:"antes"}, pl:{priceWas:"było"},
  tr:{priceWas:"önceden"}, ar:{priceWas:"سابقاً"}, zh:{priceWas:"原价"},
  ja:{priceWas:"以前"}, ko:{priceWas:"이전"}, hi:{priceWas:"पहले"},
  uk:{priceWas:"було"}, nl:{priceWas:"was"}, sv:{priceWas:"var"},
  no:{priceWas:"var"}, da:{priceWas:"var"}, fi:{priceWas:"ennen"},
  cs:{priceWas:"dříve"}, sk:{priceWas:"predtým"}, hu:{priceWas:"korábban"},
  bg:{priceWas:"преди"}, sr:{priceWas:"ranije"}, hr:{priceWas:"prije"},
  el:{priceWas:"πριν"}, he:{priceWas:"קודם"}, th:{priceWas:"ก่อนหน้า"},
  id:{priceWas:"sebelumnya"}, ms:{priceWas:"sebelum ini"}, vi:{priceWas:"trước đây"},
};
for (const lng in L23) L[lng] = Object.assign(L[lng] || {}, L23[lng]);

// Fridge category view: sort-chip label + shelf names, all 33 languages.
const L24 = {
  en:{sortCat:"Category",catProduce:"Fruit & veg",catDairy:"Dairy & eggs",catMeat:"Meat & fish",catBakery:"Bakery",catDrinks:"Drinks",catPantry:"Pantry",catFrozen:"Freezer",catOther:"Other"},
  ru:{sortCat:"Категория",catProduce:"Овощи и фрукты",catDairy:"Молочное и яйца",catMeat:"Мясо и рыба",catBakery:"Выпечка",catDrinks:"Напитки",catPantry:"Бакалея",catFrozen:"Морозилка",catOther:"Другое"},
  ro:{sortCat:"Categorie",catProduce:"Fructe și legume",catDairy:"Lactate și ouă",catMeat:"Carne și pește",catBakery:"Panificație",catDrinks:"Băuturi",catPantry:"Cămară",catFrozen:"Congelator",catOther:"Altele"},
  de:{sortCat:"Kategorie",catProduce:"Obst & Gemüse",catDairy:"Milchprodukte & Eier",catMeat:"Fleisch & Fisch",catBakery:"Backwaren",catDrinks:"Getränke",catPantry:"Vorrat",catFrozen:"Gefrierfach",catOther:"Sonstiges"},
  fr:{sortCat:"Catégorie",catProduce:"Fruits & légumes",catDairy:"Laitages & œufs",catMeat:"Viande & poisson",catBakery:"Boulangerie",catDrinks:"Boissons",catPantry:"Épicerie",catFrozen:"Congélateur",catOther:"Autre"},
  es:{sortCat:"Categoría",catProduce:"Frutas y verduras",catDairy:"Lácteos y huevos",catMeat:"Carne y pescado",catBakery:"Panadería",catDrinks:"Bebidas",catPantry:"Despensa",catFrozen:"Congelador",catOther:"Otros"},
  it:{sortCat:"Categoria",catProduce:"Frutta e verdura",catDairy:"Latticini e uova",catMeat:"Carne e pesce",catBakery:"Panetteria",catDrinks:"Bevande",catPantry:"Dispensa",catFrozen:"Congelatore",catOther:"Altro"},
  pt:{sortCat:"Categoria",catProduce:"Frutas e legumes",catDairy:"Laticínios e ovos",catMeat:"Carne e peixe",catBakery:"Padaria",catDrinks:"Bebidas",catPantry:"Despensa",catFrozen:"Congelador",catOther:"Outros"},
  pl:{sortCat:"Kategoria",catProduce:"Owoce i warzywa",catDairy:"Nabiał i jajka",catMeat:"Mięso i ryby",catBakery:"Pieczywo",catDrinks:"Napoje",catPantry:"Spiżarnia",catFrozen:"Zamrażarka",catOther:"Inne"},
  tr:{sortCat:"Kategori",catProduce:"Meyve ve sebze",catDairy:"Süt ürünleri ve yumurta",catMeat:"Et ve balık",catBakery:"Fırın",catDrinks:"İçecekler",catPantry:"Kiler",catFrozen:"Dondurucu",catOther:"Diğer"},
  ar:{sortCat:"الفئة",catProduce:"فواكه وخضروات",catDairy:"ألبان وبيض",catMeat:"لحوم وأسماك",catBakery:"مخبوزات",catDrinks:"مشروبات",catPantry:"مؤن",catFrozen:"الفريزر",catOther:"أخرى"},
  zh:{sortCat:"分类",catProduce:"果蔬",catDairy:"乳制品和蛋",catMeat:"肉类和鱼",catBakery:"烘焙",catDrinks:"饮品",catPantry:"干货",catFrozen:"冷冻",catOther:"其他"},
  ja:{sortCat:"カテゴリー",catProduce:"野菜・果物",catDairy:"乳製品・卵",catMeat:"肉・魚",catBakery:"パン類",catDrinks:"飲み物",catPantry:"保存食品",catFrozen:"冷凍庫",catOther:"その他"},
  ko:{sortCat:"카테고리",catProduce:"과일·채소",catDairy:"유제품·달걀",catMeat:"고기·생선",catBakery:"베이커리",catDrinks:"음료",catPantry:"저장식품",catFrozen:"냉동실",catOther:"기타"},
  hi:{sortCat:"श्रेणी",catProduce:"फल-सब्ज़ियाँ",catDairy:"डेयरी और अंडे",catMeat:"मांस और मछली",catBakery:"बेकरी",catDrinks:"पेय",catPantry:"पैंट्री",catFrozen:"फ्रीज़र",catOther:"अन्य"},
  uk:{sortCat:"Категорія",catProduce:"Овочі та фрукти",catDairy:"Молочне та яйця",catMeat:"М'ясо та риба",catBakery:"Випічка",catDrinks:"Напої",catPantry:"Бакалія",catFrozen:"Морозилка",catOther:"Інше"},
  nl:{sortCat:"Categorie",catProduce:"Groente & fruit",catDairy:"Zuivel & eieren",catMeat:"Vlees & vis",catBakery:"Brood",catDrinks:"Dranken",catPantry:"Voorraad",catFrozen:"Vriezer",catOther:"Overig"},
  sv:{sortCat:"Kategori",catProduce:"Frukt & grönt",catDairy:"Mejeri & ägg",catMeat:"Kött & fisk",catBakery:"Bröd",catDrinks:"Drycker",catPantry:"Skafferi",catFrozen:"Frys",catOther:"Övrigt"},
  no:{sortCat:"Kategori",catProduce:"Frukt & grønt",catDairy:"Meieri & egg",catMeat:"Kjøtt & fisk",catBakery:"Bakevarer",catDrinks:"Drikke",catPantry:"Spiskammer",catFrozen:"Fryser",catOther:"Annet"},
  da:{sortCat:"Kategori",catProduce:"Frugt & grønt",catDairy:"Mejeri & æg",catMeat:"Kød & fisk",catBakery:"Bagværk",catDrinks:"Drikkevarer",catPantry:"Spisekammer",catFrozen:"Fryser",catOther:"Andet"},
  fi:{sortCat:"Luokka",catProduce:"Hedelmät ja vihannekset",catDairy:"Maitotuotteet ja munat",catMeat:"Liha ja kala",catBakery:"Leivonnaiset",catDrinks:"Juomat",catPantry:"Kuiva-aineet",catFrozen:"Pakastin",catOther:"Muut"},
  cs:{sortCat:"Kategorie",catProduce:"Ovoce a zelenina",catDairy:"Mléčné a vejce",catMeat:"Maso a ryby",catBakery:"Pečivo",catDrinks:"Nápoje",catPantry:"Spíž",catFrozen:"Mrazák",catOther:"Ostatní"},
  sk:{sortCat:"Kategória",catProduce:"Ovocie a zelenina",catDairy:"Mliečne a vajcia",catMeat:"Mäso a ryby",catBakery:"Pečivo",catDrinks:"Nápoje",catPantry:"Špajza",catFrozen:"Mraznička",catOther:"Ostatné"},
  hu:{sortCat:"Kategória",catProduce:"Zöldség-gyümölcs",catDairy:"Tejtermék és tojás",catMeat:"Hús és hal",catBakery:"Pékáru",catDrinks:"Italok",catPantry:"Kamra",catFrozen:"Fagyasztó",catOther:"Egyéb"},
  bg:{sortCat:"Категория",catProduce:"Плодове и зеленчуци",catDairy:"Млечни и яйца",catMeat:"Месо и риба",catBakery:"Печива",catDrinks:"Напитки",catPantry:"Килер",catFrozen:"Фризер",catOther:"Друго"},
  sr:{sortCat:"Kategorija",catProduce:"Voće i povrće",catDairy:"Mlečno i jaja",catMeat:"Meso i riba",catBakery:"Pecivo",catDrinks:"Pića",catPantry:"Ostava",catFrozen:"Zamrzivač",catOther:"Ostalo"},
  hr:{sortCat:"Kategorija",catProduce:"Voće i povrće",catDairy:"Mliječno i jaja",catMeat:"Meso i riba",catBakery:"Pecivo",catDrinks:"Pića",catPantry:"Smočnica",catFrozen:"Zamrzivač",catOther:"Ostalo"},
  el:{sortCat:"Κατηγορία",catProduce:"Φρούτα & λαχανικά",catDairy:"Γαλακτοκομικά & αυγά",catMeat:"Κρέας & ψάρι",catBakery:"Αρτοσκευάσματα",catDrinks:"Ποτά",catPantry:"Κελάρι",catFrozen:"Κατάψυξη",catOther:"Άλλα"},
  he:{sortCat:"קטגוריה",catProduce:"פירות וירקות",catDairy:"חלב וביצים",catMeat:"בשר ודגים",catBakery:"מאפים",catDrinks:"משקאות",catPantry:"מזווה",catFrozen:"מקפיא",catOther:"אחר"},
  th:{sortCat:"หมวดหมู่",catProduce:"ผักและผลไม้",catDairy:"นมและไข่",catMeat:"เนื้อและปลา",catBakery:"เบเกอรี่",catDrinks:"เครื่องดื่ม",catPantry:"ของแห้ง",catFrozen:"ช่องแช่แข็ง",catOther:"อื่น ๆ"},
  id:{sortCat:"Kategori",catProduce:"Buah & sayur",catDairy:"Susu & telur",catMeat:"Daging & ikan",catBakery:"Roti",catDrinks:"Minuman",catPantry:"Sembako",catFrozen:"Freezer",catOther:"Lainnya"},
  ms:{sortCat:"Kategori",catProduce:"Buah & sayur",catDairy:"Tenusu & telur",catMeat:"Daging & ikan",catBakery:"Bakeri",catDrinks:"Minuman",catPantry:"Pantri",catFrozen:"Penyejuk beku",catOther:"Lain-lain"},
  vi:{sortCat:"Danh mục",catProduce:"Rau củ quả",catDairy:"Sữa & trứng",catMeat:"Thịt & cá",catBakery:"Bánh mì",catDrinks:"Đồ uống",catPantry:"Đồ khô",catFrozen:"Ngăn đông",catOther:"Khác"},
};
for (const lng in L24) L[lng] = Object.assign(L[lng] || {}, L24[lng]);

// Fridge view-toggle labels (aria), all 33 languages.
const L25 = {
  en:{gridView:"Grid view",listView:"List view"}, ru:{gridView:"Сеткой",listView:"Списком"},
  ro:{gridView:"Grilă",listView:"Listă"}, de:{gridView:"Rasteransicht",listView:"Listenansicht"},
  fr:{gridView:"Vue grille",listView:"Vue liste"}, es:{gridView:"Vista de cuadrícula",listView:"Vista de lista"},
  it:{gridView:"Vista a griglia",listView:"Vista elenco"}, pt:{gridView:"Em grade",listView:"Em lista"},
  pl:{gridView:"Widok siatki",listView:"Widok listy"}, tr:{gridView:"Izgara görünümü",listView:"Liste görünümü"},
  ar:{gridView:"عرض شبكي",listView:"عرض قائمة"}, zh:{gridView:"网格视图",listView:"列表视图"},
  ja:{gridView:"グリッド表示",listView:"リスト表示"}, ko:{gridView:"격자 보기",listView:"목록 보기"},
  hi:{gridView:"ग्रिड दृश्य",listView:"सूची दृश्य"}, uk:{gridView:"Сіткою",listView:"Списком"},
  nl:{gridView:"Rasterweergave",listView:"Lijstweergave"}, sv:{gridView:"Rutnätsvy",listView:"Listvy"},
  no:{gridView:"Rutenettvisning",listView:"Listevisning"}, da:{gridView:"Gittervisning",listView:"Listevisning"},
  fi:{gridView:"Ruudukkonäkymä",listView:"Luettelonäkymä"}, cs:{gridView:"Mřížka",listView:"Seznam"},
  sk:{gridView:"Mriežka",listView:"Zoznam"}, hu:{gridView:"Rácsnézet",listView:"Listanézet"},
  bg:{gridView:"Мрежа",listView:"Списък"}, sr:{gridView:"Mreža",listView:"Lista"},
  hr:{gridView:"Mreža",listView:"Popis"}, el:{gridView:"Προβολή πλέγματος",listView:"Προβολή λίστας"},
  he:{gridView:"תצוגת רשת",listView:"תצוגת רשימה"}, th:{gridView:"มุมมองตาราง",listView:"มุมมองรายการ"},
  id:{gridView:"Tampilan kisi",listView:"Tampilan daftar"}, ms:{gridView:"Paparan grid",listView:"Paparan senarai"},
  vi:{gridView:"Dạng lưới",listView:"Dạng danh sách"},
};
for (const lng in L25) L[lng] = Object.assign(L[lng] || {}, L25[lng]);

// First-run tour: 5 cards + buttons + menu entry, all 33 languages.
