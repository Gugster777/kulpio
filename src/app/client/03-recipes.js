// Source section: 03-recipes.js
// ─── RECIPES HELPERS ─────────────────────────────────────────────
function cleanName(name) {
  return String(name || '').toLowerCase().replace(/\d+[a-zа-яA-ZА-Я]*/g,'').replace(/danone|x\d+/gi,'').trim();
}
function fridgeIngredients() {
  return state.products.map(p => cleanName(p.name)).filter(Boolean);
}

// ─── MULTILINGUAL FOOD DICTIONARY ───────────────────────────────
// Maps grocery words from many languages to their English ingredient so the
// recipe search (TheMealDB is English-only) works whatever language you add
// products in. english key → list of synonyms across languages.
const FOOD_SYNONYMS = {
  milk:["lapte","молоко","milch","lait","leche","latte","leite","mleko","mlijeko","mléko","mlieko","tej","süt","mjölk","melk","mleko","молоко"],
  egg:["egg","eggs","ou","oua","ouă","яйцо","яйца","ei","eier","oeuf","œuf","oeufs","huevo","huevos","uovo","uova","ovo","ovos","jajko","jajka","яйце","яйця","yumurta","ägg"],
  cheese:["cheese","branza","brânză","сыр","käse","kase","fromage","queso","formaggio","queijo","ser","сир","peynir","kaas","ost"],
  butter:["butter","unt","масло","beurre","mantequilla","burro","manteiga","masło","maslo","tereyağı","boter","smör"],
  yogurt:["yogurt","yoghurt","iaurt","йогурт","joghurt","yaourt","yogur","iogurte","jogurt","yoğurt"],
  bread:["bread","paine","pâine","хлеб","brot","pain","pan","pane","pao","pão","chleb","хліб","ekmek","brood","bröd"],
  chicken:["chicken","pui","курица","huhn","hahnchen","hähnchen","poulet","pollo","frango","kurczak","курка","tavuk","kip","kyckling"],
  beef:["beef","vita","vită","говядина","rindfleisch","boeuf","bœuf","ternera","manzo","wolowina","wołowina","яловичина","sigir","sığır","rundvlees","nötkött"],
  pork:["pork","porc","свинина","schwein","schweinefleisch","cerdo","maiale","porco","wieprzowina","domuz","varkensvlees","fläsk"],
  fish:["fish","peste","pește","рыба","fisch","poisson","pescado","pesce","peixe","ryba","риба","balik","balık","vis","fisk"],
  rice:["rice","orez","рис","reis","riz","arroz","riso","ryz","ryż","pirinc","pirinç","rijst","ris"],
  pasta:["pasta","paste","паста","макароны","nudeln","pates","pâtes","fideos","massa","makaron","макарони","makarna"],
  potato:["potato","potatoes","cartof","cartofi","картофель","картошка","kartoffel","patata","papa","batata","ziemniak","картопля","patates","aardappel","potatis"],
  tomato:["tomato","tomatoes","rosie","roșie","rosii","roșii","помидор","томат","tomate","pomodoro","pomidor","помідор","domates"],
  onion:["onion","ceapa","ceapă","лук","zwiebel","oignon","cebolla","cipolla","cebola","cebula","цибуля","sogan","soğan","ui","lök"],
  garlic:["garlic","usturoi","чеснок","knoblauch","ail","ajo","aglio","alho","czosnek","часник","sarimsak","sarımsak","knoflook","vitlök"],
  carrot:["carrot","carrots","morcov","morcovi","морковь","karotte","mohre","möhre","carotte","zanahoria","carota","cenoura","marchew","морква","havuc","havuç","wortel","morot"],
  apple:["apple","mar","măr","mere","яблоко","apfel","pomme","manzana","mela","maca","maçã","jablko","jabłko","яблуко","elma","appel","äpple"],
  banana:["banana","banană","банан","banane","platano","plátano"],
  lemon:["lemon","lamaie","lămâie","лимон","zitrone","citron","limon","limón","limone","limao","limão","cytryna","limon"],
  pepper:["pepper","ardei","перец","paprika","poivron","pimiento","peperone","pimentao","pimentão","papryka","перець","biber"],
  mushroom:["mushroom","mushrooms","ciuperca","ciupercă","ciuperci","гриб","грибы","pilz","champignon","seta","hongo","fungo","funghi","cogumelo","grzyb","гриб","mantar"],
  spinach:["spinach","spanac","шпинат","spinat","epinard","épinard","espinaca","spinaci","espinafre","szpinak","ispanak","ıspanak"],
  flour:["flour","faina","făină","мука","mehl","farine","harina","farina","farinha","maka","mąka","борошно","un"],
  sugar:["sugar","zahar","zahăr","сахар","zucker","sucre","azucar","azúcar","zucchero","acucar","açúcar","cukier","цукор","seker","şeker","suiker","socker"],
  shrimp:["shrimp","creveti","creveți","креветка","креветки","garnele","crevette","camaron","camarón","gambero","camarao","camarão","krewetki","karides"],
  salmon:["salmon","somon","лосось","lachs","saumon","salmon","salmón","salmone","salmao","salmão","losos","łosoś","lax"],
  tuna:["tuna","ton","тунец","thunfisch","thon","atun","atún","tonno","atum","tunczyk","tuńczyk","тунець"],
  beans:["beans","fasole","фасоль","bohnen","haricot","frijol","fagioli","feijao","feijão","fasola","квасоля","fasulye","bonen"],
  corn:["corn","porumb","кукуруза","mais","maïs","maiz","maíz","milho","kukurydza","кукурудза","misir","mısır","majs"],
  cucumber:["cucumber","castravete","castraveti","castraveți","огурец","gurke","concombre","pepino","cetriolo","ogorek","ogórek","огірок","salatalik","salatalık","komkommer","gurka"],
  bacon:["bacon","slanina","slănină","бекон","speck","tocino","pancetta","toucinho","boczek"],
  ham:["ham","sunca","șuncă","ветчина","schinken","jambon","jamon","jamón","prosciutto","presunto","szynka","шинка"],
  sausage:["sausage","carnati","cârnați","колбаса","сосиска","wurst","saucisse","salchicha","salsiccia","salsicha","kielbasa","kiełbasa","ковбаса","sucuk","worst","korv"],
  honey:["honey","miere","мёд","мед","honig","miel","miele","mel","miod","miód","bal","honung"],
  cream:["cream","smantana","smântână","сливки","сметана","sahne","creme","crème","crema","nata","panna","smietana","śmietana","вершки","krema","grädde"],
  oil:["oil","ulei","масло растительное","ol","öl","huile","aceite","olio","oleo","óleo","olej","олія","yag","yağ","olie","olja"],
  chocolate:["chocolate","ciocolata","ciocolată","шоколад","schokolade","chocolat","cioccolato","czekolada","cikolata","çikolata","chocolade","choklad"],
};
// Extra synonyms covering the remaining languages (CJK, Arabic, Hindi, Greek,
// Hebrew, Thai, Indonesian, Malay, Vietnamese, Nordic, etc.).
const FOOD_SYNONYMS_EXTRA = {
  milk:["牛奶","牛乳","ミルク","우유","حليب","لبن","दूध","γάλα","חלב","นม","susu","sữa"],
  egg:["鸡蛋","蛋","卵","たまご","계란","달걀","بيض","अंडा","αυγό","αβγό","ביצה","ไข่","telur","trứng"],
  cheese:["奶酪","芝士","チーズ","치즈","جبن","جبنة","पनीर","τυρί","גבינה","ชีส","เนยแข็ง","keju","phô mai","pho mai"],
  butter:["黄油","バター","버터","زبدة","मक्खन","βούτυρο","חמאה","เนย","mentega","bơ","puter","maslac","vaj"],
  yogurt:["酸奶","ヨーグルト","요거트","요구르트","زبادي","दही","γιαούρτι","יוגורט","โยเกิร์ต","sữa chua"],
  bread:["面包","パン","빵","خبز","रोटी","ब्रेड","ψωμί","לחם","ขนมปัง","roti","bánh mì","banh mi","chlieb","kruh"],
  chicken:["鸡肉","鸡","鶏肉","チキン","닭고기","치킨","دجاج","चिकन","मुर्गी","κοτόπουλο","עוף","ไก่","ayam","gà","thịt gà","kuře","kuřecí","kurča","kuracie","csirke","пиле","пилешко","piletina","kylling","kana"],
  beef:["牛肉","ビーフ","소고기","쇠고기","लحم بقري","गोमांस","बीफ","βοδινό","μοσχάρι","בקר","เนื้อวัว","daging sapi","daging lembu","thịt bò","hovězí","hovädzie","marhahús","говеждо","govedina","oksekød","naudanliha"],
  pork:["猪肉","豚肉","ポーク","돼지고기","لحم خنزير","पोर्क","χοιρινό","חזיר","หมู","เนื้อหมู","daging babi","daging khinzir","thịt heo","thịt lợn","vepřové","bravčové","sertéshús","свинско","svinjetina","svinekjøtt","sianliha"],
  fish:["鱼","魚","さかな","생선","물고기","سمك","मछली","ψάρι","דג","ปลา","ikan","cá","ryba","hal","риба","riba","fisk","kala"],
  rice:["米饭","大米","米","ご飯","ライス","쌀","밥","أرز","चावल","ρύζι","אורז","ข้าว","nasi","beras","gạo","cơm","rýže","ryža","rizs","ориз","pirinač","riža","ris","riisi"],
  pasta:["意大利面","パスタ","파스타","معكرونة","पास्ता","ζυμαρικά","μακαρόνια","פסטה","พาสต้า","mì ống","nui","těstoviny","cestoviny","tészta","testenina","tjestenina"],
  potato:["土豆","马铃薯","じゃがいも","ポテト","감자","بطاطس","بطاطا","आलू","πατάτα","תפוח אדמה","มันฝรั่ง","kentang","khoai tây","brambory","zemiaky","krumpli","burgonya","картоф","krompir","krumpir","potet","kartoffel","peruna"],
  tomato:["番茄","西红柿","トマト","토마토","طماطم","بندورة","टमाटर","ντομάτα","עגבנייה","มะเขือเทศ","tomat","cà chua","rajče","rajčata","paradajka","paradicsom","домат","paradajz","rajčica","tomaatti"],
  onion:["洋葱","玉ねぎ","양파","بصل","प्याज","κρεμμύδι","בצל","หัวหอม","bawang","hành","hành tây","cibule","cibuľa","hagyma","лук","crni luk","løk","løg","sipuli"],
  garlic:["大蒜","蒜","にんにく","마늘","ثوم","लहसुन","σκόρδο","שום","กระเทียม","bawang putih","tỏi","česnek","cesnak","fokhagyma","чесън","beli luk","češnjak","hvitløk","hvidløg","valkosipuli"],
  carrot:["胡萝卜","にんじん","당근","جزر","गाजर","καρότο","גזר","แครอท","wortel","lobak merah","cà rốt","mrkev","mrkva","sárgarépa","морков","šargarepa","gulrot","gulerod","porkkana"],
  apple:["苹果","りんご","リンゴ","사과","تفاح","सेब","μήλο","תפוח","แอปเปิล","apel","epal","táo","jablko","alma","ябълка","jabuka","eple","æble","omena"],
  banana:["香蕉","バナナ","바나나","موز","केला","μπανάνα","בננה","กล้วย","pisang","chuối","banán","banan","banaani"],
  lemon:["柠檬","レモン","레몬","ليمون","नींबू","λεμόνι","לימון","มะนาว","jeruk nipis","chanh","citron","citrón","citrom","лимон","limun","sitron","sitruuna"],
  pepper:["辣椒","胡椒","ペッパー","ピーマン","후추","고추","فلفل","मिर्च","काली मिर्च","πιπέρι","פלפל","พริก","พริกไทย","lada","merica","cabai","tiêu","ớt","pepř","korenie","bors","пипер","papar","peber","pippuri"],
  mushroom:["蘑菇","きのこ","マッシュルーム","버섯","فطر","मशरूम","μανιτάρι","פטרייה","เห็ด","jamur","cendawan","nấm","houba","žampion","huba","šampiňón","gomba","гъба","pečurka","gljiva","sopp","svamp","champignon","sieni"],
  sugar:["糖","砂糖","シュガー","설탕","سكر","चीनी","शक्कर","ζάχαρη","סוכר","น้ำตาล","gula","đường","cukr","cukor","захар","šećer","sukker","sokeri"],
  flour:["面粉","小麦粉","밀가루","طحين","دقيق","आटा","मैदा","αλεύρι","קמח","แป้ง","tepung","bột mì","mouka","múka","liszt","брашно","brašno","mel","jauho"],
  oil:["油","食用油","オイル","기름","오일","زيت","तेल","λάδι","שמן","น้ำมัน","minyak","dầu","dầu ăn","olej","olaj","олио","ulje","olje","olie","öljy"],
  salt:["salt","sare","соль","salz","sel","sal","sale","sól","sůl","soľ","só","сол","suola","zout","tuz","盐","塩","ソルト","소금","ملح","नमक","αλάτι","מלח","เกลือ","garam","muối","сіль"],
  water:["water","apă","apa","вода","wasser","eau","agua","acqua","água","woda","su","水","물","ماء","مياه","पानी","νερό","מים","น้ำ","air","nước","voda","víz","vesi","vatten","vand","vann"],
};
// Further common fridge ingredients — more fruit, veg, proteins and drinks.
// Same english-key → cross-language-synonyms shape; merged into FOOD below.
const FOOD_SYNONYMS_MORE = {
  orange:["orange","oranges","portocala","portocală","апельсин","apfelsine","naranja","arancia","laranja","pomarancza","pomarańcza","portakal","sinaasappel","apelsin","橙","橘子","オレンジ","오렌지","برتقال","संतरा","πορτοκάλι","תפוז","ส้ม","jeruk","cam"],
  grape:["grape","grapes","strugure","struguri","виноград","traube","trauben","raisin","uva","uvas","winogrona","üzüm","druif","vindruvor","葡萄","ぶどう","ブドウ","포도","عنب","अंगूर","σταφύλι","ענב","องุ่น","anggur","nho"],
  strawberry:["strawberry","strawberries","capsuna","căpșună","căpșuni","клубника","erdbeere","fraise","fresa","fragola","morango","truskawka","полуниця","çilek","aardbei","jordgubbe","草莓","いちご","イチゴ","딸기","فراولة","स्ट्रॉबेरी","φράουλα","תות","สตรอว์เบอร์รี","stroberi","dâu tây"],
  blueberry:["blueberry","blueberries","afina","afină","черника","голубика","heidelbeere","blaubeere","myrtille","arandano","arándano","mirtillo","mirtilo","borowka","borówka","чорниця","bosbes","blåbär","蓝莓","ブルーベリー","블루베리","توت أزرق","ब्लूबेरी","μύρτιλο","אוכמנית","บลูเบอร์รี","việt quất"],
  watermelon:["watermelon","pepene","pepene roșu","арбуз","wassermelone","pastèque","sandia","sandía","anguria","melancia","arbuz","кавун","karpuz","watermeloen","vattenmelon","西瓜","スイカ","수박","بطيخ","तरबूज","καρπούζι","אבטיח","แตงโม","semangka","dưa hấu"],
  pineapple:["pineapple","ananas","ананас","piña","abacaxi","ananász","菠萝","鳳梨","パイナップル","파인애플","أناناس","अनानास","ανανάς","אננס","สับปะรด","nanas","dứa"],
  peach:["peach","peaches","piersica","piersică","персик","pfirsich","pêche","durazno","melocoton","melocotón","pesca","pessego","pêssego","brzoskwinia","şeftali","perzik","persika","桃子","もも","モモ","복숭아","خوخ","आड़ू","ροδάκινο","אפרסק","ลูกพีช","đào"],
  pear:["pear","pears","para","pară","pere","груша","birne","poire","pera","peras","gruszka","armut","peer","päron","梨","洋梨","なし","ナシ","배","كمثرى","नाशपाती","αχλάδι","אגס","สาลี่","lê"],
  cherry:["cherry","cherries","cireasa","cireașă","cireșe","вишня","черешня","kirsche","cerise","cereza","ciliegia","cereja","wiśnia","kiraz","körsbär","樱桃","さくらんぼ","チェリー","체리","كرز","चेरी","κεράσι","דובדבן","เชอร์รี","ceri","anh đào"],
  avocado:["avocado","авокадо","aguacate","abacate","awokado","avokado","avocat","牛油果","鳄梨","アボカド","아보카도","أفوكادو","एवोकाडो","αβοκάντο","אבוקדו","อะโวคาโด","alpukat","quả bơ"],
  mango:["mango","mangо","манго","mangue","mangó","芒果","マンゴー","망고","مانجو","आम","μάνγκο","מנגו","มะม่วง","mangga","xoài"],
  kiwi:["kiwi","kiwifruit","киви","猕猴桃","奇異果","キウイ","키위","كيوي","कीवी","ακτινίδιο","קיווי","กีวี"],
  coconut:["coconut","nuca de cocos","nucă de cocos","кокос","kokosnuss","noix de coco","coco","cocco","kokos","hindistan cevizi","kokosnoot","椰子","ココナッツ","코코넛","جوز الهند","नारियल","καρύδα","קוקוס","มะพร้าว","kelapa","dừa"],
  lettuce:["lettuce","salata verde","salată verde","латук","kopfsalat","laitue","lechuga","lattuga","alface","salata zielona","marul","sla","sallad","生菜","レタス","상추","خس","सलाद पत्ता","μαρούλι","חסה","ผักกาดหอม","selada","xà lách"],
  broccoli:["broccoli","brocoli","brokkoli","brócoli","brócolis","brokul","brokuł","броколі","brokoli","西兰花","西蘭花","ブロッコリー","브로콜리","بروكلي","ब्रोकली","μπρόκολο","ברוקולי","บรอกโคลี","bông cải xanh"],
  cabbage:["cabbage","varza","varză","капуста","kohl","chou","repollo","cavolo","repolho","couve","kapusta","lahana","kool","kål","卷心菜","キャベツ","양배추","ملفوف","पत्ता गोभी","λάχανο","כרוב","กะหล่ำปลี","kubis","bắp cải"],
  eggplant:["eggplant","aubergine","vinete","vânătă","баклажан","berenjena","melanzana","beringela","oberżyna","patlıcan","茄子","ナス","가지","باذنجان","बैंगन","μελιτζάνα","חציל","มะเขือ","terong","cà tím"],
  zucchini:["zucchini","courgette","dovlecel","кабачок","calabacin","calabacín","zucchina","abobrinha","cukinia","kabak","西葫芦","ズッキーニ","애호박","كوسة","तोरी","κολοκυθάκι","קישוא","บวบ","bí ngòi"],
  peas:["peas","mazare","mazăre","горох","erbse","erbsen","pois","guisante","pisello","piselli","ervilha","groszek","bezelye","erwt","ärtor","豌豆","エンドウ","완두콩","بازلاء","मटर","αρακάς","אפונה","ถั่วลันเตา","đậu Hà Lan"],
  ginger:["ginger","ghimbir","имбирь","ingwer","gingembre","jengibre","zenzero","gengibre","imbir","імбир","zencefil","gember","ingefära","姜","薑","しょうが","생강","زنجبيل","अदरक","τζίντζερ","ג'ינג'ר","ขิง","jahe","gừng"],
  chili:["chili","chilli","ardei iute","peperoncino","papryczka","чилі","辣椒","唐辛子","고추","فلفل حار","मिर्च","τσίλι","צ׳ילי","cabai","ớt"],
  peanut:["peanut","peanuts","arahide","арахис","erdnuss","cacahuete","cacahuète","arachide","amendoim","orzeszki","pinda","jordnöt","花生","ピーナッツ","땅콩","فول سوداني","मूंगफली","φιστίκι","בוטן","ถั่วลิสง","kacang tanah","đậu phộng"],
  olive:["olive","olives","masline","măsline","оливки","aceituna","oliva","azeitona","oliwki","zeytin","olijf","oliv","橄榄","オリーブ","올리브","زيتون","जैतून","ελιά","זית","มะกอก","zaitun","ô liu"],
  turkey:["turkey","curcan","индейка","pute","truthahn","dinde","pavo","tacchino","peru","indyk","індичка","hindi","kalkoen","kalkon","火鸡","七面鳥","칠면조","ديك رومي","टर्की","γαλοπούλα","תרנגול הודו","ไก่งวง","kalkun","gà tây"],
  coffee:["coffee","cafea","кофе","kaffee","café","caffè","kawa","кава","kahve","koffie","kaffe","咖啡","コーヒー","커피","قهوة","कॉफ़ी","καφές","קפה","กาแฟ","kopi","cà phê"],
  tea:["tea","ceai","чай","tee","thé","tè","herbata","çay","thee","茶","お茶","차","شاي","चाय","τσάι","תה","ชา","teh","trà"],
  juice:["juice","suc","сок","saft","jus","zumo","jugo","succo","suco","сік","meyve suyu","sap","果汁","ジュース","주스","عصير","जूस","χυμός","מיץ","น้ำผลไม้","nước ép"],
  wine:["wine","vin","вино","wein","vino","vinho","wino","şarap","wijn","葡萄酒","红酒","ワイン","와인","نبيذ","वाइन","κρασί","יין","ไวน์","rượu vang"],
  beer:["beer","bere","пиво","bier","bière","cerveza","birra","cerveja","piwo","bira","啤酒","ビール","맥주","بيرة","बियर","μπύρα","בירה","เบียร์","bia"],
};

