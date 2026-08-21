# FluentEnglishTutor Bot — Admin အသုံးပြုနည်း

**Version:** လက်ရှိ GitHub `main` branch အခြေအနေအတိုင်း

ဤလမ်းညွှန်စာအုပ်သည် `@fluent_eng_tutor_bot` ကို စီမံခန့်ခွဲပေးမည့် သတ်မှတ်ထားသော Admin အတွက် ဖြစ်ပါသည်။ Admin သည် User များ၏ Premium အခြေအနေကို ကိုယ်တိုင်ဖွင့်ပေးနိုင်ခြင်း၊ Classroom ဖန်တီးခြင်း၊ ကျောင်းသားတိုးတက်မှုကြည့်ခြင်းနှင့် Bot ၏ production အခြေအနေစစ်ခြင်းတို့ကို လုပ်ဆောင်နိုင်ပါသည်။

> **အရေးကြီးသော လုံခြုံရေးစည်းကမ်း:** Telegram `BOT_TOKEN`, `GEMINI_API_KEY`, Firebase Service Account JSON နှင့် Render secrets များကို မည်သူ့ကိုမျှ မပို့ပါနှင့်။ Admin အသုံးပြုရန် Telegram account ID နှင့် Server တွင်သတ်မှတ်ထားသော `ADMIN_ID` တူရပါမည်။

## ၁။ Admin ဖြစ်ကြောင်း သတ်မှတ်သည့် စနစ်

Bot သည် Telegram user ၏ numeric ID ကို Server environment ထဲက `ADMIN_ID` နှင့် နှိုင်းယှဉ်ပါသည်။ ID တူသော account တစ်ခုတည်းကိုသာ Admin အဖြစ် သတ်မှတ်ထားပါသည်။ Admin Center ခလုတ်ပေါ်လာခြင်းသည် သတ်မှတ်ချက်မှန်ကြောင်း သိနိုင်သည့် အချက်တစ်ခုဖြစ်ပါသည်။

သာမန် User များသည် Admin Center ခလုတ်ကို မမြင်ရပါ။ သူတို့က `/admin`, Classroom ဖန်တီးခြင်း၊ Student Dashboard ကြည့်ခြင်း သို့မဟုတ် Premium ဖွင့်ခြင်းကို စာသားဖြင့် ကိုယ်တိုင်ရိုက်ပို့လျှင်လည်း Server ဘက်က ပိတ်ပင်ပါသည်။ UI ခလုတ်ကို ဖျောက်ထားရုံသာမဟုတ်ဘဲ Server-side authorization ပါ ထည့်ထားပါသည်။

## ၂။ ပထမဆုံး Admin စစ်ဆေးရမည့်အရာများ

Render တွင် Deploy ပြီးတိုင်း အောက်ပါအချက်များကို စစ်ပါ။

| စစ်ရမည့်အရာ | မှန်ကန်ရမည့်အခြေအနေ |
|---|---|
| Service status | Render service သည် `Live` ဖြစ်ရမည် |
| Health URL | `https://your-service-name.onrender.com/` ကို ဖွင့်၍ JSON ပြရမည် |
| `status` | `ok` ဖြစ်ရမည် |
| `firebase` | Production တွင် `enabled` ဖြစ်သင့်သည် |
| AI counters | `requests`, `successes`, `failures`, `fallbackAttempts` စသည့် safe metrics များ ပေါ်ရမည် |
| Telegram polling | Bot token တစ်ခုကို Production service နှစ်ခုတွင် တစ်ပြိုင်နက် မသုံးရပါ |

Health response ဥပမာမှာ အောက်ပါပုံစံ ဖြစ်ပါသည်။

```json
{
  "status": "ok",
  "service": "english-tutor-bot",
  "firebase": "enabled",
  "ai": {
    "requests": 0,
    "successes": 0,
    "failures": 0,
    "fallbackAttempts": 0
  }
}
```

`firebase` သည် `memory-fallback` ဖြစ်နေပါက Bot သည် ခဏသုံး၍ရနိုင်သော်လည်း Render restart ဖြစ်သည့်အခါ Premium, daily usage, progress နှင့် classroom data တချို့ မတည်မြဲနိုင်ပါ။ Production တွင် Firebase credential ကို ပြန်စစ်ပြီး `enabled` ဖြစ်အောင်လုပ်ပါ။

## ၃။ Admin Center ဖွင့်နည်း

Telegram တွင် `@fluent_eng_tutor_bot` ကိုဖွင့်ပြီး `/start` သို့မဟုတ် `/menu` ကို ပို့ပါ။ သတ်မှတ်ထားသော Admin account ဖြစ်ပါက Main Menu ထဲတွင် အောက်ပါခလုတ်ပေါ်ပါမည်။

