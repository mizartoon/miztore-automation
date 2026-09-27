# بانک پرامپت Kling برای ریلز میزطور

**برای:** تیشرت، پلیور دورس (Crewneck Sweatshirt) و هودی با طرح گرافیکی
**نسخه:** مهر ۱۴۰۵ (سپتامبر ۲۰۲۶). برای Kling 3.0 / 3.0 Omni نوشته شده و با 2.6 هم کار می‌کند.
**فرمت پیش‌فرض:** ریلز عمودی 9:16، مدت ۵ تا ۱۰ ثانیه (در حالت Multi-Shot تا ۱۵ ثانیه)

> متن پرامپت‌ها انگلیسی است، چون Kling با انگلیسی دقیق‌تر کار می‌کند. توضیح‌ها فارسی‌اند.
> جای خالی‌ها داخل `[براکت]` هستند و باید پر شوند، مثلاً `[COLOR]` → `black`، `[GARMENT]` → `oversized hoodie`.

---

## فهرست

0. [قانون طلایی میزطور: طرح نباید خراب شود](#0)
1. [فرمول پرامپت و تنظیمات](#1)
2. [کتابخانه قلاب‌های ثانیه اول](#2)
3. [دسته A: ویدیوی محصول بدون مدل](#A)
4. [دسته B: روی مدل و لایف‌استایل](#B)
5. [دسته C: ترنزیشن‌ها و ترندهای ویرال](#C)
6. [دسته D: اختصاصی تیشرت / دورس / هودی](#D)
7. [دسته E: تبلیغ کامل چندشاتی ۱۰ تا ۱۵ ثانیه](#E)
8. [دسته F: سبک UGC و موبایلی](#F)
9. [دسته G: فصلی و مناسبتی ایرانی](#G)
10. [دسته H: سورئال و اسکرول‌استاپ](#H)
11. [نگاتیو پرامپت‌ها و رفع خطا](#N)
12. [سناریوی هفتگی پیشنهادی](#P)
13. [منابع](#S)

---

<a id="0"></a>
## ۰. قانون طلایی میزطور: طرح نباید خراب شود

طرح‌های میزطور معمولاً **نوشته فارسی** و گرافیک ریز دارند. هیچ مدل ویدیویی، از جمله Kling، فارسی را درست نمی‌نویسد. برای همین:

1. **همیشه Image-to-Video بساز، نه Text-to-Video.** فریم اول باید عکس واقعی محصول یا عکس مدل با همان لباس باشد. عکس را با Nano Banana، Kling Image O1 یا Virtual Try-On بساز و طرح اصلی را رویش بگذار.
2. **هرگز از Kling نخواه روی لباس متن بنویسد.** به‌جایش بنویس: `the chest print from the reference image`.
3. **جمله محافظ** (Preservation Contract) را آخر همه پرامپت‌های این بانک بگذار:

```
Keep the garment's chest print exactly as in the reference image: same artwork, same text, same position, same colors. Print stays sharp, flat on the fabric, no warping, no morphing, no new text or letters.
```

4. هر وقت طرح در کادر درشت است، **حرکت دوربین را کم کن** (static یا slow push-in). چرخش ۳۶۰ درجه و whip pan بیشترین خرابی طرح را می‌سازند.
5. در Kling 3.0 عکس محصول را به‌عنوان **Element** اضافه کن (نمای جلو و پشت) تا لباس بین شات‌ها ثابت بماند.
6. اگر طرح باز هم خراب شد، ترفند **End Frame** را بزن: عکس نهایی محصول را فریم آخر بگذار تا ویدیو روی طرح سالم تمام شود.

---

<a id="1"></a>
## ۱. فرمول پرامپت و تنظیمات

Kling وقتی خوب جواب می‌دهد که پرامپت شبیه یک «بریف کوتاه فیلم‌برداری» باشد:

```
[CAMERA/SHOT] + [SUBJECT & GARMENT] + [ONE CLEAR ACTION] + [ENVIRONMENT, 3-5 items] + [LIGHTING & MOOD] + [STYLE/LENS] + [PRESERVATION]
```

| تنظیم | مقدار پیشنهادی |
|---|---|
| Aspect Ratio | `9:16` |
| مدت | ۵ ثانیه برای قلاب یا لوپ، ۱۰ ثانیه برای تک‌شات، ۱۵ ثانیه Multi-Shot |
| Mode | Professional / High Quality (برای بافت پارچه تأثیر زیادی دارد) |
| CFG / Creativity | کم تا متوسط (حدود 0.4 تا 0.5): پایبندی به عکس مهم‌تر است |
| Native Audio | برای صدای محیطی و ASMR پارچه روشن باشد. موزیک ترند را بعداً در اینستاگرام اضافه کن |
| Multi-Shot | حداکثر ۶ شات. کادر پرامپت اصلی خالی بماند و هر شات جدا نوشته شود. مدل و لباس را در Shot 1 کامل معرفی کن |

**قواعد مهم**
- در هر شات فقط **یک اکشن اصلی** بنویس.
- سرعت را مشخص کن: `slowly`، `in slow motion`، `snaps quickly`.
- بنویس **چه چیزی ثابت می‌ماند**. مثلاً `camera locked`، `background still`.
- فیزیک پارچه را توصیف کن: `heavyweight cotton`، `fleece`، `soft drape`، `fabric ripples`.
- ۵ تا ۸ مورد نگاتیو پرامپت کافی است. لیست ۳۰تایی نتیجه را بدتر می‌کند.

---

<a id="2"></a>
## ۲. کتابخانه قلاب‌های ثانیه اول

ریلز در ۱ تا ۱.۵ ثانیه اول برنده یا بازنده می‌شود. هر پرامپت این بانک یک «قلاب بصری» دارد. این‌ها را می‌توانی با هم ترکیب کنی:

| # | قلاب بصری (در پرامپت) | متن روی صفحه پیشنهادی (در ادیت) |
|---|---|---|
| H1 | `extreme close-up macro of the print, then fast pull-back` | «این طرح رو از نزدیک دیدی؟» |
| H2 | `garment drops from above into frame and lands with a soft thud` | «تازه رسید 👀» |
| H3 | `a hand slams the folded tee onto the table toward camera` | «فقط ۵۰ تا زدیم» |
| H4 | `model walks straight into the lens, fabric fills the frame (transition)` | «فیت امروز» |
| H5 | `camera snap-zooms onto the chest print` | «معنی این جمله رو می‌دونی؟» |
| H6 | `hoodie floats in mid-air, inflating as if worn by an invisible person` | «هودی بدون آدم راه میره؟» |
| H7 | `before/after: plain grey tee morphs into the printed tee` | «از ساده تا میزطوری» |
| H8 | `POV: phone camera, hand pulls hoodie out of a Miztore package` | «آنباکسینگ سفارش خودم» |
| H9 | `freeze frame mid-jump, fabric suspended` | «اینو کی بپوشه؟» |
| H10 | `giant garment on a Tehran building / miniature people` | «بزرگ‌ترین تیشرت تهران» |

> **نکته ترند ۲۰۲۶:** قلاب **غیرمنتظره در ثانیه اول**، **لوپ بی‌درز** (پایان ویدیو دقیقاً به شروع برسد تا دوباره پخش شود) و **ترنزیشن سریع با کنتراست بالا** بیشترین replay را می‌گیرند. replay در الگوریتم ریلز وزن بالایی دارد.

---

<a id="A"></a>
## دسته A: ویدیوی محصول بدون مدل (Product Hero)

مناسب برای شروع و کم‌خطرترین حالت. فریم اول: عکس محصول روی پس‌زمینه ساده.

### A1. دراپ و فرود (قلاب H2)
```
Vertical 9:16. A [COLOR] [GARMENT] falls from above into frame in slow motion and lands flat on a [concrete floor / white seamless backdrop], fabric ripples outward on impact then settles. Camera static, top-down overhead shot. Soft diffused studio light, crisp shadows, subtle dust particles rise on landing. Premium streetwear commercial, 4K, sharp fabric texture.
[PRESERVATION]
```

### A2. هودی ارواح (Invisible Model / Ghost Mannequin) (قلاب H6)
```
Vertical 9:16. A [COLOR] oversized hoodie floats in mid-air against a [dark grey] studio background, shaped as if worn by an invisible person. The hoodie slowly turns 45 degrees toward camera, sleeves gently swing, the hood lifts slightly as if a head nods. Camera slow push-in. Moody rim light, soft haze. Surreal fashion ad, cinematic, high detail fleece texture.
[PRESERVATION]
```

### A3. میکرو به ماکرو (قلاب H1)
```
Vertical 9:16. Start with an extreme macro close-up of the cotton weave and ink texture of the chest print, then the camera smoothly pulls back to reveal the full [COLOR] t-shirt hanging on a wooden hanger against a [beige plaster] wall. Soft window light from the left, gentle shadow play. Slow, elegant camera move, shallow depth of field at start, deep focus at end. Minimal luxury aesthetic.
[PRESERVATION]
```

### A4. چرخش روی استند (لوپ)
```
Vertical 9:16. A folded [COLOR] crewneck sweatshirt sits on a slowly rotating [matte black] turntable pedestal. Camera locked at eye level. A soft key light sweeps across the fabric revealing the brushed fleece texture and ribbed cuffs. Clean studio, gradient background [deep burgundy to black]. Seamless loop, smooth motion, product commercial.
[PRESERVATION]
```
> اگر طرح روی سینه است، استند فقط ±۳۰ درجه بچرخد: `rotates slowly 30 degrees left and back`.

### A5. تاشدن خودکار (ASMR تا کردن)
```
Vertical 9:16, top-down shot. A [COLOR] t-shirt lies flat on a light oak table. The sleeves fold inward by themselves, then the shirt folds in half neatly, revealing the chest print on top. Smooth stop-motion-like precision, satisfying movement. Soft natural daylight, clean minimal set. Native audio: soft fabric rustle ASMR.
[PRESERVATION]
```

### A6. باد و پارچه روی رخت‌آویز
```
Vertical 9:16. A [COLOR] t-shirt hangs on a clothesline on a sunny Tehran rooftop, [Alborz mountains] softly blurred in the background. A gentle breeze makes the fabric sway and ripple naturally, the print facing camera. Camera static, slight handheld breathing. Golden hour warm light, nostalgic mood, 35mm film grain.
[PRESERVATION]
```

### A7. اسپلش رنگ (برای معرفی رنگ جدید)
```
Vertical 9:16. A [COLOR] hoodie lies flat on a white surface. A burst of [matching color] powder explodes softly around it in slow motion, particles drifting through the air, then settling. Camera slow push-in. High-speed commercial photography look, bright clean lighting, vivid color.
[PRESERVATION]
```

### A8. قفسه نئونی شب
```
Vertical 9:16. A [COLOR] graphic tee on a chrome hanger rotates slightly on a clothing rack inside a dark streetwear store, neon tube light [red and blue] reflecting on glossy floor. Camera slow dolly-in to the chest. Cinematic night mood, haze, reflections, 50mm lens.
[PRESERVATION]
```

### A9. فلت‌لی جمع‌شونده (کالکشن)
```
Vertical 9:16, top-down. Three garments — a t-shirt, a crewneck sweatshirt, and a hoodie in [COLORS] — slide into frame one by one from different edges and arrange into a neat flat-lay on a [terrazzo] surface, with sneakers and a cap sliding in last. Snappy satisfying motion, soft daylight, editorial style.
[PRESERVATION]
```
> برای این مورد بهتر است عکس فلت‌لی نهایی را **End Frame** بگذاری.

---

<a id="B"></a>
## دسته B: روی مدل و لایف‌استایل

فریم اول: عکس مدل با همان لباس (Virtual Try-On یا عکاسی واقعی).

### B1. واک کوچه تهرانی (Golden Hour)
```
Vertical 9:16. A young [man/woman], [short description: e.g. curly dark hair, silver rings], wearing the [COLOR] oversized [GARMENT] from the reference, walks toward camera through a narrow old Tehran alley with brick walls and a blue wooden door. Camera tracking backward at chest height, 35mm. Golden hour sunlight, warm tones, natural fabric movement with each step. Confident relaxed energy, candid street fashion film.
[PRESERVATION]
```

### B2. فیت‌چک جلوی آینه
```
Vertical 9:16. A young [woman] in the [COLOR] crewneck sweatshirt from the reference stands in front of a full-length mirror in a cozy bedroom, turns slightly left and right checking the fit, then smiles and adjusts the sleeve. Camera static, eye-level, shot from behind her shoulder showing the mirror reflection. Soft warm lamp light, plants, casual Gen-Z vibe.
[PRESERVATION]
```

### B3. کلاه هودی و نگاه به دوربین (قلاب چشمی)
```
Vertical 9:16, medium close-up. A [man] in the [COLOR] hoodie from the reference, hood up, head down. He slowly lifts his head, pulls the hood back with one hand, and looks straight into the lens with a slight smirk. Camera slow push-in. Moody overcast light, cool tones, urban concrete background slightly blurred. Cinematic, 85mm, shallow depth of field.
[PRESERVATION]
```

### B4. کافه و کتاب (برای طرح‌های شعر و ادبیات)
```
Vertical 9:16. A young [woman] wearing the [COLOR] t-shirt from the reference sits by the window of a quiet cafe, reading a Persian poetry book, sips tea from a small glass cup, looks up and smiles softly. Camera slow arc around the table from left to front, ending facing the chest print. Soft window light, warm cozy palette, intellectual calm mood, 50mm.
[PRESERVATION]
```

### B5. پشت‌بام، باد، شب شهر
```
Vertical 9:16. A [man] in the [COLOR] hoodie from the reference stands on a Tehran rooftop at blue hour, city lights and Milad Tower in the soft background. Wind blows through the hoodie strings and fabric. He turns from the skyline to face the camera. Camera slow orbit 90 degrees ending front-facing. Cinematic teal and orange grade, anamorphic look.
[PRESERVATION]
```

### B6. دوستان و خنده (حس جمعی)
```
Vertical 9:16. Three friends wearing matching [COLOR] t-shirts from the reference walk side by side down a tree-lined street in autumn, laughing and bumping shoulders. Camera handheld tracking backward, slight natural shake. Falling yellow leaves, warm afternoon sun. Authentic, joyful, lifestyle brand film.
[PRESERVATION]
```

### B7. اسکیت یا دوچرخه (انرژی)
```
Vertical 9:16. A skater wearing the [COLOR] oversized t-shirt from the reference rolls past the camera in a concrete skatepark, shirt fabric flowing in the wind. Low angle, fisheye-like wide lens, camera pans to follow. Bright afternoon sun, strong shadows, 90s skate video texture.
[PRESERVATION]
```

### B8. استودیو و پرتره پاور
```
Vertical 9:16. A model in the [COLOR] crewneck sweatshirt from the reference stands in a minimal studio with a [solid color] backdrop, arms crossed. She uncrosses her arms, pulls the sleeves up slightly, and strikes a confident pose facing camera. Camera slow push-in from full body to waist-up. Soft beauty dish lighting, editorial fashion campaign.
[PRESERVATION]
```

### B9. باران و پنجره (پاییزی)
```
Vertical 9:16. A young [man] in the [COLOR] hoodie from the reference sits on a windowsill with headphones, rain streaming down the glass, city lights blurred outside. He pulls the hoodie sleeves over his hands and leans his head against the window. Camera static, slight slow push-in. Moody blue light, cozy lo-fi atmosphere. Native audio: soft rain.
[PRESERVATION]
```

---

<a id="C"></a>
## دسته C: ترنزیشن‌ها و ترندهای ویرال

در Kling با **Start Frame + End Frame** بهترین نتیجه را می‌گیرند.

### C1. تعویض لباس با چرخش (Spin Outfit Change)
**Start:** مدل با لباس ساده یا تیشرت سفید. **End:** همان مدل با لباس میزطور.
```
Vertical 9:16. The person spins around quickly once in place; as they complete the spin, their outfit transforms from a plain white tee into the [COLOR] [GARMENT] from the end frame. Camera static, full body. Seamless transition, motion blur during the spin, same room, same lighting. Energetic fashion reel.
[PRESERVATION]
```

### C2. پرتاب لباس به لنز (Throw Transition)
```
Vertical 9:16. The model throws the [COLOR] hoodie straight toward the camera, the fabric fills the entire frame, then the shot reveals the model already wearing it and posing. Camera static. Fast, snappy movement, motion blur on the throw. Bright studio.
[PRESERVATION]
```

### C3. عبور از جلوی لنز (Walk-Through Wipe)
```
Vertical 9:16. The model walks straight into the camera until the dark fabric of the [GARMENT] covers the lens completely, then the camera emerges in a new location: [a sunset beach / snowy street] with the same model wearing the same garment walking away and turning back to look at camera. Smooth cinematic wipe transition.
[PRESERVATION]
```

### C4. قبل و بعد با مورف (قلاب H7)
**Start:** تیشرت ساده خاکستری روی مدل. **End:** همان تیشرت با طرح.
```
Vertical 9:16, medium shot, camera locked. The model stands still and snaps fingers; the plain grey t-shirt transforms into the [COLOR] printed t-shirt from the end frame, the print appearing with a clean ink-spread effect from the center of the chest outward. Studio light unchanged.
```
> در این مورد جمله محافظ را نگذار، چون چاپ باید «ظاهر» شود. طرح نهایی را از End Frame بگیر.

### C5. ترند «کدوم رنگ؟» (Color Switch Beat)
```
Vertical 9:16. The model poses facing camera; with each quick head turn the hoodie color changes instantly: [black] → [cream] → [forest green] → [burgundy], same pose, same framing, beat-synced snappy cuts. Clean studio backdrop.
[PRESERVATION]
```
> بهتر است از ۴ ویدیوی کوتاه جدا با یک ژست بسازی و در CapCut روی بیت کات بزنی.

### C6. زوم بی‌نهایت (Infinite Zoom into Print)
```
Vertical 9:16. Camera continuously zooms into the chest print of the [COLOR] t-shirt; as it gets closer, the artwork of the print becomes a real 3D world [describe world matching the design theme], and the camera flies into it. Seamless, dreamy, surreal transition.
```
> مناسب طرح‌های تصویری مثل فضانورد یا منظره. این پرامپت عمداً روی طرح دست می‌برد، پس فقط برای طرح‌های تصویری از آن استفاده کن، نه نوشتاری.

### C7. فریز فریم پرش (قلاب H9)
```
Vertical 9:16. The model jumps high in the air on a city street; at the peak the motion freezes for a moment with fabric suspended mid-air, then resumes and the model lands with a smile. Low angle, wide lens. Bright daylight, high energy.
[PRESERVATION]
```

### C8. لوپ بی‌درز (Seamless Loop)
```
Vertical 9:16. The model in the [COLOR] crewneck sits on a stool facing camera, looks away to the left, then slowly turns back to the exact same starting pose and gaze. Camera static. The last frame matches the first frame perfectly for a seamless loop.
[PRESERVATION]
```
> نکته: عکس فریم اول را همان End Frame هم بگذار.

---

<a id="D"></a>
## دسته D: اختصاصی تیشرت / دورس / هودی

### تیشرت

**D-T1. تیشرت در باد تابستانی**
```
Vertical 9:16. A [COLOR] oversized cotton t-shirt worn by a model standing on a seaside cliff, strong wind making the loose fabric flutter and ripple around the torso, the print staying facing camera. Camera static, medium shot. Bright midday sun, blue sky, light and breathable feeling.
[PRESERVATION]
```

**D-T2. گردن و بافت پنبه (کیفیت)**
```
Vertical 9:16. Macro close-up of a hand stretching the ribbed collar of a [COLOR] t-shirt and releasing it, the collar snapping back to shape perfectly. Then the camera slides down across the fabric to the chest print. Soft studio light highlighting cotton texture. Quality proof commercial.
[PRESERVATION]
```

**D-T3. اورسایز و استایلینگ لایه‌ای**
```
Vertical 9:16. The model tucks the front of the [COLOR] oversized t-shirt into wide-leg jeans, adjusts it, rolls the sleeves once, and poses. Camera static, full body, clean white studio. Quick styling tutorial vibe.
[PRESERVATION]
```

### دورس (Crewneck)

**D-C1. پوشیدن دورس از روی سر (Pull-On)**
```
Vertical 9:16. A model pulls the [COLOR] crewneck sweatshirt over their head in one smooth motion, shakes their hair out, and smiles at camera. Camera static, medium shot. Warm morning light in a bright apartment. Cozy, comfortable, soft brushed fleece.
[PRESERVATION]
```

**D-C2. دورس روی شانه (استایل preppy)**
```
Vertical 9:16. A [COLOR] crewneck sweatshirt draped over the shoulders of a model wearing a white shirt, sleeves loosely knotted on the chest, walking through a university courtyard with autumn trees. Camera tracking alongside. Soft afternoon light, old-money preppy aesthetic.
```

**D-C3. کاپ دستی و بخار (حس گرما)**
```
Vertical 9:16, close-up. Hands in the sleeves of a [COLOR] crewneck sweatshirt wrap around a steaming mug of tea; steam rises slowly. Camera slowly tilts up to reveal the chest print and the model's calm face. Warm golden interior light, hygge autumn mood.
[PRESERVATION]
```

### هودی

**D-H1. هود بالا با یک حرکت (قلاب)**
```
Vertical 9:16, medium close-up. The model flips the hood of the [COLOR] hoodie up in one sharp confident motion and looks directly into the lens. Slow motion 120fps feel on the hood movement. Moody side light, dark background, street attitude.
[PRESERVATION]
```

**D-H2. کش و بند و جیب کانگورویی (جزئیات)**
```
Vertical 9:16. Sequence of detail close-ups on a [COLOR] hoodie: fingers pull the drawstrings, hands slide into the kangaroo pocket, thumb runs over the ribbed cuff. Camera slow smooth moves. Soft warm studio light, heavy fleece texture, premium feel.
[PRESERVATION]
```

**D-H3. هودی و برف (زمستانی)**
```
Vertical 9:16. A model in the [COLOR] hoodie, hood up, walks through gentle falling snow on a quiet street at night, streetlights glowing. Snowflakes land on the fabric. Camera tracking backward, 35mm. Cold blue night with warm lamp highlights, cinematic.
[PRESERVATION]
```

**D-H4. کپل ست (هودی جفتی)**
```
Vertical 9:16. A couple in matching [COLOR] hoodies from the reference sit back-to-back on a park bench in autumn, then both turn their heads toward camera and smile. Camera slow push-in. Soft golden light, falling leaves, romantic yet casual.
[PRESERVATION]
```

---

<a id="E"></a>
## دسته E: تبلیغ کامل چندشاتی (Multi-Shot 10–15s)

در Kling 3.0 حالت **Multi-Shot** را فعال کن، کادر اصلی را خالی بگذار و هر شات را جدا وارد کن. عکس محصول (جلو و پشت) و عکس مدل را به‌عنوان **Element** اضافه کن.

### E1. معرفی طرح جدید (Drop Launch) · ۱۲ ثانیه
```
Shot 1 (2s): Extreme macro close-up of the chest print ink texture on the [COLOR] t-shirt @element_shirt, dark moody studio, a thin beam of light slowly reveals it.
Shot 2 (3s): Wide shot, a young man with short black hair and a silver chain @element_model wearing @element_shirt steps out of shadow into a spotlight, slow push-in.
Shot 3 (3s): Medium shot, he turns to camera and adjusts the collar, confident smirk, rim light.
Shot 4 (2s): Low angle hero shot, he walks toward camera, fabric moving naturally, haze and backlight.
Shot 5 (2s): Product shot, the t-shirt @element_shirt hangs centered on a black backdrop, spotlight from above, static camera — clean space at the bottom for a logo.
```
> متن فارسی («دراپ جدید میزطور»)، لوگو و قیمت را در CapCut یا با ابزار `render` خود ریپو اضافه کن، نه در Kling.

### E2. داستان یک روز با هودی · ۱۵ ثانیه
```
Shot 1 (3s): Morning, a young woman with long wavy hair @element_model pulls the [COLOR] hoodie @element_hoodie over her head in a sunlit bedroom, static medium shot.
Shot 2 (3s): She walks down a Tehran street with headphones, tracking shot at chest height, autumn leaves.
Shot 3 (3s): Cafe, she laughs with a friend, hands in the hoodie sleeves around a tea glass, slow arc.
Shot 4 (3s): Night rooftop, city lights behind, wind in the hoodie strings, she looks at the skyline.
Shot 5 (3s): Close-up, she turns to camera and smiles, the chest print centered and sharp.
```

### E3. کیفیت‌محور (Why Miztore) · ۱۰ ثانیه
```
Shot 1 (2s): Hands stretch the ribbed cuff of the [COLOR] crewneck @element_sweat and release, it snaps back perfectly. Macro.
Shot 2 (2s): Close-up of fingers running across the soft brushed fleece inside of the sweatshirt.
Shot 3 (3s): The folded sweatshirt is placed into a branded kraft box with tissue paper, top-down.
Shot 4 (3s): A model wearing @element_sweat opens the door of their home and smiles at camera, medium shot, warm light.
```

### E4. سه محصول، یک طرح (کالکشن) · ۱۲ ثانیه
```
Shot 1 (3s): A model @element_model wears the t-shirt @element_tee in a summer park, turns to camera.
Shot 2 (3s): Match cut — same pose, same framing, the model now wears the crewneck @element_sweat in an autumn street.
Shot 3 (3s): Match cut — same pose, the model now wears the hoodie @element_hoodie in light snowfall.
Shot 4 (3s): All three garments hang side by side on a rack, camera slowly dollies across them.
```
> پیام اصلی: «یک طرح، سه فصل». برای طرح‌هایی که هر سه مدل را دارند عالی است.

---

<a id="F"></a>
## دسته F: سبک UGC و موبایلی (حس واقعی و قابل اعتماد)

این سبک در ۲۰۲۶ روی تبلیغات پولی بهتر از ویدیوهای خیلی براق جواب می‌دهد. کلید ماجرا: `shot on iPhone`، `handheld`، `natural light`، `slightly imperfect`.

### F1. آنباکسینگ POV (قلاب H8)
```
Vertical 9:16, POV shot on iPhone, handheld. First-person hands open a kraft mailer package on a bed, pull out a folded [COLOR] hoodie, unfold it and hold it up to the camera showing the chest print. Natural window daylight, casual real-life feel, slight camera shake. Native audio: paper rustle.
[PRESERVATION]
```

### F2. سلفی آینه آسانسور
```
Vertical 9:16, shot on smartphone. A young [woman] takes a mirror selfie in an elevator wearing the [COLOR] crewneck from the reference, shifts her weight, tilts her head, and adjusts the phone angle. Fluorescent light, realistic, candid, unpolished social-media look.
[PRESERVATION]
```

### F3. «اینو از میزطور گرفتم» (حرف زدن با دوربین)
```
Vertical 9:16, selfie-style handheld. A young [man] in the [COLOR] t-shirt from the reference talks excitedly to the phone camera while walking on the street, then points down at the print on his chest and laughs. Natural daylight, authentic vlog style.
[PRESERVATION]
```
> Native Audio را خاموش کن و ویس فارسی واقعی را خودت روی ویدیو بگذار. Kling فارسی را درست لب‌خوانی نمی‌کند.

### F4. واکنش دوست (Reaction)
```
Vertical 9:16, handheld phone. A friend opens a door and sees the model wearing the [COLOR] hoodie, their jaw drops in surprise, they point at the print and both laugh. Casual home hallway, natural light, candid.
[PRESERVATION]
```

### F5. GRWM (آماده شدن با من)
```
Vertical 9:16, phone on a tripod, static. A young [woman] in her room picks the [COLOR] crewneck from a chair, puts it on, adds a necklace and a cap, and poses at the end. Time-lapse-like quick natural motions, soft daylight, relatable Gen-Z aesthetic.
[PRESERVATION]
```

---

<a id="G"></a>
## دسته G: فصلی و مناسبتی ایرانی

| زمان | محصول اصلی | ایده |
|---|---|---|
| مهر (الان) | تیشرت لانگ، دورس | بازگشایی دانشگاه، برگ پاییز |
| آبان و آذر | دورس، هودی | باران، کافه، شب |
| یلدا (۳۰ آذر) | هودی، دورس | انار، کرسی، فال حافظ |
| دی تا بهمن | هودی | برف، زمستان |
| اسفند و نوروز | تیشرت، دورس | خانه‌تکانی، سفره هفت‌سین، هدیه |
| تابستان | تیشرت | ساحل شمال، شب‌های تهران |

### G1. بازگشت به دانشگاه (مهر)
```
Vertical 9:16. A student in the [COLOR] crewneck sweatshirt from the reference walks up the stairs of a university campus with a backpack and books, autumn leaves falling, turns to camera at the top and smiles. Tracking shot from below. Warm autumn afternoon light, fresh-start energy.
[PRESERVATION]
```

### G2. شب یلدا
```
Vertical 9:16. A cozy Yalda night scene: a young [woman] in the [COLOR] hoodie from the reference sits under a traditional korsi blanket, a bowl of red pomegranates and watermelon slices on the table, candlelight. She opens a Hafez poetry book and smiles at camera. Camera slow push-in. Warm red and gold palette, intimate family mood.
[PRESERVATION]
```

### G3. کادوی یلدا یا تولد (Gift Reveal)
```
Vertical 9:16, top-down. Hands untie a red ribbon on a gift box next to pomegranates, lift the lid and pull out a folded [COLOR] crewneck sweatshirt, revealing the print. Candlelight, warm tones, soft bokeh. Native audio: ribbon and paper rustle.
[PRESERVATION]
```

### G4. نوروز و هفت‌سین
```
Vertical 9:16. A young [man] in the [COLOR] t-shirt from the reference sits beside a Haft-Seen table with goldfish bowl, sabzeh and painted eggs, spring sunlight through the window, blossoms outside. He picks up a coin from the table, flips it, and smiles at camera. Camera slow arc. Fresh spring palette.
[PRESERVATION]
```

### G5. شب‌های تابستان تهران (دربند)
```
Vertical 9:16. Friends in [COLOR] t-shirts from the reference walk up the stone steps of Darband at night, string lights and tea houses glowing, the river rushing beside them. Handheld tracking, warm lights, lively summer night atmosphere.
[PRESERVATION]
```

### G6. جمعه‌بازار یا بازار قدیم
```
Vertical 9:16. A model in the [COLOR] hoodie from the reference walks through the vaulted brick corridors of an old Persian bazaar, light shafts falling from the domed ceiling, spice stalls on the sides. Camera tracking backward, 35mm. Warm dusty light, cinematic cultural fashion film.
[PRESERVATION]
```

---

<a id="H"></a>
## دسته H: سورئال و اسکرول‌استاپ (قلاب قوی، برای جذب مخاطب سرد)

این نوع ویدیوها در ۲۰۲۶ روی اکسپلور خیلی جواب می‌دهند، چون مخاطب مطمئن نیست «واقعی است یا نه» و دوباره نگاه می‌کند.

### H1. تیشرت غول‌پیکر روی ساختمان (قلاب H10)
```
Vertical 9:16. A gigantic [COLOR] t-shirt hangs from the top of a Tehran high-rise building like a banner, its print facing the street, wind rippling the huge fabric. People below look up and take photos. Camera slow drone pull-back. Realistic, daylight, surreal advertising stunt (CGI fashion ad style).
[PRESERVATION]
```

### H2. مینیاتوری روی تیشرت
```
Vertical 9:16. Tiny miniature people climb and walk across a giant [COLOR] t-shirt lying on a table, one tiny person paints the last detail of the print with a brush, then steps back admiring it. Macro tilt-shift look, soft studio light, whimsical.
[PRESERVATION]
```

### H3. هودی از ابر (سافت و نرم)
```
Vertical 9:16. A fluffy white cloud floating in a pastel sky slowly transforms and condenses into a soft [COLOR] hoodie that gently drifts down into the model's open hands. Dreamy, soft light, slow magical motion, emphasizing softness.
```
> چون لباس از ابر «ساخته» می‌شود، طرح را از End Frame بگیر.

### H4. اسکیلی نرم (Fabric Jelly / Squish) ترند ASMR
```
Vertical 9:16, close-up. A hand presses down on a folded [COLOR] crewneck sweatshirt and it squishes softly like a marshmallow, then slowly bounces back into shape. Studio light, satisfying ASMR aesthetic. Native audio: soft squish.
[PRESERVATION]
```

### H5. لباس در آب (زیر آب)
```
Vertical 9:16. A [COLOR] t-shirt floats underwater, fabric billowing gracefully in slow motion, light rays from the surface dancing across it, tiny bubbles rising. Camera slow drift. Ethereal, calm, cinematic.
[PRESERVATION]
```

### H6. طرح زنده می‌شود (فقط طرح‌های تصویری)
```
Vertical 9:16, medium shot, camera static. The illustration printed on the [COLOR] t-shirt comes alive subtly: [describe small motion, e.g. the astronaut in the print waves / the stars twinkle], while the rest of the shirt and the model stay still. Magical realism, clean studio.
```
> برای طرح «فضانورد و زمین» و طرح‌های تصویری مشابه عالی است. برای طرح‌های نوشتاری استفاده نکن.

---

<a id="N"></a>
## ۱۱. نگاتیو پرامپت‌ها و رفع خطا

**نگاتیو پیش‌فرض لباس (۸ مورد):**
```
warped print, morphing text, extra letters, distorted logo, extra fingers, deformed hands, flickering fabric, blurry
```

**نگاتیو برای مدل:**
```
plastic skin, face change, identity drift, sliding feet, extra limbs, jittery eyes
```

| مشکل | راه‌حل |
|---|---|
| طرح یا نوشته موج برمی‌دارد | حرکت دوربین را static یا slow push-in کن. جمله محافظ را بگذار. فریم آخر را End Frame بگذار. مدت را از ۱۰ به ۵ ثانیه کم کن |
| طرح از جلو به پشت یا پهلو می‌رود و عوض می‌شود | چرخش را محدود کن (`turns 30 degrees`). عکس پشت لباس را هم Element کن |
| صورت مدل عوض می‌شود | مدل را در Shot 1 کامل توصیف کن. Element مدل را اضافه کن. `stable face, same identity` |
| پارچه لاستیکی یا پلاستیکی است | جنس را بنویس: `heavyweight cotton`، `soft brushed fleece`. حالت Professional را روشن کن |
| رنگ لباس عوض می‌شود | رنگ را دقیق و یکسان در همه شات‌ها بنویس. `color stays exactly [COLOR]` |
| حرکت خیلی شلوغ است | در هر شات یک اکشن. «و بعد…» را حذف کن |
| دست‌ها خراب می‌شوند | دست را از کادر بیرون نگه دار یا `hands in pockets` |

---

<a id="P"></a>
## ۱۲. سناریوی هفتگی پیشنهادی (۴ ریل در هفته)

| روز | هدف | پرامپت پیشنهادی | متن روی صفحه |
|---|---|---|---|
| شنبه | جذب (اکسپلور) | H1، H4 یا A2 | قلاب سؤالی |
| دوشنبه | معرفی طرح | E1 یا A3 + B3 | معنی و داستان طرح (از `design-notes.json`) |
| چهارشنبه | اعتماد | F1 یا E3 | کیفیت، ارسال، سایز |
| جمعه | ترند و سرگرمی | C1، C4 یا C5 | «کدوم رنگ؟» و CTA کامنت |

**پس از ساخت در Kling:**
1. موزیک ترند را **داخل اینستاگرام** اضافه کن (دسترسی بیشتری می‌گیرد).
2. متن فارسی قلاب را در ۱ ثانیه اول بزرگ و وسط کادر بگذار (Safe Zone: از پایین حدود ۲۰٪ و از بالا حدود ۱۰٪ خالی بماند).
3. آخر ویدیو یک CTA بگذار: «کامنت کن "طرح" تا لینک بفرستم» (دایرکت خودکار) یا «لینک در بیو».
4. کپشن را **سئومحور** بنویس، با کلمات «هودی طرح‌دار، تیشرت فارسی، دورس اورسایز»، چون در ۲۰۲۶ کپشن‌ها در جستجوی اینستاگرام ایندکس می‌شوند.

---

<a id="S"></a>
## ۱۳. منابع

- [Kling 3.0 Prompting Guide — fal.ai](https://blog.fal.ai/kling-3-0-prompting-guide/)
- [Kling 3.0 Prompt Guide — Atlabs AI](https://www.atlabs.ai/blog/kling-3-0-prompting-guide-master-ai-video-generation)
- [16 Kling 3.0 Prompt Examples — Atlabs AI](https://www.atlabs.ai/blog/kling-3-prompt-examples-templates)
- [Kling 3.0 Multi-Shot Tutorial — The Design Inspiration](https://thedesigninspiration.com/news/tech/kling-3-0-tutorial-crafting-the-perfect-multi-shot-prompt/)
- [Kling 3.0 Prompt Guide: Multi-Shot — VIDEOAI.ME](https://videoai.me/blog/kling-3-0-prompt-guide)
- [Best Kling AI Prompts: 50 Examples — VIDEOAI.ME](https://videoai.me/blog/best-kling-ai-prompts)
- [Kling AI Prompts Complete Guide — VEED](https://www.veed.io/learn/kling-ai-prompting-guide)
- [Kling AI Fashion Video Guide — CrePal](https://crepal.ai/blog/aivideo/kling-fashion-video-guide/)
- [Kling Image-to-Video Prompts for Product Ads — Masonry](https://masonry.so/blog/introducing-kling-3-best-prompts-and-examples)
- [How to Animate Your Logo — Kling AI](https://kling.ai/topics/animate-logo-ai)
- [Character Consistency in Kling 3.0 I2V — Atlas Cloud](https://www.atlascloud.ai/blog/tips/solving-character-inconsistency-a-guide-to-kling-3.0-image-to-video-mode)
- [Fashion Model 360 Video with Kling 3 — Uwear](https://uwear.ai/blog/how-to-generate-fashion-model-360-video)
- [AI Outfit Transition Videos — The New Black](https://thenewblack.ai/blog/outfit-transition-videos-fashion)
- [15 AI Fashion Video Ideas (2026) — GenImagePro](https://genimagepro.com/blog/ai-fashion-video-ideas)
- [Instagram Reel Trends 2026 — The Social Content Factory](https://thesocialcontentfactory.com/reel-trends)
- [Streetwear Trends 2026 — Printify](https://printify.com/blog/streetwear-fashion-trends/)