const FOOD = {};
for (const en in FOOD_SYNONYMS) {
  FOOD[en] = en;
  for (const s of FOOD_SYNONYMS[en]) FOOD[s.toLowerCase()] = en;
}
for (const en in FOOD_SYNONYMS_EXTRA) {
  if (!FOOD[en]) FOOD[en] = en;
  for (const s of FOOD_SYNONYMS_EXTRA[en]) FOOD[s.toLowerCase()] = en;
}
for (const en in FOOD_SYNONYMS_MORE) {
  if (!FOOD[en]) FOOD[en] = en;
  for (const s of FOOD_SYNONYMS_MORE[en]) FOOD[s.toLowerCase()] = en;
}
// ─── NUTRITION TABLE ─────────────────────────────────────────────
// Rough macros per 100 g of each canonical ingredient the food dictionary
// recognises: [kcal, protein g, fat g, carbs g]. Sources: typical USDA-style
// reference values, rounded — this feeds an ESTIMATE, not a lab report.
const MACROS = {
  milk:[60,3.2,3.3,4.8], egg:[155,13,11,1.1], cheese:[350,25,27,2], butter:[717,0.9,81,0.1],
  yogurt:[60,4,3,5], bread:[265,9,3.2,49], chicken:[165,31,3.6,0], beef:[250,26,15,0],
  pork:[270,27,18,0], fish:[120,22,3,0], salmon:[208,20,13,0], tuna:[130,28,1,0],
  shrimp:[99,24,0.3,0.2], rice:[130,2.7,0.3,28], pasta:[158,6,0.9,31], potato:[77,2,0.1,17],
  tomato:[18,0.9,0.2,3.9], onion:[40,1.1,0.1,9.3], garlic:[149,6.4,0.5,33], carrot:[41,0.9,0.2,9.6],
  apple:[52,0.3,0.2,14], banana:[89,1.1,0.3,23], lemon:[29,1.1,0.3,9], orange:[47,0.9,0.1,12],
  pepper:[31,1,0.3,6], mushroom:[22,3.1,0.3,3.3], sugar:[387,0,0,100], flour:[364,10,1,76],
  oil:[884,0,100,0], salt:[0,0,0,0], water:[0,0,0,0], beans:[127,8.7,0.5,23],
  corn:[86,3.3,1.4,19], cucumber:[15,0.7,0.1,3.6], bacon:[541,37,42,1.4], ham:[145,21,6,1.5],
  sausage:[300,12,27,2], honey:[304,0.3,0,82], cream:[200,2.8,19,4], chocolate:[546,4.9,31,61],
  peas:[81,5.4,0.4,14], broccoli:[34,2.8,0.4,7], cabbage:[25,1.3,0.1,6], lettuce:[15,1.4,0.1,2.9],
  eggplant:[25,1,0.2,6], zucchini:[17,1.2,0.3,3.1], avocado:[160,2,15,9], mango:[60,0.8,0.4,15],
  grape:[69,0.7,0.2,18], strawberry:[32,0.7,0.3,7.7], watermelon:[30,0.6,0.2,7.6], pineapple:[50,0.5,0.1,13],
  peach:[39,0.9,0.3,10], pear:[57,0.4,0.1,15], cherry:[63,1.1,0.2,16], coconut:[354,3.3,33,15],
  ginger:[80,1.8,0.8,18], chili:[40,1.9,0.4,9], peanut:[567,26,49,16], olive:[115,0.8,11,6],
  turkey:[189,29,7,0], coffee:[1,0.1,0,0], tea:[1,0,0,0.3], juice:[45,0.5,0.1,10],
  wine:[83,0.1,0,2.6], beer:[43,0.5,0,3.6], kiwi:[61,1.1,0.5,15], blueberry:[57,0.7,0.3,14],
};