> **🛡️ Admin Center**

ခလုတ်မပေါ်ပါက အောက်ပါအချက်များကို စစ်ပါ။

- Telegram account မှန်မမှန် စစ်ပါ။
- Render environment ထဲက `ADMIN_ID` သည် ကိုယ့် Telegram numeric ID ဟုတ်မဟုတ် စစ်ပါ။
- `ADMIN_ID` ကို username မထည့်ဘဲ numeric ID ထည့်ထားရပါမည်။
- Render တွင် environment ပြင်ပြီးပါက Deploy ပြန်လုပ်ပါ။
- Bot ကို `/menu` ပြန်ပို့ပါ။

## ၄။ Admin Center ထဲက ခလုတ်များ

| ခလုတ် | လုပ်ဆောင်ချက် |
|---|---|
| **🏫 အတန်းများကြည့်မယ်** | ကိုယ်ပိုင်ဖန်တီးထားသော Classroom များကို ကြည့်ရန် |
| **➕ အတန်းသစ်ဖန်တီးမယ်** | Classroom အသစ်ဖန်တီးပြီး join code ရယူရန် |
| **📊 Student Dashboard** | Classroom code ဖြင့် ကျောင်းသားတိုးတက်မှုကြည့်ရန် |
| **⭐ Premium ဖွင့်မယ်** | User ID နှင့် ရက်အရေအတွက်ပေး၍ Premium ဖွင့်ရန် |
| **🏠 ပင်မ Menu** | Main Menu သို့ပြန်ရန် |

Lesson သင်နေစဉ် Admin Center ကို မသုံးဘဲ Home ခလုတ်မှ ထွက်ပြီးမှ အသုံးပြုပါ။

## ၅။ Classroom ဖန်တီးနည်း

### ခလုတ်ဖြင့် ဖန်တီးခြင်း

1. **🛡️ Admin Center** ကိုနှိပ်ပါ။
2. **➕ အတန်းသစ်ဖန်တီးမယ်** ကိုနှိပ်ပါ။
3. Bot က အတန်းအမည်တောင်းလျှင် အတန်းအမည်ကို စာသားတစ်ကြောင်းအဖြစ် ပို့ပါ။ ဥပမာ `Saturday Speaking Class`။
4. Bot က Classroom အမည်နှင့် join code ပြန်ပို့ပါမည်။
5. Join code ကို သက်ဆိုင်ရာကျောင်းသားများထံသာ မျှဝေပါ။

### Command ဖြင့် ဖန်တီးခြင်း

```text
/classroom_create Saturday Speaking Class
```

Classroom ဖန်တီးပြီးပါက code ကို သိမ်းထားပါ။ User များက ထို code ဖြင့် `/classroom_join CODE` သုံး၍ အတန်းထဲဝင်နိုင်ပါသည်။

## ၆။ Classroom စာရင်းကြည့်နည်း

Admin Center ထဲမှ **🏫 အတန်းများကြည့်မယ်** ကိုနှိပ်ပါ၊ သို့မဟုတ် အောက်ပါ command ကိုသုံးပါ။

```text
/classroom
```

စာရင်းတွင် Classroom အမည်၊ join code သို့မဟုတ် ကိုယ်ပိုင်အတန်းအချက်အလက်များ ပေါ်ပါမည်။ Classroom များကို မျှဝေရာတွင် join code သည် အတန်းထဲဝင်ရန် သော့ဖြစ်သောကြောင့် အများပြည်သူ channel တွင် မတင်သင့်ပါ။

## ၇။ Student Dashboard ကြည့်နည်း

### ခလုတ်ဖြင့်ကြည့်ခြင်း

1. **🛡️ Admin Center** ကိုဖွင့်ပါ။
2. **📊 Student Dashboard** ကိုနှိပ်ပါ။
3. Bot က Classroom code တောင်းလျှင် ကိုယ်ပိုင် Classroom code ကို ပို့ပါ။
4. Dashboard တွင် ကျောင်းသားအရေအတွက်၊ လက်ရှိတက်နေသူ၊ ပျမ်းမျှပြီးစီးမှု၊ CEFR level၊ Quiz accuracy၊ points၊ speaking activity နှင့် streak အစရှိသည့် summary များကို ကြည့်နိုင်ပါသည်။

### Command ဖြင့်ကြည့်ခြင်း

```text
/classroom_dashboard ABC123
```

