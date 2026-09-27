# ریل «ترنزیشن با پره پنکه» در Kling

**منبع:** فایل `nhance_seedance_concept.pdf` (کانسپت nhance.ai برای Seedance 2.5)
**ایده:** یک دختر روی فرش ایرانی دراز کشیده و دوربین کاملاً از بالا (top-down) نگاهش می‌کند. هر بار که پره پنکه جلوی لنز رد می‌شود، لباسش عوض شده است. در کل ۴ لوک در ۱۵ ثانیه نمایش داده می‌شود.

---

## چند عکس لازم است؟

| روش | عکس لازم | کیفیت |
|---|---|---|
| **روش ۱: Start/End Frame** (پیشنهادی) | **۴ عکس کلیدی از بالا**: همان دختر، همان فرش، همان ژست، هر کدام با یک لوک. ۴ عکس ایستاده PDF فقط مرجع ساختن این‌ها هستند | بهترین. لباس و صورت ثابت می‌مانند |
| **روش ۲: Multi-Shot و Element** در Kling 3.0 / O1 | **۴ عکس لوک** (همین‌هایی که در PDF هست) به‌همراه **۱ عکس صحنه** (فرش از بالا). جمعاً ۵ تا | سریع‌تر، ولی احتمال به‌هم‌ریختن جزئیات لباس بیشتر است |

**جواب کوتاه:** ۴ عکس مرجع لوک‌ها را همین حالا داری. از PDF بیرون کشیده شده‌اند و در همین پوشه‌اند (`look01.png` تا `look04.png`). برای نتیجه خوب در Kling باید با آن‌ها **۴ عکس کلیدی از بالا** هم بسازی. اگر با روش ۲ بروی، به‌جای آن ۱ عکس صحنه لازم است.

| فایل | لوک |
|---|---|
| `look01.png` | پیراهن کوتاه مشکی یقه‌اسکی |
| `look02.png` | بوهو: کلاه باکت خزدار، تاپ توری سفید، جین گشاد پاره |
| `look03.png` | کرست زری‌دوزی و پالتو خز قهوه‌ای |
| `look04.png` | تمام‌مشکی: برت، بافت، شلوار چرم |

---

## مرحله ۱: ساختن ۴ عکس کلیدی از بالا

این کار را با Kling Image O1، Nano Banana یا هر مدل تصویری که Reference می‌گیرد انجام بده. برای هر لوک، عکس `lookXX.png` را Reference بده و این پرامپت را بزن. ژست در هر ۴ عکس باید **دقیقاً یکی** باشد. بهترین راه این است که عکس کلیدی اول را هم Reference دوم بدهی.

> ریلز اینستاگرام 9:16 است. کانسپت اصلی 16:9 بود، ولی چون دختر دراز کشیده، در قاب عمودی (سر بالا، پا پایین) خیلی بهتر جا می‌شود. پرامپت‌ها برای 9:16 نوشته شده‌اند. اگر 16:9 خواستی، بنویس `head toward the left, feet toward the right`.

```
Top-down overhead photo, camera looking straight down, vertical 9:16 frame. The same young East Asian woman from the reference image lies flat on her back on a large ornate Persian rug (deep red, brown and cream medallion pattern) that fills the entire frame. Her body is aligned vertically: head near the top, feet near the bottom, full body visible. Her face points straight up into the lens with a calm, confident gaze. One arm relaxed at her side, the other hand resting on her stomach holding a small black fan remote. Legs straight and together. She wears exactly the outfit from the reference image: [LOOK DESCRIPTION]. A dark red velvet sofa arm is visible along the bottom edge of the frame. Soft warm directional light from the upper right, soft shadows. Sharp winged eyeliner, glossy nude-pink lips, gold hoop earrings. Photorealistic, high-resolution fashion editorial.
```

جای `[LOOK DESCRIPTION]`:

- **K1:** `fitted black turtleneck short-sleeve mini dress with button detail down the front and a slightly flared pleated hem, bare legs, barefoot, dark hair in a sleek low bun`
- **K2:** `white fuzzy shearling bucket hat, semi-sheer white lace long-sleeve knit top, light blue wide-leg ripped denim jeans, leopard-print pointed shoes, soft wavy dark hair worn down; a black leather tote bag with a blue webbed strap lies on the rug beside her leg`
- **K3:** `strapless dark floral brocade corset with gold-and-beige jacquard pattern, a huge oversized brown fur coat open and spilling loosely around her arms onto the rug, tailored black trousers, black pointed-toe heels, dark wavy hair worn loose`
- **K4:** `black beret, black ribbed long-sleeve sweater, black leather trousers, black ankle boots, sleek dark hair; a small red-and-black handbag lies on the rug beside her hand`