// Rough БЖУ for a recipe: match each ingredient through the multilingual
// dictionary to the macro table and average the per-100g values — "what's in
// a typical 100 g of this dish". Free-form recipe measures ("a splash",
// "2 tins") can't be parsed reliably offline, so this is deliberately an
// average, upgraded to a real per-serving figure by the AI proxy when set.
function estimateRecipeNutrition(r) {
  const ings = (r.ingredients && r.ingredients.length)
    ? r.ingredients.map(i => (i.name || i).toString())
    : [...(r.used || []), ...(r.missing || [])];
  let n = 0, kcal = 0, p = 0, f = 0, c = 0;
  for (const name of ings) {
    for (const key of productToIngredients(name)) {
      const m = MACROS[key];
      if (m) { kcal += m[0]; p += m[1]; f += m[2]; c += m[3]; n++; break; }
    }
  }
  if (!n) return null;
  return { kcal: Math.round(kcal / n), protein: Math.round(p / n * 10) / 10,
           fat: Math.round(f / n * 10) / 10, carbs: Math.round(c / n * 10) / 10 };
}

// Translate a product name to its English ingredient(s). Falls back to the
// cleaned name when nothing is recognised (so plain English still works).
// Liquids/mediums a product is preserved IN — not separate fridge items.
const PRESERVING_MEDIUM = new Set(['oil','water','salt','sugar']);
function productToIngredients(name) {
  const cleaned = cleanName(name);
  if (!cleaned) return [];
  if (FOOD[cleaned]) return [FOOD[cleaned]];
  const out = [];
  for (const w of cleaned.split(/\s+/)) {
    // Match the word, or its English singular ("peppers" → "pepper").
    const e = FOOD[w] || (w.length > 3 && w.endsWith('s') ? FOOD[w.slice(0, -1)] : null);
    if (e && !out.includes(e)) out.push(e);
  }
  // A compound product like "peppers in oil" or "tuna in water" is ONE item:
  // the liquid it's stored in shouldn't be counted as a separate ingredient.
  // Drop the medium only when a real ingredient remains.
  if (out.length > 1) {
    const main = out.filter(e => !PRESERVING_MEDIUM.has(e));
    if (main.length) return main;
  }
  return out.length ? out : [cleaned];
}
// Fridge contents normalised to English ingredients, for matching against
// (English) recipe ingredient lists.
function fridgeIngredientsEN() {
  return [...new Set(state.products.flatMap(p => productToIngredients(p.name)))].filter(Boolean);
}


// ─── SHELF-LIFE ESTIMATOR (offline, no key) ─────────────────────
// Typical edible life in days for a fresh item stored normally, keyed by the
// canonical English ingredient that productToIngredients() already derives —
// so it works whatever language the product was added in.
const SHELF_LIFE = {
  milk:7, egg:21, cheese:14, butter:30, yogurt:14, bread:5, cream:7,
  chicken:2, beef:3, pork:3, fish:2, salmon:2, tuna:2, shrimp:2,
  bacon:7, ham:5, sausage:5,
  rice:730, pasta:730, flour:365, sugar:1095, oil:365, honey:1825,
  salt:3650, chocolate:365, water:365,
  potato:30, onion:30, garlic:60, carrot:21, apple:30, lemon:21,
  tomato:7, pepper:10, cucumber:7, corn:5, beans:5, banana:5,
  mushroom:5, spinach:4,
};
// Keyword categories (across languages) used only when no ingredient matched.
// Most-specific first; first hit wins.
const SHELF_CATEGORIES = [
  { days:730, words:["canned","can ","conserv","tinned","консерв","konserve","konzerv","puszka","barattolo","缶","罐","통조림","معلب","หม้อ","kaleng"] },
  { days:180, words:["frozen","congel","заморож","tiefkühl","surgel","mrożon","mrazen","fagyas","dondurul","gefror","冷凍","냉동","مجمد","แช่แข็ง","beku","đông lạnh"] },
  { days:365, words:["dried","sušen","сушен","сухой","kuru","suszone","getrocknet","séché","seco","干","건조","مجفف","แห้ง","kering","khô"] },
  { days:3,   words:["fresh","proaspăt","свеж","frisch","frais","fresco","taze","свіж","新鲜","신선","طازج","สด","segar","tươi"] },
];
const DEFAULT_SHELF = 7;

// Best-guess days until expiry for a product name (offline, instant).
function estimateShelfDays(name) {
  let best = null;
  for (const ing of productToIngredients(name)) {
    if (SHELF_LIFE[ing] != null) best = best == null ? SHELF_LIFE[ing] : Math.min(best, SHELF_LIFE[ing]);
  }
  if (best != null) return best;
  const low = ' ' + cleanName(name) + ' ';
  for (const cat of SHELF_CATEGORIES) if (cat.words.some(w => low.includes(w))) return cat.days;
  return DEFAULT_SHELF;
}
function daysToDateInput(days) {
  // Build a LOCAL YYYY-MM-DD (toISOString would use UTC and can land a day off
  // in non-UTC timezones, which then mis-classifies freshness).
  const d = new Date(Date.now() + Math.max(0, days) * 86400000);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// ─── AI ESTIMATOR (online, via your proxy) ──────────────────────
function aiProxyUrl() {
  try {
    const v = localStorage.getItem('kulpio-ai-url');
    if (v) return v;
  } catch {}
  // All-in-one Cloudflare deploy (root wrangler.toml): the app is served by
  // the same Worker that hosts the API, so it's reachable on our own origin —
  // AI works out of the box. Real users never configure anything; the
  // kulpio-ai-url localStorage key above stays as a console-only dev override
  // (the old Settings → AI setup row was removed in v128).
  // The all-in-one Worker serves BOTH the app and /api on the same origin, so
  // any http(s) origin can reach it — not just *.workers.dev (a custom domain
  // mapped to the Worker works too). Only file:// (local dev) has no API.
  return location.protocol.startsWith('http') ? location.origin + '/api' : '';
}

// ── PWA INSTALL ── the browser decides installability; we only hold on to
// its offer. The Settings row appears when there is a live offer and the app
// isn't already running as an installed app.
let _installEvt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _installEvt = e;
  syncInstallRow();
});
window.addEventListener('appinstalled', () => {
  _installEvt = null;
  syncInstallRow();
  pearReact('hop', null, '📲', 900);
});
function syncInstallRow() {
  const row = document.getElementById('installRow');
  if (!row) return;
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  row.style.display = (_installEvt && !standalone) ? '' : 'none';
}
function installApp() {
  if (!_installEvt) return;
  const evt = _installEvt;
  toggleMenu();
  evt.prompt();
  // Accepted or dismissed, the offer is spent — Chrome won't honor it twice.
  evt.userChoice.finally(() => { _installEvt = null; syncInstallRow(); });
}

// ── REFRESH ── an installed PWA has no reload button, and the service worker
// happily serves last week's build. One tap: nudge the SW, drop every cache,
// reload. localStorage (the user's fridge, history, settings) is untouched.
async function refreshApp() {
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map(r => r.update()));
  } catch {}
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
  } catch {}
  location.reload();
}
function postJSON(url, body, ms = 12000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body), signal: ctrl.signal })
    .then(r => r.ok ? r.json() : null)
    .catch(() => null)
    .finally(() => clearTimeout(timer));
}
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => { const s = String(r.result); const i = s.indexOf(','); resolve({ data: i >= 0 ? s.slice(i + 1) : s, type: file.type || 'image/jpeg' }); };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
// Prepare a picked photo for the vision AI: draw it through a canvas to bound
// its size and re-encode as JPEG. Full-resolution phone shots — and iPhone
// HEIC in particular — otherwise trip Workers AI's "image malformed" (3030),
// which is what made receipt/label scanning fail on real cameras. Falls back
// to the raw bytes if the browser can't draw the file. Returns {data,type}.
function fileToAiImage(file, maxDim = 1600, quality = 0.82) {
  return new Promise((resolve) => {
    const raw = () => fileToBase64(file).then(resolve).catch(() => resolve(null));
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        let w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
        if (!w || !h) { URL.revokeObjectURL(url); return raw(); }
        const scale = Math.min(1, maxDim / Math.max(w, h));
        w = Math.round(w * scale); h = Math.round(h * scale);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        const durl = c.toDataURL('image/jpeg', quality);
        URL.revokeObjectURL(url);
        const i = durl.indexOf(',');
        if (i < 0 || durl.length < 40) return raw();   // canvas gave nothing usable
        resolve({ data: durl.slice(i + 1), type: 'image/jpeg' });
      } catch (_) { URL.revokeObjectURL(url); raw(); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); raw(); };
    img.src = url;
  });
}
// The date field stays EMPTY while adding — no visible "estimated date"
// prefill. The estimate is applied silently at save time instead: the AI
// answer if one arrived for this name, otherwise the offline table. Typing
// only queues the (debounced) AI request in the background.
let _aiDays = null;   // { name, days } — latest AI shelf-life answer for the modal
let _aiSeq = 0;
const _aiDaysCache = {};
const _aiDaysPending = {};
const AI_DAYS_CACHE_TTL = 30 * 86400000;
try {
  const saved = JSON.parse(localStorage.getItem('kulpio-ai-days') || '{}');
  Object.keys(saved).forEach(k => {
    if (saved[k] && Date.now() - saved[k].at < AI_DAYS_CACHE_TTL) _aiDaysCache[k] = saved[k];
  });
} catch {}
function aiDaysKey(name) { return String(name || '').trim().replace(/\s+/g, ' ').toLowerCase(); }
function saveAiDaysCache() {
  try {
    const keys = Object.keys(_aiDaysCache).sort((a, b) => _aiDaysCache[b].at - _aiDaysCache[a].at).slice(0, 100);
    const saved = {};
    keys.forEach(k => { saved[k] = _aiDaysCache[k]; });
    localStorage.setItem('kulpio-ai-days', JSON.stringify(saved));
  } catch {}
}
async function queueAiEstimate(name) {
  name = String(name || '').trim().replace(/\s+/g, ' ');
  const seq = ++_aiSeq;
  _aiDays = null;
  const url = aiProxyUrl();
  if (!url || !navigator.onLine || !name) return;
  const key = aiDaysKey(name);
  const cached = _aiDaysCache[key];
  if (cached && Date.now() - cached.at < AI_DAYS_CACHE_TTL) {
    _aiDays = { name, days: cached.days };
    return;
  }
  const pending = _aiDaysPending[key] || (_aiDaysPending[key] = postJSON(url, { name }).finally(() => {
    delete _aiDaysPending[key];
  }));
  const data = await pending;
  if (seq !== _aiSeq) return;                 // a newer name superseded this call
  if (data && typeof data.days === 'number' && data.days >= 0) {
    _aiDaysCache[key] = { days: data.days, at: Date.now() };
    saveAiDaysCache();
    _aiDays = { name, days: data.days };
  }
}
let _nameTimer = null, _brandTimer = null;
function onNameInput(name) {
  name = String(name || '').trim();
  const nm = document.getElementById('pNameMsg'); if (nm) { nm.style.display = 'none'; nm.textContent = ''; }
  if (!name) { const b = document.getElementById('brandSugg'); if (b) b.innerHTML = ''; return; }
  clearTimeout(_nameTimer); clearTimeout(_brandTimer);
  // Brand chips should appear as soon as the name is typed; the silent
  // shelf-life estimate can afford a longer pause.
  _brandTimer = setTimeout(() => suggestBrands(name), 350);
  _nameTimer = setTimeout(() => queueAiEstimate(name), 700);
  updatePriceHint(name);   // "usually ≈ X at Store" from the price book
  updateShelfHint(name);   // "usually keeps ≈ N days" as you type
}
// Changing the store re-asks with the new market ("butter at Linella").
function onStoreInput() {
  clearTimeout(_brandTimer);
  _brandTimer = setTimeout(() => suggestBrands(document.getElementById('pName').value), 350);
}