`ABC123` နေရာတွင် မိမိ Classroom ၏ code ကို ထည့်ပါ။ ကိုယ်မပိုင်သော Classroom code ကိုသုံးလျှင် Dashboard ကို မပြပါ။

## ၈။ User ကို Premium ဖွင့်ပေးနည်း

Payment ကို လောလောဆယ် Manual စနစ်ဖြင့် စီမံပါ။ ငွေပေးချေမှုကို ကိုယ်တိုင်အတည်ပြုပြီးမှ Bot ထဲတွင် Premium ဖွင့်ပေးပါ။

### ခလုတ်ဖြင့်ဖွင့်ခြင်း

1. **🛡️ Admin Center** ကိုဖွင့်ပါ။
2. **⭐ Premium ဖွင့်မယ်** ကိုနှိပ်ပါ။
3. Bot တောင်းသည့်ပုံစံအတိုင်း User Telegram numeric ID နှင့် ရက်အရေအတွက်ကို space ခြားပြီး ပို့ပါ။
4. ဥပမာ—

```text
123456789 30
```

### Command ဖြင့်ဖွင့်ခြင်း

```text
/upgrade 123456789 30
```

Premium ရက်အရေအတွက်သည် **1 ရက်မှ 3650 ရက်အတွင်း integer** ဖြစ်ရပါမည်။ ရက်အရေအတွက်ကို စာလုံး၊ decimal သို့မဟုတ် အနုတ်တန်ဖိုး မသုံးပါနှင့်။

Premium ဖွင့်ပြီးပါက User သည် Premium level များ၊ Premium track များနှင့် Premium voice features များကို အသုံးပြုနိုင်ပါမည်။ Premium သက်တမ်းကုန်လျှင် Bot က free usage စည်းမျဉ်းသို့ ပြန်ပြောင်းပါမည်။

> **စစ်ဆေးရန်:** User ID ကို မှားပို့လျှင် Premium သည် အခြား account ထဲသို့ ဝင်သွားနိုင်ပါသည်။ Upgrade မလုပ်မီ User ၏ numeric ID ကို `/myid` ဖြင့် ပို့ခိုင်းပြီး တိုက်စစ်ပါ။

## ၉။ Admin နှင့် Premium usage စည်းမျဉ်း

သတ်မှတ်ထားသော Admin account သည် daily usage limit မရှိပါ။ Premium User များလည်း သက်တမ်းရှိနေသရွေ့ unlimited အသုံးပြုနိုင်ပါသည်။ Free User များအတွက် default အားဖြင့် တစ်နေ့လျှင် AI request **၅ ကြိမ်** ကန့်သတ်ထားပါသည်။

Daily usage ကို Firestore တွင်သိမ်းထားပါက account နှစ်ခုက တစ်ပြိုင်နက် request ပို့သည့်အခါ transaction ဖြင့် count မလွတ်အောင် ကာကွယ်ထားပါသည်။ Firebase မဖွင့်ထားလျှင် memory fallback သုံးသည့်အတွက် restart ပြီးနောက် count ပြန်စနိုင်ပါသည်။

## ၁၀။ User ကို Classroom ထဲသို့ဝင်စေနည်း

User ကို Classroom code ပေးပြီး အောက်ပါ command သုံးခိုင်းပါ။

```text
/classroom_join ABC123
```

သို့မဟုတ် User ၏ **More/Settings → Classroom** ထဲမှ **🔑 အတန်း Code နဲ့ဝင်မယ်** ကိုနှိပ်၍ code ပို့ခိုင်းပါ။ Join ပြီးပါက User ၏ Academy တိုးတက်မှုကို Classroom dashboard တွင် summary အဖြစ် ကြည့်နိုင်ပါသည်။

## ၁၁။ Admin အတွက် နေ့စဉ်စစ်ဆေးရန် Checklist

- Render service သည် `Live` ဖြစ်ကြောင်း စစ်ပါ။
- Health URL တွင် `status: "ok"` ဖြစ်ကြောင်း စစ်ပါ။
- `firebase: "enabled"` ဖြစ်ကြောင်း စစ်ပါ။
- Bot ကို `/start` ပို့ပြီး Main Menu ပြန်လာခြင်း စမ်းပါ။
- Free User account တစ်ခုဖြင့် daily limit စမ်းပါ။
- Premium User တစ်ခုဖြင့် Premium level ဝင်နိုင်ခြင်း စမ်းပါ။
- Beginner သို့မဟုတ် Academy lesson တစ်ခုတွင် one-step-at-a-time ခလုတ်စနစ် စမ်းပါ။
- Kids lesson တွင် age selection နှင့် mastery gate စမ်းပါ။
- Voice message တစ်ခုနှင့် Quiz တစ်ခု စမ်းပါ။
- Error ဖြစ်ပါက Render logs၊ AI metrics နှင့် ဖြစ်သည့် Telegram message ကို မှတ်တမ်းတင်ပါ။

