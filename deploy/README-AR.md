# دليل تثبيت وتحديث ERP على السيرفر (بدون إنترنت)

**الفكرة:** ملف واحد تضغط عليه دبل كليك: `install-or-update.bat`.
بيعرف لوحده هل ده تثبيت جديد ولا تحديث، ويشتغل بخطوات مرقمة [1/6] لـ [6/6].
في أول التشغيل بيسألك على اللغة: `1` English (الافتراضي بعد 10 ثواني) أو `2` عربي. في وضع العربي كل الرسايل المهمة (البداية، النجاح، وكل خطأ مع حله) بتظهر في **نافذة منبثقة** مرتبة من اليمين لليسار صح. الشاشة السوداء بتفضل بخطوات إنجليزي قصيرة لأن cmd مبتعرضش العربي صح. النسخة الإنجليزي: `README-EN.md`.

> **قاعدة ذهبية:** الداتا في volume اسمه `erp_sql_data`. السكربت مبيمسحوش أبداً.
> وانت كمان **ماتكتبش أبداً**: `docker compose down -v` أو `docker volume rm` أو `docker system prune --volumes`.

---

## أولاً: على جهاز التطوير (اللي عليه إنترنت و Docker)
| # | الأمر | بيعمل إيه |
|---|---|---|
| 1 | `git pull` | ياخد آخر كود من main |
| 2 | `cd deploy` ثم `powershell -ExecutionPolicy Bypass -File .\build-images.ps1 -Version 2.1` | يبني الـ API والواجهة ويطلّع ملف `erp-images-2.1.tar` جوه فولدر deploy (غيّر الرقم كل مرة) |
| 3 | انسخ **فولدر deploy كله** على الفلاشة | |

نجاح: لقيت `erp-images-2.1.tar` جوه deploy ورسالة `DONE`.

## ثانياً: على السيرفر (192.168.1.5)
1. انسخ فولدر deploy من الفلاشة لمكان ثابت مثلا `C:\ERP\deploy` (نفس المكان كل مرة).
2. شغّل Docker Desktop واستنى لحد ما يقول إنه شغال.
3. دبل كليك على **install-or-update.bat**.
4. استنى الخطوات. أول مرة تحميل الصور ممكن ياخد كام دقيقة.

### إيه اللي بيحصل في كل خطوة
| الخطوة | بتعمل إيه | النجاح شكله إيه |
|---|---|---|
| [1/6] Docker | يتأكد إن Docker شغال | `OK Docker is running` |
| [2/6] Install type | يحدد تثبيت جديد ولا تحديث ويفحص ملف `.env` | `Mode: FRESH INSTALL` أو `Mode: UPDATE` |
| [3/6] Backup | في التحديث بس: نسخة احتياطية في `C:\ERP_backup` (لازم تنجح وإلا يقف) | `Backup verified: MiniErp_....bak` |
| [4/6] Load images | يحمّل الصور من ملف tar | `Images ready` |
| [5/6] Start | يشغّل الخدمات (في التحديث: API والواجهة بس، قاعدة البيانات مبتتلمسش) | `Containers started` |
| [6/6] Health | يستنى لحد 5 دقايق لحد ما النظام يجهز | `System is ready` ثم مربع **SUCCESS** |

في الآخر بيطلّع ملخص: الإصدار، الروابط، مكان النسخة الاحتياطية، ومكان ملف اللوج (`erp-install-....log` جنب السكربت).
افتح `http://localhost` (أو `http://192.168.1.5` من أي جهاز تاني).

### ملف `.env` (الأسرار)
- **تثبيت جديد:** مش محتاج تعمل حاجة. السكربت بيعمل `.env` لوحده بباسورد ومفتاح JWT قويين ومبيعرضهمش. **انسخ `.env` في مكان خاص** (مش على git ومش في شات).
- **تحديث على نظام شغال:** السكربت **مبيعملش** أسرار جديدة (هتبوّظ الدخول على القاعدة). لو `.env` ناقص هيقف ويقولك تفتح الملف بالنوتباد وتكتب سطرين بإيدك بنفس قيم `.env` القديم:
  `SQL_SA_PASSWORD=...` و `JWT_SIGNING_KEY=...` ثم تشغّل تاني. **ماتبعتهمش لحد أبداً.**

---

## التحديث المرة الجاية
نفس الخطوات: (جهاز التطوير: `git pull` + `build-images.ps1 -Version 2.2`) ثم انسخ deploy للفلاشة، وعلى السيرفر انسخه فوق القديم (سيب `.env`)، ودبل كليك على `install-or-update.bat`. بياخد نسخة احتياطية لوحده قبل أي تحديث.

## لو حصل خطأ
السكربت بيقف بمربع أحمر **STOPPED** وبيقول "What to do next". مفيش حاجة بتتمسح. أشهر الحالات:
| الرسالة | الحل |
|---|---|
| `Docker is not running` | شغّل Docker Desktop، استنى، شغّل تاني |
| `No erp-images-*.tar file found` | انسخ ملف الـ tar من الفلاشة جنب السكربت |
| `.env is missing the existing secrets` | افتح `.env` بالنوتباد واكتب السطرين بنفس قيم القديم |
| `Backup failed` | تأكد إن `erp-db` شغال وفيه مساحة على القرص، وشغّل تاني |
| `database volume with another name` | وقّف. ده معناه تثبيت قديم باسم مختلف. ابعت الاسم اللي ظهر |
| `The API did not become ready` | ابعت ملف اللوج وآخر سطور الـ API اللي ظهرت. متمسحش حاجة |

## الرجوع لإصدار أقدم (الكود بس)
الصور القديمة بتفضل على السيرفر. افتح `.env` وغيّر سطر `ERP_VERSION=` للرقم القديم (مثلا 2.0) ثم من فولدر deploy:
`docker compose -p erp up -d --no-deps api frontend`
(تعديلات القاعدة إضافية بس، فالكود القديم بيشتغل عليها.)

## استرجاع نسخة احتياطية (طوارئ فقط)
**ابعتلي الأول قبل ما تعمله.** بيستبدل الداتا الحالية بنسخة قديمة. الخطوات:
1. خد نسخة جديدة الأول: `powershell -ExecutionPolicy Bypass -File .\backup.ps1`
2. `docker stop erp-api erp-frontend`
3. `docker cp C:\ERP_backup\MiniErp_XXXX.bak erp-db:/var/opt/mssql/backup/restore.bak`
4. `docker exec erp-db /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "<SQL_SA_PASSWORD>" -C -Q "ALTER DATABASE MiniErp SET SINGLE_USER WITH ROLLBACK IMMEDIATE; RESTORE DATABASE MiniErp FROM DISK='/var/opt/mssql/backup/restore.bak' WITH REPLACE; ALTER DATABASE MiniErp SET MULTI_USER;"`
5. `docker start erp-api erp-frontend` وتأكد من `http://localhost:8080/health/ready`.

## نسخة احتياطية يدوية في أي وقت
`powershell -ExecutionPolicy Bypass -File .\backup.ps1` (بتتحفظ في `C:\ERP_backup` وبتحتفظ بآخر 14 يوم).

---

**صراحة:** السكربتات مكتوبة ومتراجعة، لكن **لسه متجربتش على Docker حقيقي بالكامل**. أول تشغيل على السيرفر شغّله وانت واقف عليه، وبعد أي مشكلة ابعت ملف اللوج.