// ── BRAND SUGGESTIONS ────────────────────────────────────────────
// While naming a product, offer brand chips from three sources: brands the
// user already bought at that store (instant — literally its stock), brands
// the AI proxy says the chain carries (e.g. butter at Linella → the Moldovan
// dairies; regional coverage Open Food Facts doesn't have), and OFF matches,
// which bring the pack photos. Store-stocked brands come first and wear 🏪.
// Tapping a chip fills the brand AND (when known) the exact pack's photo.
const _brandCache = {};
// The store the user is shopping at: the typed one, else where most of the
// fridge came from — so chips fit the market before the field is filled in.
function brandStoreGuess() {
  const typed = (document.getElementById('pStore').value || '').trim();
  if (typed) return typed;
  const cnt = {};
  for (const p of state.products) {
    const s = (p.store || '').trim();
    if (s) cnt[s] = (cnt[s] || 0) + 1;
  }
  let best = '', n = 0;
  for (const s in cnt) if (cnt[s] > n) { n = cnt[s]; best = s; }
  return best;
}
async function suggestBrands(name) {
  const box = document.getElementById('brandSugg');
  if (!box || !document.getElementById('productModal').classList.contains('show')) return;
  const q = String(name || '').trim().toLowerCase();
  if (q.length < 2) { box.innerHTML = ''; return; }
  const store = brandStoreGuess();
  const ck = q + '@' + store.toLowerCase();

  const inStore = [], generic = [], seen = new Set();
  const add = (brand, img, isStore) => {
    brand = String(brand || '').replace(/^[-•\d.)\s]+/, '').trim();
    const k = brand.toLowerCase();
    if (!k || brand.length > 40) return;
    if (seen.has(k)) {
      // A brand the AI confirms is in this store moves up front.
      if (isStore) {
        const i = generic.findIndex(x => x.brand.toLowerCase() === k);
        if (i >= 0) inStore.push(Object.assign(generic.splice(i, 1)[0], { isStore: true }));
      }
      return;
    }
    seen.add(k);
    (isStore ? inStore : generic).push({ brand, img: img || '', isStore: !!isStore });
  };
  // Typing (or a store change) may have moved on while we fetched — only
  // ever paint an answer that still matches the fields.
  const stale = () => !document.getElementById('productModal').classList.contains('show')
    || document.getElementById('pName').value.trim().toLowerCase() !== q
    || brandStoreGuess().toLowerCase() !== store.toLowerCase();
  const paint = () => {
    if (stale()) return;
    box.innerHTML = inStore.concat(generic).slice(0, 6).map(it =>
      `<button type="button" class="fchip"${it.isStore && store ? ` title="${esc(store)}"` : ''} onclick="applyBrandSugg(${jsArg(it.brand)},${jsArg(it.img)})">${it.isStore ? '🏪' : '🏷'} ${esc(it.brand)}</button>`).join('');
  };

  const cached = _brandCache[ck];
  if (cached) { cached.forEach(it => add(it.brand, it.img, it.isStore)); paint(); return; }
  if (!navigator.onLine) return;

  // 1. Instant: own purchases of this food at this store.
  const qIngs = productToIngredients(q);
  for (const p of state.products) {
    if (!p.brand) continue;
    if (store && !(p.store || '').trim().toLowerCase().includes(store.toLowerCase())) continue;
    const pn = (p.name || '').trim().toLowerCase();
    if (!pn.includes(q) && !productToIngredients(p.name).some(i => qIngs.includes(i))) continue;
    add(p.brand, '', true);
  }
  if (inStore.length) paint();

  // 2. The AI proxy knows regional assortments (only useful with a store).
  let gotAnswer = false;
  const proxy = aiProxyUrl();
  const aiP = (proxy && store)
    ? postJSON(proxy, { brands: { name: q, store } }, 12000).then(r => {
        if (r && Array.isArray(r.brands)) gotAnswer = true;
        (Array.isArray(r && r.brands) ? r.brands : []).slice(0, 5).forEach(b => add(b, '', true));
      })
    : Promise.resolve();

  // 3. Open Food Facts — brings the pack photos.
  const offP = (async () => {
    const fields = '&search_simple=1&action=process&json=1&page_size=10&fields=brands,image_front_small_url,stores';
    let data = await fetchJSON('https://world.openfoodfacts.org/cgi/search.pl?search_terms=' + encodeURIComponent(q) + fields, 9000);
    let prods = ((data && data.products) || []).filter(p => p.brands);
    // The database is indexed in English — translate through the dictionary
    // when the local-language name finds nothing ("масло" → "butter").
    const en = productToIngredients(name)[0] || '';
    if (!prods.length && en && en !== q) {
      data = await fetchJSON('https://world.openfoodfacts.org/cgi/search.pl?search_terms=' + encodeURIComponent(en) + fields, 9000);
      prods = ((data && data.products) || []).filter(p => p.brands);
    }
    if (data) gotAnswer = true;
    for (const p of prods) {
      const brand = String(p.brands).split(',')[0].trim();
      add(brand, p.image_front_small_url || '', !!store && (p.stores || '').toLowerCase().includes(store.toLowerCase()));
    }
  })();

  await aiP; paint();
  await offP; paint();
  // Cache only real answers — a network failure should retry next pause.
  if (gotAnswer) _brandCache[ck] = inStore.concat(generic).slice(0, 6);
}
function applyBrandSugg(brand, img) {
  document.getElementById('pBrand').value = brand;
  const modal = document.getElementById('productModal');
  if (img) { modal.dataset.img = img; updatePhotoPreview(); }   // the exact pack
  document.getElementById('brandSugg').innerHTML = '';
}

// The date input is only shown where a real date exists (editing, or a
// printed best-before read off a label) — adding a product asks nothing:
// the expiry is estimated silently on save.
function setDateVisible(v) {
  const el = document.getElementById('pDate');
  if (el) el.style.display = v ? '' : 'none';
}
// The expiry for a product saved without an explicit date: AI estimate when
// one is in hand for this exact name, offline shelf-life table otherwise.
function estimatedExpiry(name) {
  const days = (_aiDays && _aiDays.name === name) ? _aiDays.days : estimateShelfDays(name);
  return daysToDateInput(days);
}
// Live "usually keeps ≈ N days" line under the product name — makes the silent
// expiry estimate visible while typing. Hidden the moment a real best-before
// date is entered (a printed/scanned date always beats an estimate).
function updateShelfHint(name) {
  const el = document.getElementById('shelfHint');
  if (!el) return;
  name = String(name || '').trim();
  const dateEl = document.getElementById('pDate');
  const hasDate = dateEl && (dateEl.value || dateEl.dataset.userset);
  if (!name || hasDate) { el.style.display = 'none'; el.textContent = ''; return; }
  el.innerHTML = `🗓️ ≈ <b>${esc(freshnessBadge(estimateShelfDays(name)))}</b>`;
  el.style.display = '';
}

// ─── QUICK-ADD SHELF ─────────────────────────────────────────────
// The items you buy most (learned from what has passed through your fridge)
// that you don't currently have — one tap re-adds them with a smart expiry.
function frequentAddItems(limit) {
  const inFridge = new Set(state.products.map(p => (p.name || '').trim().toLowerCase()));
  const counts = {};
  for (const e of state.history || []) {
    const k = (e.name || '').trim().toLowerCase();
    if (!k || inFridge.has(k)) continue;
    (counts[k] = counts[k] || { name: e.name, n: 0 }).n++;
  }
  return Object.values(counts).filter(x => x.n >= 2).sort((a, b) => b.n - a.n).slice(0, limit || 6);
}
function quickAddHtml() {
  const items = frequentAddItems(6);
  if (!items.length) return '';
  return `<div class="qadd">
    <div class="qadd-t">⚡ ${esc(l('freqSuggest'))}</div>
    <div class="qadd-row">${items.map(x =>
      `<button type="button" class="qadd-chip" onclick="quickAddByName(${jsArg(x.name)})">${foodEmoji(x.name)} ${esc(x.name)}<i>+</i></button>`).join('')}</div>
  </div>`;
}
// Add a product from just its name — the same smart fill as a barcode scan
// (estimated expiry, freshness badge, background pack-photo lookup), minus the
// form. Merges into an existing card of the same name rather than duplicating.
function quickAddByName(name) {
  name = String(name || '').trim();
  if (!name || isBadName(name)) return;
  try { navigator.vibrate && navigator.vibrate(8); } catch {}   // a light tap confirms
  const snap = snapshotState();   // so a mis-tapped chip is one tap to undo
  const exp = estimatedExpiry(name);
  const days = daysUntil(exp) ?? 7;
  const product = {
    name, brand: '', store: '', badge: freshnessBadge(days),
    cls: days <= 1 ? 'br' : days <= 5 ? 'ba' : 'bg',
    dot: days <= 1 ? 'dr' : days <= 5 ? 'da' : 'dg',
    price: 0, exp, qty: 1, loc: 'fridge'
  };
  mergeOrPush(product);
  recipeCacheKey = '';
  saveState();
  renderContent();
  fetchProductImage(name, '');   // background pack photo, same as a manual add
  pearReact('hop', 'pearAdd', '😋', 700);
  maybeWasteWarn(name);
  showUndoToast('✓ ' + name, snap);
}