---

## مرحله ۲ (روش ۱، پیشنهادی): ۴ کلیپ با Start/End Frame

در Kling، Image-to-Video را باز کن، 9:16 و حالت Professional را انتخاب کن و **Start Frame** و **End Frame** را بده. آخر هم ۴ کلیپ را در CapCut پشت هم بگذار (حدود ۱۵ ثانیه).

### کلیپ A · ۵ ثانیه · Start: K1 · End: ندارد
```
Static top-down overhead camera, completely locked, no pan, no zoom. The woman lies still on the Persian rug looking straight up into the lens, subtle natural breathing only. After a moment she lifts the small black remote slightly toward the upper foreground and presses the button once with her thumb, eyes staying on the lens. In the last second, the rounded hub and one tapering blade of a ceiling-style fan creep into the very top edge of the frame, very close to the lens and softly out of focus, starting to rotate slowly.
```

### کلیپ B · ۵ ثانیه · Start: K1 · End: K2
```
Static top-down overhead camera, completely locked. In the near foreground, very close to the lens and heavily out of focus, one dark tapering fan blade sweeps slowly across the frame from top to bottom in a smooth circular arc, passing over her head, torso, then legs. As the blurred blade passes over each part of her body, that part is revealed already changed into the new outfit of the end frame: white shearling bucket hat, white lace top, light blue ripped wide-leg jeans, leopard shoes, black tote bag beside her leg. Her pose, hands and face stay exactly the same. The blade exits the frame and she holds still, eyes on the lens, natural breathing. One continuous shot, smooth motivated transition.
```

### کلیپ C · ۵ ثانیه · Start: K2 · End: K3
```
Static top-down overhead camera, completely locked. The out-of-focus fan blade re-enters from the top in the same slow rotational arc, very close to the lens, and sweeps across her whole body. As it clears each part she is revealed in the end-frame outfit: strapless gold-and-black brocade corset, huge open brown fur coat spilling around her arms onto the rug, black trousers, black pointed heels; the bucket hat and tote bag are gone, hair now loose and wavy. Her body and hands stay motionless. The blade exits and she holds still, calm gaze into the lens.
```

### کلیپ D · ۵ ثانیه · Start: K3 · End: K4
```
Static top-down overhead camera, completely locked. The blurred fan blade sweeps across the frame one last time in the same slow arc. As it clears each part she is revealed in the end-frame outfit: black beret, black ribbed sweater, black leather trousers, black ankle boots, a small red-and-black handbag on the rug beside her hand; the corset and fur coat are gone. The blade exits. She lies fully still, remote loosely in her hand, calm direct eye contact with the lens. Camera holds static, clip ends on the held frame.
```

**نگاتیو پرامپت (برای همه کلیپ‌ها):**
```
camera movement, zoom, shake, jump cut, glitch, flash frame, digital distortion, face change, warped body, text, logo, watermark
```

---

## مرحله ۲ (روش ۲): یک ویدیوی ۱۵ ثانیه‌ای Multi-Shot

برای **Kling 3.0 Omni / O1** با Reference است. ۴ عکس لوک را به‌عنوان `@look1` تا `@look4` و عکس فرش از بالا را به‌عنوان `@scene` بارگذاری کن. Kling حداکثر **۶ شات** و حدود **۲۵۰۰ کاراکتر** قبول می‌کند، برای همین ۱۴ شات PDF در ۶ شات خلاصه شده است.