## ၁၂။ ဖြစ်နိုင်သော Error များနှင့် ဖြေရှင်းနည်း

| Error/အခြေအနေ | အကြောင်းရင်းဖြစ်နိုင်မှု | လုပ်ဆောင်ရန် |
|---|---|---|
| Admin Center မပေါ် | `ADMIN_ID` မှားနေခြင်း | Telegram numeric ID နှင့် Render `ADMIN_ID` တိုက်စစ်ပြီး redeploy လုပ်ပါ |
| `AI service ခဏမရသေးပါ` | Gemini key, model, quota, overload သို့မဟုတ် temporary outage | `GEMINI_API_KEY`, `GEMINI_MODEL`, fallback model နှင့် Render logs စစ်ပါ |
| `Firebase memory-fallback` | Firebase credential မဖတ်နိုင်ခြင်း | JSON format, environment secret နှင့် Firebase permission စစ်ပါ |
| Bot မတုံ့ပြန် | Render service ရပ်ခြင်း၊ token မှားခြင်း သို့မဟုတ် polling conflict | Render status, logs နှင့် duplicate service စစ်ပါ |
| Voice မဖတ်နိုင် | Telegram file download, audio format သို့မဟုတ် Gemini audio error | အသံတိုတို ပြန်စမ်းပြီး logs စစ်ပါ |
| Premium မဝင် | User ID မှားခြင်း၊ expiry ကုန်ခြင်း သို့မဟုတ် Firestore မသိမ်းခြင်း | `/myid` ဖြင့် ID ပြန်စစ်၊ Health တွင် Firebase enabled စစ်ပါ |
| Dashboard မပေါ် | Code မှားခြင်း သို့မဟုတ် မိမိမပိုင်သောအတန်း | Classroom code နှင့် Admin owner ကို ပြန်စစ်ပါ |
| `/start` နှစ်ခါပေါ် | Web Service နှစ်ခုက Bot token တူတူ polling လုပ်ခြင်း | Production instance တစ်ခုတည်းသာ ထားပါ |

## ၁၃။ Render environment variables

Production တွင် အနည်းဆုံး အောက်ပါ secret များလိုအပ်ပါသည်။

```text
BOT_TOKEN
GEMINI_API_KEY
ADMIN_ID
FIREBASE_SERVICE_ACCOUNT_JSON
```

ရွေးချယ်နိုင်သော settings များမှာ—

```text
GEMINI_MODEL=gemini-3.5-flash
GEMINI_FALLBACK_MODEL=gemini-2.5-flash
DAILY_FREE_LIMIT=5
```

Secret များကို GitHub source code၊ README၊ screenshot သို့မဟုတ် Telegram chat ထဲ မထည့်ပါနှင့်။ Render Secret Environment Variable အဖြစ်သာ ထည့်ပါ။

## ၁၄။ Admin အနေဖြင့် မလုပ်သင့်သောအရာများ

Admin account ကို အခြားသူများနှင့် မမျှဝေပါနှင့်။ Bot token နှင့် Gemini key များကို source code ထဲ မရေးပါနှင့်။ Classroom code နှင့် User ID များကို public group ထဲ မတင်ပါနှင့်။ User progress ကို အပြစ်ပေးရန် သို့မဟုတ် ပြိုင်ဆိုင်မှုဖန်တီးရန် မသုံးဘဲ သင်ကြားရေးအကူအညီအဖြစ်သာ အသုံးပြုပါ။ Kids pathway တွင် guardian summary သည် verified guardian consent ၏ အစားထိုးမဟုတ်ကြောင်း သတိထားပါ။

## ၁၅။ အကူအညီတောင်းရာတွင် ပေးသင့်သည့်အချက်များ

Error ဖြစ်လျှင် အောက်ပါအချက်များကို ပေးပါ။

- ဘယ် command သို့မဟုတ် ခလုတ်ကို နှိပ်ခဲ့သလဲ။
- Bot က ပြန်ပို့သည့် error စာသားအပြည့်အစုံ။
- ဖြစ်သည့်အချိန်နှင့် Render service status။
- Health URL ၏ `status`, `firebase`, `ai` အပိုင်းများ။
- Render logs ထဲက error message။

**BOT_TOKEN၊ GEMINI_API_KEY၊ Firebase JSON၊ password သို့မဟုတ် ကိုယ်ရေးအချက်အလက်များကို မပေးပါနှင့်။**