// ─── DATA-SAFETY NUDGE ───────────────────────────────────────────
// A returning user with a real fridge who isn't signed in is one browser-clear
// away from losing everything. Remind them — gently, dismissible, and never
// while signed in (the cloud already holds it). Re-shows at most every 14 days.
function shouldShowBackupNudge() {
  if (typeof authUser !== 'undefined' && authUser) return false;   // signed in → already synced
  const worth = (state.usedCount || 0) + (state.products || []).length;
  if (worth < 8) return false;   // too little history for loss to sting yet
  let last = 0;
  try { last = parseInt(localStorage.getItem('kulpio-backup-nudge')) || 0; } catch {}
  return Date.now() - last > 14 * 86400000;
}
function backupNudgeHtml() {
  if (demoActive()) return '';   // presentation mode should stay focused on the product
  if (!shouldShowBackupNudge()) return '';
  return `<div class="bkp-nudge">
    <button class="bkp-x" onclick="dismissBackupNudge()" aria-label="${esc(l('backupLater'))}" title="${esc(l('backupLater'))}">×</button>
    <div class="bkp-msg">🛟 <span>${esc(l('backupWarn'))}</span></div>
    <div class="bkp-row">
      <button class="bkp-btn primary" onclick="openAuth('login')">🔒 ${esc(l('authSignIn'))}</button>
      <button class="bkp-btn" onclick="exportData();dismissBackupNudge()">⤓ ${esc(l('exportData'))}</button>
    </div>
  </div>`;
}
function dismissBackupNudge() {
  try { localStorage.setItem('kulpio-backup-nudge', String(Date.now())); } catch {}
  renderContent();
}
// A fridge search that finds nothing is a dead end — offer to add what was
// typed, opening the add form with the name already filled.
function addSearchedProduct(q) {
  addProductManually();
  const n = document.getElementById('pName');
  if (n) { n.value = q; onNameInput(q); }
}
// Photo path: send an image of the item/label to Claude, get back a product
// name and (if printed) the best-before date.
// Read ONLY the printed best-before date off a pack, from inside the product
// modal — the accurate, honest path: a real date beats any estimate. Keeps
// the name/brand the user already entered; just fills the date.
async function scanDateFromPack(input) {
  const file = input.files && input.files[0];
  input.value = '';
  if (!file) return;
  const btn = document.getElementById('pScanDate');
  const msg = document.getElementById('pScanDateMsg');
  const url = aiProxyUrl();
  // No endpoint OR no connection → say so immediately instead of hanging ~45s.
  if (!url || !navigator.onLine) { if (msg) { msg.className = 'scan-date-msg'; msg.textContent = l('aiUnavailable'); } return; }
  btn.classList.add('busy');
  if (msg) { msg.className = 'scan-date-msg'; msg.textContent = l('readingLabel'); }
  let data = null;
  try {
    const img = await fileToAiImage(file, 1600);
    if (img) data = await postJSON(url, { image: img.data, mediaType: img.type, lang: currentLang }, 45000);
  } catch {}
  btn.classList.remove('busy');
  const dateEl = document.getElementById('pDate');
  if (data && data.bestBefore && /^\d{4}-\d{2}-\d{2}$/.test(data.bestBefore)) {
    dateEl.value = data.bestBefore;
    dateEl.dataset.userset = '1';
    setDateVisible(true);
    // Offer the read name only if the user hasn't named it yet.
    const nameEl = document.getElementById('pName');
    if (data.name && !nameEl.value.trim()) { nameEl.value = data.name; onNameInput(data.name); }
    if (msg) { msg.className = 'scan-date-msg ok'; msg.textContent = '✓ ' + data.bestBefore; }
  } else {
    // No printed date found — reveal the field so they can type it.
    setDateVisible(true);
    if (msg) { msg.className = 'scan-date-msg'; msg.textContent = l('noDateFound'); }
  }
}

async function readLabelWithAI(input) {
  if (!input.files || !input.files[0]) return;
  const status = document.getElementById('scanStatus');
  const url = aiProxyUrl();
  // Off-domain (dev/file://) there is no AI endpoint — say so honestly; the
  // old message pointed at a Settings row that no longer exists.
  if (!url || !navigator.onLine) { if (status) status.textContent = l('aiUnavailable'); input.value = ''; return; }
  if (status) status.textContent = l('readingLabel');
  try {
    const file = input.files[0];
    const img = await fileToAiImage(file, 1600);
    if (!img) { if (status) status.textContent = l('receiptFail'); return; }
    // lang: the model writes the product name in the app's language (all 33).
    // 45s: the free Workers AI path runs TWO inferences (vision describe +
    // text structuring), which can stack past 30s on a cold tier.
    const data = await postJSON(url, { image: img.data, mediaType: img.type, lang: currentLang }, 45000);
    if (data && data.name) {
      closeScanner();
      addProductManually();
      // The snapped photo IS the product — keep it as the card picture.
      try {
        document.getElementById('productModal').dataset.img = await fileToThumb(file);
        updatePhotoPreview();
      } catch {}
      document.getElementById('pName').value = data.name;
      const dateEl = document.getElementById('pDate');
      if (data.bestBefore) {
        // A REAL printed best-before date read off the label — show it.
        dateEl.value = data.bestBefore;
        dateEl.dataset.userset = '1';
        setDateVisible(true);
      } else if (typeof data.days === 'number') {
        // No printed date: keep the field empty, apply the AI estimate on save.
        _aiDays = { name: data.name, days: data.days };
      }
    } else if (status) {
      status.textContent = l('labelFail');
    }
  } catch {
    if (status) status.textContent = l('labelFail');
  }
  input.value = '';
}

function buildLocalRecipes() {
  const ps = state.products;
  const find = rx => ps.find(p => rx.test(p.name));
  const milk = find(/milk|молоко|lait|milch|leche|latte|leite|lapte|mleko|mlíko|tej|mlijeko|süt|γάλα|חלב|นม|susu|maito/i);
  const eggs = find(/egg|яйц|oeuf|ei|huevo|uovo|ovo|ou|jajk|vejce|tojás|jaj[ec]a|yumurt|αυγ|ביצ|ไข่|telur|mun/i);
  const cheese = find(/cheese|сыр|fromage|käse|queso|formag|queijo|brânz|ser|sýr|sajt|sir|peynir|τυρ|גבינ|เนย|keju|juusto/i);
  const yogurt = find(/yogurt|йогурт|yaourt|joghurt|yogur|yogurt|iogurte|iaurt|jogurt/i);
  const veg = find(/carrot|onion|potato|tomato|морков|лук|картошк|помидор|légume|gemüse|verdura/i);

  const local = [
    {name: l('recipePancakes'), used:[milk,eggs].filter(Boolean), missing:['flour'], emoji:'🥞'},
    {name: l('recipeCheeseToast'), used:[cheese,eggs].filter(Boolean), missing:['bread'], emoji:'🧀'},
    {name: l('recipeYogurtBowl'), used:[yogurt].filter(Boolean), missing:[], emoji:'🥗'},
    {name: l('recipeScrambledEggs'), used:[eggs].filter(Boolean), missing:[], emoji:'🍳'},
    {name: l('recipeVeggieOmelette'), used:[eggs,veg].filter(Boolean), missing:[], emoji:'🥚'},
  ].filter(r => r.used.length > 0);

  return local.map(r => ({
    title: r.name,
    image: null,
    emoji: r.emoji,
    source: 'Kulpio',
    used: r.used.map(p => p.name),
    localUsed: true,   // these are the user's own product names — already localized
    missing: r.missing,
    ingredients: [],     // filled on demand from TheMealDB when opened
    instructions: '',
    external: null
  }));
}

function recipeSearchUrl(title) {
  return `https://www.google.com/search?q=${encodeURIComponent(title + ' recipe ' + fridgeIngredients().slice(0,3).join(' '))}`;
}

// fetch JSON with a hard timeout so a slow/blocked request can never hang
// the recipes tab. Returns null on any failure instead of throwing.
function fetchJSON(url, ms = 8000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, {signal: ctrl.signal})
    .then(r => r.ok ? r.json() : null)
    .catch(() => null)
    .finally(() => clearTimeout(timer));
}

function reloadRecipes() {
  recipeCacheKey = '';
  internetRecipes = [];
  switchTab('recipes', document.getElementById('tab-recipes'));
}

// Pulls REAL recipes (with photos) from TheMealDB based on EVERY product
// in the fridge — most-urgent items first — then ranks them by how many of
// your ingredients they use. Re-runs automatically whenever the fridge changes.
// Common pantry items shouldn't dominate the recipe search (almost every
// recipe has oil/salt/water), so they're queried last and only if needed.
const STAPLES = new Set(['oil','salt','water','sugar','flour','pepper','butter','honey']);

async function loadInternetRecipes() {
  const order = {br:0, ba:1, bg:2};
  let queryIngredients = [...new Set(
    state.products
      .slice()
      .sort((a,b) => (order[a.cls] ?? 3) - (order[b.cls] ?? 3))
      .flatMap(p => productToIngredients(p.name))   // translate to English ingredients
      .filter(Boolean)
  )];
  // Non-staple ingredients first (stable), staples after, then cap.
  queryIngredients.sort((a,b) => (STAPLES.has(a) ? 1 : 0) - (STAPLES.has(b) ? 1 : 0));
  queryIngredients = queryIngredients.slice(0, 5);

  const key = queryIngredients.join('|') || 'egg';
  if (recipeCacheKey === key && internetRecipes.length) return;
  recipeCacheKey = key;
  internetRecipes = [];

  try {
    // 1) Fetch candidate meals PER ingredient, then merge round-robin so every
    //    fridge item is represented (otherwise one ingredient with many hits,
    //    e.g. "oil", would fill the whole list and hide the others).
    const lists = [];
    for (const q of (queryIngredients.length ? queryIngredients : ['egg'])) {
      const data = await fetchJSON(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(q)}`);
      lists.push(data?.meals || []);
    }
    const seen = new Set();
    const candidates = [];
    for (let i = 0, more = true; more; i++) {
      more = false;
      for (const list of lists) {
        const m = list[i];
        if (!m) continue;
        more = true;
        if (!seen.has(m.idMeal)) { seen.add(m.idMeal); candidates.push(m); }
      }
    }

    // 2) Fetch full details for the first batch and score by fridge overlap
    const have = fridgeIngredientsEN();
    const detailed = await Promise.all(candidates.slice(0, 12).map(async meal => {
      try {
        const detail = await fetchJSON(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${meal.idMeal}`);
        const info = detail?.meals?.[0] || {};
        const full = extractMeal(info);
        const ingNames = full.ingredients.map(x => x.name);
        const used = ingNames.filter(i => have.some(h => i.toLowerCase().includes(h) || h.includes(i.toLowerCase())));
        const missing = ingNames.filter(i => !used.includes(i)).slice(0, 3);
        return {title: meal.strMeal, image: meal.strMealThumb, emoji:'🍽️', source:'TheMealDB',
          used: used.slice(0, 4), missing, ingredients: full.ingredients, instructions: full.instructions,
          external: full.external, url: full.external || recipeSearchUrl(meal.strMeal),
          // Recipes that rescue something expiring rank ahead of mere matches.
          _score: used.length + (used.some(usedMarker) ? 2 : 0)};
      } catch { return null; }
    }));

    internetRecipes = detailed.filter(Boolean).sort((a,b) => b._score - a._score).slice(0, 6);
  } catch {
    internetRecipes = [];
  }
}

// Does a used-ingredient string correspond to a fridge item that expires
// within 2 days? Drives the ⏰ badge and the suggestion boost.
function usedMarker(ing) {
  const s = String(ing || '').toLowerCase();
  if (!s) return false;
  for (const p of state.products) {
    if (p.frozen || !p.exp) continue;
    const d = daysUntil(p.exp);
    if (d == null || d < 0 || d > 2) continue;
    if ((p.name || '').trim().toLowerCase() === s) return true;   // local recipes carry product names
    for (const h of productToIngredients(p.name)) {
      if (s.includes(h) || h.includes(s)) return true;
    }
  }
  return false;
}
function recipeUsesExpiring(recipe) {
  return (recipe.used || []).some(usedMarker);
}