```
Shot 1 (3s): Vertical 9:16, fixed static top-down camera looking straight down at the young East Asian woman from @look1, lying flat on her back on the ornate red-brown-cream Persian rug from @scene, head at top, feet at bottom, wearing the black turtleneck mini dress from @look1, sleek low bun, gold hoops, winged eyeliner. She settles flat, one hand on her stomach, gazing up into the lens. A small black fan remote lies by her hand. Dark red velvet sofa arm at the bottom edge. Warm light from upper right.
Shot 2 (2s): Same static camera. She picks up the remote, aims it toward the upper foreground and presses once. The hub and one blurred fan blade creep in at the top edge, very close to the lens.
Shot 3 (3s): Same static camera. The out-of-focus blade sweeps slowly top to bottom across her body; as it passes she is revealed in the outfit from @look2. Pose unchanged. She holds still.
Shot 4 (2.5s): Same static camera. The blade sweeps again; she is revealed in the brocade corset and oversized brown fur coat from @look3, fur spilling onto the rug. Pose unchanged.
Shot 5 (2.5s): Same static camera. The blade sweeps a final time; she is revealed in the all-black outfit with beret and red-and-black handbag from @look4.
Shot 6 (2s): Same static camera. She lies fully still, remote loosely in hand, calm direct eye contact, natural breathing. Clip ends on the held frame.
```
> در همه شات‌ها: same face, same pose, camera never moves, no text, no glitch.

---

## پرامپت اصلی PDF (کامل و دست‌نخورده، برای Seedance و آرشیو)

<details>
<summary>باز کن</summary>

**Master Prompt — 16:9**

Horizontal 16:9 cinematic video, 15 seconds, shot from a fixed static overhead camera angle looking straight down at a woman lying flat on her back on a large ornate Persian-style rug (deep red, brown and cream medallion pattern), her body oriented horizontally across the wide frame, head toward the left side, feet toward the right, so her full body fits within the landscape composition. The rug fills the frame and, combined with the top-down angle, creates an optical illusion of a patterned wall behind her rather than a floor beneath her. A dark red velvet sofa arm is visible along the lower edge of frame, grounding the "wall" illusion. Soft warm directional light rakes across the rug from the upper right, casting soft shadows. In the near foreground, close to the camera lens and slightly out of focus, one blade of a slow-spinning three-blade fan sweeps in and out of frame in a circular arc — the fan itself is never fully shown, only the rounded motor hub and one tapering blade passing through the portion of frame closest to the lens. The subject is a young East Asian woman with sleek dark hair, sharp winged eyeliner, glossy nude-pink lips, warm glowing skin, and gold hoop earrings, matching the same face and features consistently in every shot. No on-screen text, no logos, no captions, no watermarks appear at any point. No glitch effects, no flash frames, no digital distortion, no warping — every change in her outfit happens smoothly and is fully motivated by the fan blade physically passing in front of the lens and briefly occluding her body; the moment the blade clears, the new outfit is simply already there, as a clean continuous shot.

**SHOT 1 — 0:00–0:00.8s — Settling into frame:** She is mid-motion, having just lain back onto the rug a beat before the clip starts, positioned horizontally with her head to the left of frame and feet extending right. Her upper body is turned slightly on her side, dark hair pulled into a low sleek bun. Her hand nearest the top of frame is raised near her temple, fingers lightly touching her hairline as if smoothing a loose strand; her other forearm is bent across her body, hand resting near her ribcage. One knee is bent, foot flat, as if she's still settling her legs into place. She wears a fitted black turtleneck short-sleeve mini dress with a slightly flared pleated hem.

**SHOT 2 — 0:00.8–0:01.6s — Body settles flat:** Her bent leg straightens and lowers to the rug; both legs now lie flat, together, bare and barefoot, extending toward the right edge of frame. Her raised hand lowers from her hair to rest gently on her stomach. Her head tilts back fully so her face points straight up into the lens. Full body now visible left to right: black mini dress, arms relaxed, one hand on stomach.

**SHOT 3 — 0:01.6–0:02.8s — Static hold, Look 1:** She holds completely still, gazing directly up into the camera with a calm, confident expression. Small natural breathing movement only. A small black fan remote rests on the rug beside her hand.

**SHOT 4 — 0:02.8–0:04.0s — Picking up the remote:** Her hand's fingers curl around the remote control and lift it slowly off the rug to roughly chest height, elbow bending while her shoulder stays grounded. Her thumb shifts on top of the remote as if about to press a button.

**SHOT 5 — 0:04.0–0:04.6s — Pressing the button:** Her thumb presses down once. Her wrist tilts slightly, aiming the remote toward the upper foreground where the fan is implied to be, just off-camera. Eyes stay on the lens.

**SHOT 6 — 0:04.6–0:05.0s — Fan begins to turn:** In the near foreground, softly out of focus, the rounded hub end of a fan blade creeps into the edge of frame from the top, moving slowly, confirming the fan has started rotating. Only this one blade's tip enters; the rest of the fan stays unseen.