function recipeCard(recipe, idx) {
  const missing = (recipe.missing || []).filter(Boolean);
  const buy = missing.map(m => `• ${esc(m)}`).join('<br>');
  const used = (recipe.used || []).filter(Boolean);
  const fav = isFav(recipe);
  return `<div class="recipe-card">
    ${recipe.image
      ? `<img class="recipe-thumb" src="${esc(recipe.image)}" alt="" loading="lazy">`
      : `<div class="recipe-thumb">${recipe.emoji || '🍽️'}</div>`}
    <div>
      <div class="card-title" id="rc-t-${idx}">${esc(recipe.title)}</div>
      <div class="card-sub" style="margin-top:3px">${esc(recipe.source || l('internetSource'))}${recipeUsesExpiring(recipe) ? ` <span class="pbadge ba" style="font-size:10px;padding:2px 8px">⏰ ${esc(l('fExpiring'))}</span>` : ''}</div>
      ${used.length ? `<div class="card-sub" id="rc-used-${idx}" style="color:var(--brand-ink);margin-top:2px">✓ ${esc(used.join(', '))}</div>` : ''}
      ${missing.length ? `<div class="missing-list" id="rc-miss-${idx}">+ ${esc(l('recommended'))}:<br>${buy}</div>` : ''}
      <div class="recipe-actions">
        <button class="mini-btn" onclick="openRecipeDetail(${idx})">${esc(l('viewRecipe'))}</button>
        <button class="mini-btn fav-btn${fav ? ' on' : ''}" id="rc-fav-${idx}" onclick="toggleFav(${idx})" aria-label="${esc(l('favSave'))}" aria-pressed="${fav}">${fav ? '♥' : '♡'}</button>
        ${recipesView === 'fav' ? `<button class="mini-btn" onclick="togglePlanPick(${idx})" aria-expanded="${_planPick === idx}">📅 ${esc(l('planBtn'))}</button>` : ''}
      </div>
      ${recipesView === 'fav' && _planPick === idx ? planPickHtml(idx) : ''}
    </div>
  </div>`;
}

// ── RECIPE FAVOURITES ────────────────────────────────────────────
// Saved recipes keep their full ingredients & instructions, so they open
// even offline and survive the suggestions changing with the fridge.
let favRecipes = safeParse(localStorage.getItem('kulpio-fav-recipes'), []);
let recipesView = 'sugg';   // 'sugg' | 'fav' (session-only)
function isFav(r) {
  const k = (r.title || '').trim().toLowerCase();
  return favRecipes.some(f => (f.title || '').trim().toLowerCase() === k);
}
function toggleFav(idx) {
  const r = shownRecipes[idx];
  if (!r) return;
  const k = (r.title || '').trim().toLowerCase();
  const at = favRecipes.findIndex(f => (f.title || '').trim().toLowerCase() === k);
  if (at >= 0) favRecipes.splice(at, 1);
  else {
    const { _score, ...copy } = r;
    favRecipes.unshift(copy);
    favRecipes = favRecipes.slice(0, 20);   // keep the shelf tidy
    pearReact('hop', null, '💚', 600);
  }
  try { localStorage.setItem('kulpio-fav-recipes', JSON.stringify(favRecipes)); } catch {}
  if (recipesView === 'fav') { _planPick = null; renderContent(); return; }
  const b = document.getElementById(`rc-fav-${idx}`);
  if (b) {
    b.textContent = at >= 0 ? '♡' : '♥';
    b.classList.toggle('on', at < 0);
    b.setAttribute('aria-pressed', at < 0);
  }
}
function setRecipesView(v) {
  recipesView = v;
  _planPick = null;
  renderContent();
}
function recipeChipsHtml() {
  return `<div class="fm-row" style="margin-bottom:10px">
    <button class="fchip ${recipesView === 'sugg' ? 'active' : ''}" onclick="setRecipesView('sugg')">✨ ${esc(l('suggChip'))}</button>
    <button class="fchip ${recipesView === 'fav' ? 'active' : ''}" onclick="setRecipesView('fav')">♥ ${esc(l('favChip'))}${favRecipes.length ? ` (${favRecipes.length})` : ''}</button>
  </div>`;
}

// ── MEAL PLANNER ─────────────────────────────────────────────────
// Pin a saved recipe to a day this week. Each entry keeps the full recipe
// (like favourites do) so it opens even offline and survives un-hearting.
let mealPlan = safeParse(localStorage.getItem('kulpio-plan'), {});
(() => { const today = weekDayKey(0); for (const k in mealPlan) if (k < today) delete mealPlan[k]; })();
function savePlan() { try { localStorage.setItem('kulpio-plan', JSON.stringify(mealPlan)); } catch {} }
let _planPick = null;   // index of the saved card whose day picker is open

function planStripHtml() {
  if (!favRecipes.length && !Object.keys(mealPlan).length) return '';
  const wdFmt = new Intl.DateTimeFormat(speechLang[currentLang] || currentLang, { weekday: 'short' });
  const cells = [];
  for (let o = 0; o < 7; o++) {
    const key = weekDayKey(o);
    const r = mealPlan[key];
    const name = wdFmt.format(new Date(Date.now() + o * 86400000));
    cells.push(`<div class="pl-cell${o === 0 ? ' today' : ''}">
      <span class="wd-name">${esc(name)}</span>
      ${r ? `<button type="button" class="pl-meal" onclick="openPlanned('${key}')" title="${esc(r.title)}" aria-label="${esc(r.title)}">${r.image ? `<img src="${esc(r.image)}" alt="" onerror="this.replaceWith('🍽️')">` : (r.emoji || '🍽️')}</button>
        <button type="button" class="pl-x" onclick="unplanDay('${key}')" aria-label="${esc(l('planUnpin'))}" title="${esc(l('planUnpin'))}">×</button>`
      : `<span class="pl-empty">·</span>`}
    </div>`);
  }
  return `<div class="week-strip"><div class="week-title">📅 ${esc(l('planWeek'))}</div><div class="week-days">${cells.join('')}</div></div>`;
}
function planPickHtml(idx) {
  const wdFmt = new Intl.DateTimeFormat(speechLang[currentLang] || currentLang, { weekday: 'short' });
  let chips = '';
  for (let o = 0; o < 7; o++) {
    const key = weekDayKey(o);
    const name = o === 0 ? l('today') : wdFmt.format(new Date(Date.now() + o * 86400000));
    chips += `<button type="button" class="fchip${mealPlan[key] ? ' active' : ''}" onclick="planRecipe(${idx},'${key}')">${mealPlan[key] ? (mealPlan[key].emoji || '🍽️') + ' ' : ''}${esc(name)}</button>`;
  }
  return `<div style="margin-top:8px"><div class="fm-title">${esc(l('planPick'))}</div><div class="fm-row">${chips}</div></div>`;
}
function togglePlanPick(idx) {
  _planPick = _planPick === idx ? null : idx;
  renderContent();
}
function planRecipe(idx, key) {
  const r = shownRecipes[idx];   // Saved view: shownRecipes IS favRecipes
  if (!r) return;
  const { _score, ...copy } = r;
  mealPlan[key] = copy;
  savePlan();
  _planPick = null;
  // The pitch of the feature: what's missing jumps onto the shopping list.
  const have = fridgeIngredientsEN();
  const names = (r.ingredients && r.ingredients.length)
    ? r.ingredients.map(i => (i.name || i).toString())
    : (r.missing || []);
  const missing = names.filter(n => {
    const lc = n.trim().toLowerCase();
    if (!lc) return false;
    // Localized ingredient names (pear-chef recipes) match through the
    // canonical-EN dictionary; raw substring match covers the rest.
    if (productToIngredients(n).some(i => have.includes(i))) return false;
    return !have.some(h => h && (lc.includes(h) || h.includes(lc)));
  });
  missing.slice(0, 6).forEach(n => addShopItemByName(capitalize(n.trim())));
  pearReact('hop', missing.length ? 'planShop' : 'planSet', '📅', 700);
  renderContent();
}
function unplanDay(key) {
  delete mealPlan[key];
  savePlan();
  pearSpark('📅');
  renderContent();
}
function openPlanned(key) {
  const r = mealPlan[key];
  if (r) openRecipeDetail(r);
}

// ── RECIPE SEARCH & SURPRISE ─────────────────────────────────────
// Turn a raw TheMealDB meal into the card/detail shape, matched to the fridge.
function mealToRecipe(info, have) {
  const full = extractMeal(info);
  const ingNames = full.ingredients.map(x => x.name);
  const used = ingNames.filter(i => have.some(h => i.toLowerCase().includes(h) || h.includes(i.toLowerCase())));
  return { title: info.strMeal, image: info.strMealThumb, emoji: '🍽️', source: 'TheMealDB',
    used: used.slice(0, 4), missing: ingNames.filter(i => !used.includes(i)).slice(0, 3),
    ingredients: full.ingredients, instructions: full.instructions,
    external: full.external, url: full.external || recipeSearchUrl(info.strMeal) };
}
function recipeSearchRowHtml(q = '') {
  return `<form class="fridge-row" style="margin-bottom:10px" onsubmit="searchRecipes(event)">
    <input id="recipeSearch" class="fridge-search" type="search" autocomplete="off" placeholder="${esc(l('rSearchPh'))}" aria-label="${esc(l('rSearchPh'))}" value="${esc(q)}">
    <button type="submit" class="fchip active" style="min-width:44px" aria-label="${esc(l('rSearchPh'))}">🔍</button>
    <button type="button" class="fchip active" style="min-width:44px" onclick="surpriseRecipe()" aria-label="${esc(l('rSurprise'))}" title="${esc(l('rSurprise'))}">🎲</button>
  </form>`;
}
// Search the whole cookbook by name — not limited to what the fridge suggests.
async function searchRecipes(ev) {
  if (ev) ev.preventDefault();
  const input = document.getElementById('recipeSearch');
  const q = (input && input.value || '').trim();
  if (!q) { renderContent(); return; }   // cleared search → back to suggestions
  const list = document.getElementById('productList');
  list.innerHTML = recipeChipsHtml() + recipeSearchRowHtml(q) + `<div class="rd-loading">${esc(l('loadingRecipe'))}</div>`;
  let meals = [];
  try {
    const data = await fetchJSON('https://www.themealdb.com/api/json/v1/1/search.php?s=' + encodeURIComponent(q));
    meals = data?.meals || [];
  } catch {}
  if (currentTab !== 'recipes') return;
  const have = fridgeIngredientsEN();
  shownRecipes = meals.slice(0, 8).map(m => mealToRecipe(m, have));
  list.innerHTML = recipeChipsHtml() + recipeSearchRowHtml(q) + (shownRecipes.length
    ? `<div class="panel-grid">${shownRecipes.map((r, i) => recipeCard(r, i)).join('')}</div>`
    : `<div style="text-align:center;padding:30px 18px;font-size:13px;color:var(--muted)">${esc(l('noRecipesFound'))}</div>`);
  translateCardTitles();
  localizeRecipeIngredients();
}
// One random recipe from the whole cookbook, opened straight away.
async function surpriseRecipe() {
  const list = document.getElementById('productList');
  list.innerHTML = recipeChipsHtml() + recipeSearchRowHtml() + chefRowHtml() +`<div class="rd-loading">${esc(l('loadingRecipe'))}</div>`;
  let info = null;
  try { info = (await fetchJSON('https://www.themealdb.com/api/json/v1/1/random.php'))?.meals?.[0] || null; } catch {}
  if (currentTab !== 'recipes') return;
  if (!info) { renderContent(); return; }
  shownRecipes = [mealToRecipe(info, fridgeIngredientsEN())];
  list.innerHTML = recipeChipsHtml() + recipeSearchRowHtml() + chefRowHtml() +`<div class="panel-grid">${recipeCard(shownRecipes[0], 0)}</div>`;
  translateCardTitles();
  localizeRecipeIngredients();
  pearReact('hop', null, '🎲', 600);
  openRecipeDetail(0);
}

// ── AI PEAR CHEF ─────────────────────────────────────────────────
// The pear invents one dish from whatever expires soonest, via the AI proxy.
// The answer arrives already in the app's language (noTranslate), so the
// recipe modal must not run it through the EN→lang translator again.
function chefCandidates() {
  return state.products
    .filter(p => { const d = p.exp && !p.frozen ? daysUntil(p.exp) : null; return d != null && d >= 0; })
    .sort((a, b) => daysUntil(a.exp) - daysUntil(b.exp))
    .slice(0, 8);
}
function chefRowHtml() {
  if (!aiProxyUrl() || !chefCandidates().length) return '';
  return `<button class="chef-btn" onclick="pearChef()">
    <span class="cb-emoji">🍐🍳</span>
    <span><span class="cb-label">${esc(l('chefBtn'))}</span><span class="cb-sub">${esc(l('chefSub'))}</span></span>
  </button>`;
}
let _chefBusy = false;
async function pearChef() {
  if (_chefBusy) return;
  const url = aiProxyUrl();
  const items = chefCandidates();
  if (!url || !items.length || !navigator.onLine) { pearReact('sad', 'chefFail', '💧', 900); return; }
  _chefBusy = true;
  pearReact('humming', 'chefThinking', '👨‍🍳', 1400);
  const modal = document.getElementById('recipeModal');
  const body = document.getElementById('recipeModalBody');
  ensureOverlayHistory();
  modal.classList.add('show');
  const scroller = modal.querySelector('.recipe-modal');
  if (scroller) scroller.scrollTop = 0;
  body.innerHTML = `<div class="rd-loading">🍐👨‍🍳<br>${esc(l('chefThinking'))}</div>`;
  const payload = items.map(p => { const d = daysUntil(p.exp); return `${p.name} (${d === 0 ? 'expires today' : `expires in ${d} days`})`; });
  const data = await postJSON(url, { chef: { items: payload, lang: currentLang } }, 45000);
  _chefBusy = false;
  if (!modal.classList.contains('show')) return;   // closed while cooking
  // Guard against schema echoes and half answers from the free model.
  if (!data || typeof data.title !== 'string' || !Array.isArray(data.steps) || !data.steps.length || typeof data.steps[0] !== 'string') {
    body.innerHTML = `<div class="rd-loading">😔<br>${esc(l('chefFail'))}</div>`;
    pearReact('sad', null, '💧', 900);
    return;
  }
  const uses = (Array.isArray(data.uses) ? data.uses : []).map(s => String(s).trim()).filter(Boolean);
  const r = {
    title: data.title.trim(), emoji: '🍐', source: l('chefSource'),
    used: uses.slice(0, 4), missing: [],
    ingredients: (Array.isArray(data.ingredients) ? data.ingredients : [])
      .map(x => ({ name: String(x && x.name || '').trim(), measure: String(x && x.measure || '').trim() }))
      .filter(x => x.name),
    instructions: data.steps.map(s => String(s).trim()).filter(Boolean).join('\n'),
    noTranslate: true,
  };
  // Show it as the tab's single card (like Surprise me) so ♥ can save it.
  shownRecipes = [r];
  const list = document.getElementById('productList');
  if (currentTab === 'recipes' && recipesView === 'sugg' && list) {
    list.innerHTML = recipeChipsHtml() + recipeSearchRowHtml() + chefRowHtml() + `<div class="panel-grid">${recipeCard(r, 0)}</div>`;
  }
  openRecipe = r;
  const nutriP = fetchAiNutrition(r);          // start БЖУ before the modal build
  body.innerHTML = await buildRecipeModal(r);
  if (!modal.classList.contains('show')) return;
  pearReact('proud', null, '🍳', 900);
  pearSay(r.title);
  aiUpgradeNutrition(r, nutriP);
}

// Translate the titles of the currently shown recipe cards into the selected
// language (cards render in English first, then update as translations arrive).
async function translateCardTitles(lang = currentLang) {
  if (lang === 'en' || !shownRecipes.length) return;
  // Keep the REFERENCE (not a copy): renderContent reassigns shownRecipes when
  // the list changes, so a reference comparison detects stale cards. A .slice()
  // copy would never equal shownRecipes and the guard would always bail.
  const snapshot = shownRecipes;
  const titles = await translateMany(snapshot.map(r => r.title), lang);
  if (currentLang !== lang || shownRecipes !== snapshot) return;   // language/list changed while translating
  snapshot.forEach((r, i) => {
    const el = document.getElementById('rc-t-' + i);
    if (el) el.textContent = titles[i];
  });
}

// Translate the "✓ used from your fridge" (orange) line and the "recommended
// to buy" list on each recipe card into the selected language.
async function localizeRecipeIngredients(lang = currentLang) {
  if (lang === 'en' || !shownRecipes.length) return;
  const snapshot = shownRecipes.slice();
  // Warm the translation cache with ONE batched call covering every card —
  // a hail of tiny per-card requests starves the free AI tier (and the БЖУ
  // call with it). The per-card loop below then hits the cache instantly.
  const all = [];
  for (const r of snapshot) {
    if (!r.localUsed && r.used) all.push(...r.used.filter(Boolean));
    if (r.missing) all.push(...r.missing.filter(Boolean));
  }
  if (all.length) await translateMany([...new Set(all)], lang);
  if (currentLang !== lang || shownRecipes.length !== snapshot.length) return;
  for (let i = 0; i < snapshot.length; i++) {
    const r = snapshot[i];
    const usedEl = document.getElementById('rc-used-' + i);
    if (usedEl && !r.localUsed && r.used && r.used.length) {   // skip user's own product names
      const loc = await translateMany(r.used.filter(Boolean), lang);
      if (currentLang === lang && currentTab === 'recipes' && shownRecipes[i] === r) usedEl.textContent = '✓ ' + loc.join(', ');
    }
    const missEl = document.getElementById('rc-miss-' + i);
    if (missEl && r.missing && r.missing.length) {
      const loc = await translateMany(r.missing.filter(Boolean), lang);
      if (currentLang === lang && currentTab === 'recipes' && shownRecipes[i] === r)
        missEl.innerHTML = '+ ' + esc(l('recommended')) + ':<br>' + loc.map(m => '• ' + esc(m)).join('<br>');
    }
  }
}

// ─── IN-APP RECIPE DETAIL ────────────────────────────────────────
// Pulls a full ingredient list + step-by-step method from TheMealDB and
// shows it inside the app instead of bouncing the user to a web search.
function extractMeal(info) {
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const nm = info[`strIngredient${i}`];
    const ms = info[`strMeasure${i}`];
    if (nm && nm.trim()) ingredients.push({name: nm.trim(), measure: (ms || '').trim()});
  }
  return {
    image: info.strMealThumb || null,
    instructions: info.strInstructions || '',
    ingredients,
    external: info.strSource || info.strYoutube || null
  };
}

async function fetchRecipeByName(name) {
  try {
    const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(name)}`);
    const data = await res.json();
    const meal = (data.meals || [])[0];
    return meal ? extractMeal(meal) : null;
  } catch { return null; }
}

// ─── TRANSLATION (show recipes in the selected language) ─────────
// Primary: the AI proxy translates whole batches in one call with natural
// culinary wording. Fallback: the free MyMemory API (no key, CORS-enabled).
// Both cached in localStorage so repeated terms are instant.
// v2: the key is versioned — bump it when translation quality improves so
// cached wrong renderings (e.g. «Stoc de pui») don't live forever.
const _trCache = safeParse(localStorage.getItem('kulpio-tr2'), {});
function _trSave() { try { localStorage.setItem('kulpio-tr2', JSON.stringify(_trCache)); } catch {} }
try { localStorage.removeItem('kulpio-tr'); } catch {}   // drop the v1 blob
async function translateText(text, lang) {
  text = String(text || '').trim();
  if (!text || lang === 'en') return text;
  const key = lang + ':' + text;
  const hit = _trGet(key);
  if (hit) return hit;
  const data = await fetchJSON(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${encodeURIComponent(lang)}`, 7000);
  const out = data && data.responseData && data.responseData.translatedText;
  if (out && !/MYMEMORY WARNING|INVALID|QUERY LENGTH|NO QUERY/i.test(out)) {
    _trPut(key, text, out); _trSave(); return out;
  }
  return text;
}
// Long strings (cooking-step paragraphs) are cached for the session only —
// persisting them would blow through the ~5 MB localStorage quota and kill
// the whole cache. Short terms (titles, ingredients) persist as before.
const _trMem = {};
const _trBatchPending = {};
function _trGet(key) { return _trCache[key] || _trMem[key]; }
function _trPut(key, text, val) { if (text.length > 200) _trMem[key] = val; else _trCache[key] = val; }
async function translateMany(arr, lang) {
  arr = arr.map(t => String(t || '').trim());
  if (lang === 'en') return arr;
  const out = arr.slice();
  const misses = [];   // indices not in the cache
  arr.forEach((t, i) => {
    if (!t) return;
    const c = _trGet(lang + ':' + t);
    if (c) out[i] = c; else misses.push(i);
  });
  if (!misses.length) return out;
  const done = new Set();
  const proxy = aiProxyUrl();
  if (proxy && navigator.onLine) {
    // Chunk to stay under the worker's 60-text batch cap and keep each
    // reply inside the model's output window (long cooking steps).
    const chunks = [];
    let cur = [], chars = 0;
    for (const i of misses) {
      if (cur.length && (cur.length >= 40 || chars + arr[i].length > 3000)) { chunks.push(cur); cur = []; chars = 0; }
      cur.push(i); chars += arr[i].length;
    }
    if (cur.length) chunks.push(cur);
    const answers = await Promise.all(chunks.map(idx => {
      const batchKey = lang + ':' + idx.map(i => arr[i]).join('\u0001');
      return _trBatchPending[batchKey] || (_trBatchPending[batchKey] = postJSON(proxy, { translate: { lang, texts: idx.map(i => arr[i]) } }, 25000)
        .finally(() => { delete _trBatchPending[batchKey]; }));
    }));
    chunks.forEach((idx, c) => {
      const r = answers[c];
      if (!r || !Array.isArray(r.texts) || r.texts.length !== idx.length) return;
      idx.forEach((i, k) => {
        const t = String(r.texts[k] || '').trim();
        if (t) { out[i] = t; _trPut(lang + ':' + arr[i], arr[i], t); done.add(i); }
      });
    });
    _trSave();
  }
  // Anything the AI skipped, blanked or failed still gets the per-string
  // MyMemory fallback (and untranslated English as the last resort).
  const left = misses.filter(i => !done.has(i));
  if (left.length) await Promise.all(left.map(async i => { out[i] = await translateText(arr[i], lang); }));
  return out;
}

// Split free-text instructions into individual steps.
function splitSteps(instructions) {
  if (!instructions || !instructions.trim()) return [];
  let parts = instructions.split(/\r?\n+/).map(s => s.replace(/^\s*(?:step\s*)?\d+[.)]\s*/i, '').trim()).filter(s => s.length > 1);
  if (parts.length < 2) parts = instructions.split(/(?<=[.!?])\s+(?=[A-ZА-ЯЁ0-9])/).map(s => s.trim()).filter(s => s.length > 4);
  return parts;
}

// A relevant photo for a step: TheMealDB's photo of an ingredient the step
// mentions, otherwise the recipe's main photo.
function ingredientImg(name) {
  return `https://www.themealdb.com/images/ingredients/${encodeURIComponent(String(name).trim())}-Small.png`;
}
function stepImage(enStep, recipe) {
  const low = (enStep || '').toLowerCase();
  const hit = (recipe.ingredients || []).map(x => x.name).find(n => n && low.includes(n.toLowerCase()));
  return hit ? ingredientImg(hit) : (recipe.image || null);
}