**SHOT 7 — 0:05.0–0:06.4s — First blade sweep (transition to Look 2):** The fan blade swings slowly across the frame on a diagonal arc, foreground-blurred, hub-end leading, tapering tip trailing — entering from the top and sweeping across toward the bottom, passing over her body along its horizontal length in one smooth continuous motion, moving left to right over head, torso, then legs. As the blade's soft-focus silhouette passes over each part, that part is revealed already changed the instant the blade clears it: her bun becomes soft wavy hair worn down under a white fuzzy shearling bucket hat; her black dress becomes a semi-sheer white lace long-sleeve top; her legs are now covered by light blue wide-leg distressed denim jeans; her feet are now in leopard-print pointed shoes; a black leather tote bag with a blue webbed strap appears resting on the rug beside her leg. Her pose and hand positions stay exactly the same throughout — the only motion on screen is the blade passing through the foreground.

**SHOT 8 — 0:06.4–0:08.0s — Static hold, Look 2:** Fan blade has exited frame. She lies fully still in the new outfit, eyes on camera, same calm expression, subtle breathing motion only.

**SHOT 9 — 0:08.0–0:08.6s — Second blade sweep begins:** The fan blade re-enters from the top again, same slow rotational arc, hub leading, drifting into the near-foreground blur exactly as before.

**SHOT 10 — 0:08.6–0:10.0s — Transition to Look 3:** The blade sweeps across her body in the same smooth path. As it passes: her hair changes to dark wavy hair worn loose; the bucket hat is gone; her top becomes a strapless dark floral brocade corset with gold-and-beige jacquard pattern; a large, oversized brown fur coat is now draped open over her shoulders, its wide voluminous sleeves and thick heavy body spilling loosely past her arms onto the rug; her jeans become tailored black trousers; her leopard shoes become black pointed-toe heels; the tote bag is gone. Her body and hands remain motionless throughout.

**SHOT 11 — 0:10.0–0:11.6s — Static hold, Look 3:** She holds still in the fur-and-corset look, the heavy fur coat's edges settled naturally around her arms and shoulders, eyes calmly on the lens.

**SHOT 12 — 0:11.6–0:12.2s — Third blade sweep begins:** The fan blade re-enters the foreground a third time from the top, same unhurried rotational arc.

**SHOT 13 — 0:12.2–0:13.6s — Transition to Look 4:** The blade sweeps across her body once more. As it clears each section: her hair is swept back under a black beret; the corset and fur coat are replaced by a black ribbed long-sleeve sweater; her trousers become black leather trousers; her heels become black ankle boots; a small red-and-black handbag appears resting on the rug beside her hand. Same smooth, motivated, glitch-free reveal.

**SHOT 14 — 0:13.6–0:15.0s — Final static hold, Look 4:** She lies fully still in the all-black look, one hand resting near the small red-and-black bag as if having just set it down, the other hand still holding the fan remote loosely at her side. Calm, direct eye contact with the lens. Camera holds static, no pan/zoom/shake, natural soft breathing motion only, clip ends on this held frame.

**Negative / Technical Notes:** 16:9 aspect ratio. No on-screen text or logos. No jump cuts. No glitch or digital tearing effects. No flash frames. No warping of face or body proportions between shots. Consistent facial identity and lighting throughout. Camera remains completely static except for the fan blade's natural motion in the foreground.

**Image Prompts (Look 01–04):** همان متن‌هایی است که در صفحه‌های ۲ تا ۵ PDF آمده. ۴ عکس نتیجه‌اش `look01.png` تا `look04.png` است.

</details>

---

## نسخه میزطوری همین کانسپت (پیشنهاد)

فرش ایرانی از قبل در کانسپت هست و به برند میزطور خیلی می‌خورد. کافی است ۴ لوک را با محصولات خودت عوض کنی:

1. تیشرت طرح‌دار با شلوار جین
2. دورس با شلوار کتان
3. هودی با شلوار اسلش
4. لانگ‌اسلیو یا ست کاپل

برای هر کدام، در مرحله ۱ به‌جای `lookXX.png` **عکس واقعی محصول روی مدل** را Reference بده تا طرح فارسی سالم بماند. چون پره پنکه جلوی لنز رد می‌شود و طرح را لحظه‌ای می‌پوشاند، این کانسپت برای حفظ طرح لباس خیلی امن است: طرح هیچ‌وقت در حال تغییر شکل دیده نمی‌شود.