// Rebuild the open recipe modal in place (fridge or pantry marks changed).
function refreshOpenRecipeModal() {
  if (openRecipe && document.getElementById('recipeModal').classList.contains('show')) {
    buildRecipeModal(openRecipe).then(html => {
      const body = document.getElementById('recipeModalBody');
            if (body && document.getElementById('recipeModal').classList.contains('show')) {
        body.innerHTML = html;
        fillIngredientPhotos();   // re-fill after an in-place rebuild (cached, so instant)
      }

    });
  }
}

// "+" on a suggested item: add it to the fridge ("I have it"), then refresh
// the open recipe so it flips to ✓.
function addSuggestedItem(b64) {
  const name = decodeURIComponent(atob(b64));
  if (!name) return;
  mergeOrPush(makeProduct(name));
  recipeCacheKey = '';              // fridge changed → recipe matches change too
  saveState();
  fetchProductImage(name);
  refreshOpenRecipeModal();
}

// ── PANTRY "I HAVE IT" ── the fridge never lists salt, oil or flour, so
// recipes kept calling them missing. Mark one as yours once and every recipe
// counts it from then on; tapping the mark again takes it back.
let myHave = [];
try { myHave = JSON.parse(localStorage.getItem('kulpio-have') || '[]'); } catch {}
function toggleHaveIt(b64) {
  let name = '';
  try { name = decodeURIComponent(atob(b64)).toLowerCase().trim(); } catch {}
  if (!name) return;
  myHave = myHave.includes(name) ? myHave.filter(x => x !== name) : [...myHave, name].slice(-100);
  localStorage.setItem('kulpio-have', JSON.stringify(myHave));
  refreshOpenRecipeModal();
}

// One missing ingredient → the shopping list; the + flips to a ✓ in place.
function shopOneIngredient(b64, btn) {
  const name = decodeURIComponent(atob(b64));
  if (!name) return;
  addShopItemByName(name);
  if (btn) {
    const tick = document.createElement('span');
    tick.className = 'rd-tick';
    tick.textContent = '✓';
    btn.replaceWith(tick);
  }
  pearSpark('🛒');
}
// The "add everything missing" button under the ingredient checklist.
function shopMissingList(b64) {
  let names = [];
  try { names = JSON.parse(decodeURIComponent(atob(b64))); } catch {}
  if (!Array.isArray(names) || !names.length) return;
  names.slice(0, 12).forEach(n => addShopItemByName(String(n)));
  const b = document.getElementById('rdShopAll');
  if (b) { b.disabled = true; b.textContent = `✓ ${l('rdShopped')}`; }
  document.querySelectorAll('#recipeModalBody .rd-plus').forEach(p => {
    const tick = document.createElement('span');
    tick.className = 'rd-tick';
    tick.textContent = '✓';
    p.replaceWith(tick);
  });
  pearReact('hop', 'rdShopped', '🛒', 700);
}

async function openRecipeDetail(idx) {
  const modal = document.getElementById('recipeModal');
  const body = document.getElementById('recipeModalBody');
  // Accepts an index into shownRecipes, or a recipe object directly (used by
  // the meal planner, whose recipes aren't in the visible list).
  let r = (typeof idx === 'object' && idx) ? idx : shownRecipes[idx];
  if (!r) return;
  const langAtOpen = currentLang;
  ensureOverlayHistory();
  modal.classList.add('show');
  const scroller = modal.querySelector('.recipe-modal');
  if (scroller) scroller.scrollTop = 0;
  body.innerHTML = `<div class="rd-loading">${esc(l('loadingRecipe'))}</div>`;

  if (!r.instructions || !(r.ingredients && r.ingredients.length)) {
    const fetched = await fetchRecipeByName(r.title);
    if (fetched) { r = {...r, ...fetched}; if (typeof idx === 'number') shownRecipes[idx] = r; }
    if (!modal.classList.contains('show') || currentLang !== langAtOpen) return;
  }
  openRecipe = r;
  // Start the БЖУ request BEFORE the translation batches — fired after them
  // it competes with 3-5 in-flight translate calls on the free AI tier and
  // regularly times out without ever landing.
  const nutriP = fetchAiNutrition(r);
  const html = await buildRecipeModal(r);
  if (!modal.classList.contains('show') || currentLang !== langAtOpen) return;
  body.innerHTML = html;
  aiUpgradeNutrition(r, nutriP);   // async БЖУ upgrade once the modal is visible
  fillIngredientPhotos();          // OFF photos for ingredients with no emoji
}

// Builds the recipe detail HTML, fully translated into the selected language,
// with per-step photos and add/sale actions on items you don't have yet.
async function buildRecipeModal(r) {
  // Pear-chef recipes are generated directly in the app's language — running
  // them through the EN→lang translator again would mangle them.
  const lang = r.noTranslate ? 'en' : currentLang;
  const have = fridgeIngredientsEN();
  const ings = (r.ingredients && r.ingredients.length)
    ? r.ingredients
    : [...(r.used || []).map(n => ({name: n})), ...(r.missing || []).map(n => ({name: n}))];
  const enSteps = splitSteps(r.instructions);

  const [title, ingNames, stepTexts] = await Promise.all([
    translateMany([r.title], lang).then(a => a[0]),
    // Translate the RAW names (same cache keys the recipe cards warmed) and
    // capitalize the result for display instead.
    translateMany(ings.map(i => (i.name || i).toString()), lang).then(a => a.map(capitalize)),
    translateMany(enSteps, lang),
  ]);

  const hero = r.image
    ? `<img class="rd-hero" src="${esc(r.image)}" alt="">`
    : `<div class="rd-hero">${r.emoji || '🍽️'}</div>`;

  // Clean checklist: food emoji, name, measure, then either a ✓ (in the
  // fridge) or a small + that puts that one item on the shopping list; one
  // "add everything missing" button closes the section.
  const missingShown = [];
  const rows = ings.map((ing, i) => {
    const enName = (ing.name || ing).toString();
    const nameLc = enName.toLowerCase();
    // ✓ if the fridge has it. Chef recipes name ingredients in the UI language,
    // so the EN fridge match misses — their `used` list (actual product names)
    // is the second chance.
    const has = have.some(h => h && (nameLc.includes(h) || h.includes(nameLc)))
      || (r.used || []).some(u => { const ul = String(u).toLowerCase(); return ul && (ul.includes(nameLc) || nameLc.includes(ul)); });
    const shown = ingNames[i] || capitalize(enName);
    const measure = ing.measure || '';
    // Pantry staples you marked "I have it" count as yours in every recipe.
    const inHave = myHave.includes(nameLc.trim());
    if (!has && !inHave) missingShown.push(shown);
    const b64 = btoa(encodeURIComponent(shown));
    const enB64 = btoa(encodeURIComponent(enName));
    return `<div class="rd-ing">
    ${(() => { const e = foodEmoji(enName) || foodEmoji(shown);
        // No emoji for this ingredient → tag it so an OFF photo can fill in.
        return e ? `<span class="rd-emoji" data-ing="${esc(enName)}" aria-hidden="true">${e}</span>`
                 : `<span class="rd-emoji" aria-hidden="true" data-ing="${esc(enName)}">·</span>`; })()}
      <span class="rd-name">${esc(shown)}</span>
      ${measure ? `<span class="rd-measure">${esc(fmtMeasure(measure))}</span>` : ''}
      ${has
        ? `<span class="rd-tick">✓</span>`
        : inHave
          ? `<button class="rd-tick rd-have-on" onclick="toggleHaveIt('${enB64}')" title="${esc(l('haveIt'))}" aria-label="${esc(l('haveIt'))}: ${esc(shown)}" aria-pressed="true">✓</button>`
          : `<button class="rd-have" onclick="toggleHaveIt('${enB64}')" title="${esc(l('haveIt'))}" aria-label="${esc(l('haveIt'))}: ${esc(shown)}" aria-pressed="false">✓</button>
             <button class="rd-plus" onclick="shopOneIngredient('${b64}', this)" title="${esc(l('rdAddMissing'))}" aria-label="${esc(l('rdAddMissing'))}: ${esc(shown)}">+</button>`}
    </div>`;
  }).join('');
  const shopAll = missingShown.length
    ? `<button class="rd-shopall" id="rdShopAll" onclick="shopMissingList('${btoa(encodeURIComponent(JSON.stringify(missingShown)))}')">🛒 ${esc(l('rdAddMissing'))} (${missingShown.length})</button>`
    : '';

  let stepsHtml;
  if (enSteps.length) {
    stepsHtml = `<ol class="rd-steplist">${enSteps.map((en, i) => {
      const img = stepImage(en, r);
      return `<li class="rd-step">
        ${img ? `<img class="rd-step-img" src="${esc(img)}" alt="" loading="lazy" onerror="this.style.display='none'">` : ''}
        <span class="rd-step-txt">${esc(stepTexts[i] || en)}</span>
      </li>`;
    }).join('')}</ol>`;
  } else {
    stepsHtml = `<div class="rd-empty">${esc(l('noInstructions'))}</div>`;
  }

  const ext = r.external
    ? `<button class="rd-link" onclick="window.open(${jsArg(r.external)},'_blank')">${esc(l('sourceLink'))}</button>`
    : '';

  // БЖУ: instant offline average, silently upgraded to a per-serving AI
  // estimate (see aiUpgradeNutrition) once the modal is on screen.
  const nutri = estimateRecipeNutrition(r);
  const nutriHtml = !nutri ? '' : `<div class="rd-section">${esc(l('nutrition'))}</div>
    <div class="rd-nutri" id="rdNutri">
      <div class="rd-nutri-chips">
        <span class="nchip">🔥 <b id="rdKcal">${nutri.kcal}</b> kcal</span>
        <span class="nchip">🥩 ${esc(l('protein'))} <b id="rdProt">${nutri.protein}</b>g</span>
        <span class="nchip">🧈 ${esc(l('fat'))} <b id="rdFat">${nutri.fat}</b>g</span>
        <span class="nchip">🍞 ${esc(l('carbs'))} <b id="rdCarb">${nutri.carbs}</b>g</span>
      </div>
      <div class="rd-nutri-note" id="rdNutriNote">${esc(l('per100'))}</div>
    </div>`;

  return `${hero}
    <div class="rd-title">${esc(title)}</div>
    <div class="rd-source">${esc(r.source || '')}</div>
    <div class="rd-section">${esc(l('ingredientsLabel'))}</div>
    ${rows}
    ${shopAll}
    ${nutriHtml}
    <div class="rd-section">${esc(l('instructionsLabel'))}</div>
    ${stepsHtml}
    ${ext}`;
}

// Upgrade the offline БЖУ average to a real per-serving estimate from the
// AI proxy. Fire-and-forget: updates the numbers in place if the same recipe
// is still open when the answer lands. openRecipeDetail starts the request
// early (fetchAiNutrition) so it doesn't queue behind translation batches.
function fetchAiNutrition(r) {
  const url = aiProxyUrl();
  if (!url || !navigator.onLine || !r) return null;
  const ings = (r.ingredients || []).map(i => `${(i.measure || '').trim()} ${(i.name || i).toString()}`.trim());
  if (!ings.length) return null;
  return postJSON(url, { nutrition: { title: r.title, ingredients: ings } }, 40000);
}
async function aiUpgradeNutrition(r, pending) {
  const data = await (pending || fetchAiNutrition(r));
  if (!data || typeof data.kcal !== 'number' || openRecipe !== r) return;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('rdKcal', Math.round(data.kcal));
  set('rdProt', Math.round((data.protein || 0) * 10) / 10);
  set('rdFat', Math.round((data.fat || 0) * 10) / 10);
  set('rdCarb', Math.round((data.carbs || 0) * 10) / 10);
  set('rdNutriNote', l('perServing'));
}

function closeRecipeModal() {
  openRecipe = null;
  document.getElementById('recipeModal').classList.remove('show');
}
