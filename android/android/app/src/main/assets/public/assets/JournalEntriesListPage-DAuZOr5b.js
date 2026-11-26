import{a as e}from"./rolldown-runtime-BWaJ3C7D.js";import{t}from"./useOnFiscalYearChange-BUPbMA2E.js";import{n}from"./fiscalYearDateRange-CQnxttcz.js";import{A as r,E as i,J as a,K as o,O as s,h as c,t as l}from"./jsx-runtime-CwlwA8cZ.js";import{$ as u,B as d,K as f,M as p,Q as m,U as h,at as ee,dt as te,et as g,gt as ne,m as re,n as _}from"./index-BeUNrxgE.js";import{t as ie}from"./AnimatePresence-KTBYoDxX.js";import{t as v}from"./proxy-DBEIhlOv.js";import{t as y}from"./calendar-days-CaxoOGw8.js";import{t as ae}from"./plus-BN18XY7i.js";import{t as oe}from"./printer-BFGpXXHt.js";import{t as b}from"./refresh-cw-0NCZ2BC-.js";import{t as x}from"./rotate-ccw-BsM5RX-n.js";import{t as se}from"./trash-2-CnqGVyFI.js";import{t as ce}from"./arrow-down-left-kdhE67xC.js";import{t as le}from"./arrow-up-right-CjFObXnT.js";import{t as S}from"./layers-2KQ9Q2xC.js";import{t as C}from"./CompactSelect-CXcHJWzY.js";import{t as ue}from"./Pagination-B2QCGO3p.js";import{t as w}from"./useFiscalYearGuard-Gq1wMqvn.js";import{t as T}from"./ReadOnlyFiscalYearBanner-CeWOxrOQ.js";import{a as E,i as D}from"./journalEntriesApi-BZcu5jAc.js";import{t as O}from"./react-to-print-ChgInJ3f.js";import{t as k}from"./DateInput-CctC_y0G.js";var A=e(a(),1);function de({title:e=r(`تقرير قيود اليومية`)}={}){let t=(0,A.useRef)(null);return{printList:O({contentRef:t,documentTitle:e}),printRef:t}}var j=l(),M={Manual:r(`يدوي`),Adjustment:r(`تسوية`),Opening:r(`افتتاحي`),Automatic:r(`تلقائي`)},N={Posted:r(`مرحّل`),Reversed:r(`معكوس`)},P=e=>Number(e??0).toLocaleString(s(),{minimumFractionDigits:2,maximumFractionDigits:2}),F=e=>typeof e==`number`?{1:r(`يدوي`),2:r(`تسوية`),3:r(`افتتاحي`),4:r(`تلقائي`)}[e]??e:M[e]??e??`—`,I=e=>typeof e==`number`?{1:r(`مرحّل`),2:r(`معكوس`)}[e]??e:N[e]??e??`—`;function fe({entries:e=[],filters:t,summary:n}){let a=o(e=>e.auth.selectedCompany),c=_(new Date),l=Number(n?.totalDebit??0),u=Number(n?.totalCredit??0),d=Number(n?.difference??l-u);return(0,j.jsxs)(j.Fragment,{children:[(0,j.jsx)(`style`,{children:`
          @page {
            size: A4 landscape;
            margin: 8mm;
          }

          @media print {
            html,
            body {
              width: 100%;
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
            }

            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            .journal-print-page {
              width: 100% !important;
              min-height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              box-sizing: border-box !important;
            }

            .journal-print-table {
              width: 100% !important;
              table-layout: fixed !important;
              border-collapse: collapse !important;
            }

            .journal-print-table thead {
              display: table-header-group;
            }

            .journal-print-table tfoot {
              display: table-footer-group;
            }

            .journal-print-table tr {
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .journal-print-summary {
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .journal-print-signature {
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .journal-print-description {
              overflow-wrap: anywhere !important;
              word-break: break-word !important;
              white-space: normal !important;
            }

            .journal-print-filter {
              break-inside: avoid;
              page-break-inside: avoid;
            }
          }
        `}),(0,j.jsxs)(`div`,{dir:i(),className:`journal-print-page`,style:{width:`100%`,minHeight:`194mm`,margin:0,padding:0,boxSizing:`border-box`,fontFamily:`'Cairo', 'Tajawal', Arial, sans-serif`,color:`#0E1827`,background:`#fff`,fontSize:`10px`,lineHeight:1.5},children:[(0,j.jsxs)(`div`,{style:{display:`flex`,justifyContent:`space-between`,alignItems:`stretch`,width:`100%`,minHeight:`58px`,marginBottom:`10px`,paddingBottom:`9px`,borderBottom:`2px solid #0C4A3E`,boxSizing:`border-box`},children:[(0,j.jsxs)(`div`,{style:{flex:1,minWidth:0,display:`flex`,flexDirection:`column`,justifyContent:`center`},children:[(0,j.jsx)(`div`,{style:{fontSize:`19px`,fontWeight:800,color:`#0A2540`,lineHeight:1.2},children:a?.name||`—`}),(0,j.jsx)(`div`,{style:{marginTop:`4px`,fontSize:`9px`,color:`#6F7C75`},children:r(`نظام الإدارة والمحاسبة`)})]}),(0,j.jsx)(`div`,{style:{flex:1,display:`flex`,alignItems:`center`,justifyContent:`center`,textAlign:`center`},children:(0,j.jsxs)(`div`,{children:[(0,j.jsx)(`div`,{style:{fontSize:`17px`,fontWeight:800,color:`#0C4A3E`,lineHeight:1.2},children:r(`تقرير قيود اليومية`)}),(0,j.jsx)(`div`,{style:{marginTop:`3px`,fontSize:`8.5px`,color:`#6F7C75`},children:`Journal Entries Report`})]})}),(0,j.jsx)(`div`,{style:{flex:1,display:`flex`,justifyContent:`flex-end`,alignItems:`center`},children:(0,j.jsxs)(`div`,{style:{minWidth:`175px`,padding:`7px 10px`,border:`1px solid #E2E7E4`,borderRadius:`5px`,background:`#F7F9F8`,boxSizing:`border-box`},children:[(0,j.jsxs)(`div`,{style:{display:`flex`,justifyContent:`space-between`,gap:`12px`,marginBottom:`3px`,fontSize:`8.5px`},children:[(0,j.jsx)(`span`,{style:{color:`#6F7C75`},children:r(`تاريخ الطباعة`)}),(0,j.jsx)(`strong`,{style:{color:`#0A2540`},children:c})]}),(0,j.jsxs)(`div`,{style:{display:`flex`,justifyContent:`space-between`,gap:`12px`,fontSize:`8.5px`},children:[(0,j.jsx)(`span`,{style:{color:`#6F7C75`},children:r(`عدد القيود`)}),(0,j.jsx)(`strong`,{style:{color:`#0A2540`},children:Number(e.length).toLocaleString(s(),{maximumFractionDigits:2})})]})]})})]}),t&&(0,j.jsxs)(`div`,{className:`journal-print-filter`,style:{display:`flex`,alignItems:`center`,gap:`6px`,width:`100%`,minHeight:`30px`,marginBottom:`10px`,padding:`6px 9px`,border:`1px solid #E2E7E4`,borderRadius:`5px`,background:`#F7F9F8`,boxSizing:`border-box`,fontSize:`8.5px`},children:[(0,j.jsx)(`div`,{style:{fontWeight:800,color:`#0C4A3E`,paddingLeft:`7px`,borderLeft:`1px solid #C9D2CD`,whiteSpace:`nowrap`},children:r(`معايير التقرير`)}),(0,j.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,flexWrap:`wrap`,gap:`5px 15px`,color:`#55635C`},children:[t.search&&(0,j.jsx)(L,{label:r(`البحث`),value:t.search}),t.fiscalYearName&&(0,j.jsx)(L,{label:r(`السنة المالية`),value:t.fiscalYearName}),t.entryType&&(0,j.jsx)(L,{label:r(`نوع القيد`),value:F(t.entryType)}),t.status&&(0,j.jsx)(L,{label:r(`الحالة`),value:I(t.status)}),t.fromDate&&(0,j.jsx)(L,{label:r(`من`),value:t.fromDate}),t.toDate&&(0,j.jsx)(L,{label:r(`إلى`),value:t.toDate}),!t.search&&!t.fiscalYearName&&!t.entryType&&!t.status&&!t.fromDate&&!t.toDate&&(0,j.jsx)(`span`,{style:{color:`#9AA6A0`},children:r(`بدون فلاتر`)})]})]}),(0,j.jsxs)(`table`,{className:`journal-print-table`,style:{width:`100%`,tableLayout:`fixed`,borderCollapse:`collapse`,borderSpacing:0,fontSize:`9px`},children:[(0,j.jsxs)(`colgroup`,{children:[(0,j.jsx)(`col`,{style:{width:`4%`}}),(0,j.jsx)(`col`,{style:{width:`12%`}}),(0,j.jsx)(`col`,{style:{width:`10%`}}),(0,j.jsx)(`col`,{style:{width:`34%`}}),(0,j.jsx)(`col`,{style:{width:`10%`}}),(0,j.jsx)(`col`,{style:{width:`10%`}}),(0,j.jsx)(`col`,{style:{width:`10%`}}),(0,j.jsx)(`col`,{style:{width:`10%`}})]}),(0,j.jsx)(`thead`,{children:(0,j.jsx)(`tr`,{style:{background:`#0C4A3E`,color:`#fff`},children:[`#`,r(`رقم القيد`),r(`التاريخ`),r(`البيان`),r(`النوع`),r(`الحالة`),r(`مدين`),r(`دائن`)].map(e=>(0,j.jsx)(`th`,{style:{border:`1px solid #0C4A3E`,padding:`6px 4px`,textAlign:`center`,verticalAlign:`middle`,fontWeight:700,whiteSpace:`nowrap`,boxSizing:`border-box`},children:e},e))})}),(0,j.jsxs)(`tbody`,{children:[e.map((e,t)=>(0,j.jsxs)(`tr`,{style:{breakInside:`avoid`,pageBreakInside:`avoid`,background:t%2==0?`#ffffff`:`#F7F9F8`},children:[(0,j.jsx)(`td`,{style:R,children:t+1}),(0,j.jsx)(`td`,{style:{...R,direction:`ltr`,fontSize:`8.5px`,fontWeight:600},children:e.entryNumber||e.journalEntryNumber||e.number||`—`}),(0,j.jsx)(`td`,{style:{...R,whiteSpace:`nowrap`,fontSize:`8.5px`},children:e.entryDate?_(e.entryDate):`—`}),(0,j.jsx)(`td`,{className:`journal-print-description`,style:{...z,whiteSpace:`normal`,overflowWrap:`anywhere`,wordBreak:`break-word`,lineHeight:1.45},children:e.description||`—`}),(0,j.jsx)(`td`,{style:{...R,whiteSpace:`nowrap`},children:F(e.entryType)}),(0,j.jsx)(`td`,{style:{...R,whiteSpace:`nowrap`},children:(0,j.jsx)(`span`,{style:{display:`inline-block`,padding:`2px 7px`,borderRadius:`10px`,fontSize:`8px`,fontWeight:700,background:I(e.status)===`مرحّل`?`#E8F3F0`:`#FDF0EE`,color:I(e.status)===`مرحّل`?`#072D26`:`#A13027`},children:I(e.status)})}),(0,j.jsx)(`td`,{style:{...B,direction:`ltr`,whiteSpace:`nowrap`,fontWeight:600},children:P(e.totalDebit)}),(0,j.jsx)(`td`,{style:{...B,direction:`ltr`,whiteSpace:`nowrap`,fontWeight:600},children:P(e.totalCredit)})]},e.id??t)),e.length===0&&(0,j.jsx)(`tr`,{children:(0,j.jsx)(`td`,{colSpan:8,style:{border:`1px solid #E2E7E4`,padding:`25px`,textAlign:`center`,color:`#9AA6A0`},children:r(`لا توجد قيود لعرضها`)})})]}),n&&(0,j.jsx)(`tfoot`,{children:(0,j.jsxs)(`tr`,{style:{background:`#EFF2F0`,fontWeight:700},children:[(0,j.jsx)(`td`,{colSpan:6,style:{border:`1px solid #C9D2CD`,padding:`6px`,textAlign:`right`,color:`#42504A`},children:r(`إجمالي التقرير`)}),(0,j.jsx)(`td`,{style:{border:`1px solid #C9D2CD`,padding:`6px`,textAlign:`center`,direction:`ltr`,whiteSpace:`nowrap`},children:P(l)}),(0,j.jsx)(`td`,{style:{border:`1px solid #C9D2CD`,padding:`6px`,textAlign:`center`,direction:`ltr`,whiteSpace:`nowrap`},children:P(u)})]})})]}),n&&(0,j.jsxs)(`div`,{className:`journal-print-summary`,style:{display:`flex`,justifyContent:`space-between`,alignItems:`flex-start`,gap:`20px`,width:`100%`,marginTop:`10px`},children:[(0,j.jsxs)(`div`,{style:{flex:1,minHeight:`65px`,padding:`8px 10px`,border:`1px solid #E2E7E4`,borderRadius:`5px`,background:d===0?`#E8F3F0`:`#FDF0EE`,boxSizing:`border-box`},children:[(0,j.jsx)(`div`,{style:{fontSize:`8px`,color:`#6F7C75`,marginBottom:`3px`},children:r(`حالة التوازن المحاسبي`)}),(0,j.jsx)(`div`,{style:{fontSize:`12px`,fontWeight:800,color:d===0?`#072D26`:`#A13027`},children:r(d===0?`القيد متوازن ✓`:`يوجد فرق في الأرصدة`)}),(0,j.jsxs)(`div`,{style:{marginTop:`2px`,fontSize:`8px`,color:`#6F7C75`},children:[r(`الفرق:`),` `,(0,j.jsx)(`strong`,{style:{direction:`ltr`,display:`inline-block`},children:P(d)})]})]}),(0,j.jsx)(`table`,{style:{width:`290px`,borderCollapse:`collapse`,fontSize:`9px`},children:(0,j.jsxs)(`tbody`,{children:[(0,j.jsxs)(`tr`,{children:[(0,j.jsx)(`td`,{style:V,children:r(`إجمالي المدين`)}),(0,j.jsx)(`td`,{style:H,children:P(l)})]}),(0,j.jsxs)(`tr`,{children:[(0,j.jsx)(`td`,{style:V,children:r(`إجمالي الدائن`)}),(0,j.jsx)(`td`,{style:H,children:P(u)})]}),(0,j.jsxs)(`tr`,{children:[(0,j.jsx)(`td`,{style:{...V,fontWeight:800},children:r(`الفرق`)}),(0,j.jsx)(`td`,{style:{...H,fontWeight:800,color:d===0?`#072D26`:`#A13027`},children:P(d)})]}),(0,j.jsxs)(`tr`,{children:[(0,j.jsx)(`td`,{style:V,children:r(`عدد القيود`)}),(0,j.jsx)(`td`,{style:H,children:Number(n.count??e.length).toLocaleString(s())})]})]})})]}),(0,j.jsxs)(`div`,{className:`journal-print-signature`,style:{display:`flex`,justifyContent:`space-between`,alignItems:`flex-end`,width:`100%`,marginTop:`24px`,paddingTop:`8px`,borderTop:`1px solid #E2E7E4`},children:[(0,j.jsxs)(`div`,{style:{width:`160px`,textAlign:`center`,fontSize:`8.5px`,color:`#55635C`},children:[(0,j.jsx)(`div`,{style:{height:`22px`,borderBottom:`1px solid #9AA6A0`,marginBottom:`4px`}}),r(`توقيع المراجع`)]}),(0,j.jsxs)(`div`,{style:{textAlign:`center`,fontSize:`8px`,color:`#9AA6A0`},children:[r(`تم استخراج التقرير بتاريخ`),` `,c]}),(0,j.jsxs)(`div`,{style:{width:`160px`,textAlign:`center`,fontSize:`8.5px`,color:`#55635C`},children:[(0,j.jsx)(`div`,{style:{height:`22px`,borderBottom:`1px solid #9AA6A0`,marginBottom:`4px`}}),r(`توقيع المسؤول`)]})]})]})]})}function L({label:e,value:t}){return(0,j.jsxs)(`span`,{style:{whiteSpace:`nowrap`},children:[(0,j.jsxs)(`span`,{style:{color:`#6F7C75`},children:[e,`:`]}),` `,(0,j.jsx)(`strong`,{style:{color:`#0A2540`},children:t})]})}var R={border:`1px solid #E2E7E4`,padding:`4px`,textAlign:`center`,verticalAlign:`middle`,boxSizing:`border-box`},z={border:`1px solid #E2E7E4`,padding:`4px 6px`,textAlign:`right`,verticalAlign:`middle`,boxSizing:`border-box`},B={border:`1px solid #E2E7E4`,padding:`4px`,textAlign:`center`,verticalAlign:`middle`,fontVariantNumeric:`tabular-nums`,boxSizing:`border-box`},V={border:`1px solid #E2E7E4`,background:`#F7F9F8`,padding:`5px 8px`,textAlign:`right`,fontWeight:600,width:`60%`,boxSizing:`border-box`},H={border:`1px solid #E2E7E4`,padding:`5px 8px`,textAlign:`center`,fontWeight:600,width:`40%`,direction:`ltr`,boxSizing:`border-box`},pe=[{value:`Manual`,label:r(`يدوي`)},{value:`Adjustment`,label:r(`تسوية`)},{value:`Opening`,label:r(`افتتاحي`)},{value:`Automatic`,label:r(`تلقائي`)}],me=[{value:`Posted`,label:r(`مرحّل`)},{value:`Reversed`,label:r(`معكوس`)}],he=20;function U(e){return Number(e??0).toLocaleString(s(),{minimumFractionDigits:2,maximumFractionDigits:2})}function ge(e){if(!e)return`-`;let[t,n,r]=String(e).split(`T`)[0].split(`-`);return!t||!n||!r?e:`${r}/${n}/${t}`}function _e(e){return typeof e==`number`?{1:r(`يدوي`),2:r(`تسوية`),3:r(`افتتاحي`),4:r(`تلقائي`)}[e]??e:{Manual:r(`يدوي`),Adjustment:r(`تسوية`),Opening:r(`افتتاحي`),Automatic:r(`تلقائي`)}[e]??e??`-`}function ve(e){return typeof e==`number`?{1:r(`مرحّل`),2:r(`معكوس`)}[e]??e:{Posted:r(`مرحّل`),Reversed:r(`معكوس`)}[e]??e??`-`}function ye(e){return{Invoice:r(`فاتورة`),CashVoucher:r(`سند خزينة`),PartnerOpeningBalance:r(`رصيد افتتاحي طرف`),CashboxOpeningBalance:r(`رصيد افتتاحي خزينة`),StockOpeningBalance:r(`رصيد افتتاحي مخزون`)}[e]??e??``}function be(e){return e?.entryType===`Automatic`||e?.entryType===4||e?.entryType===`4`}function xe(e){return e?.status===`Reversed`||e?.status===2||e?.status===`2`}function W(e){return[...new Set((e?.lines??[]).map(e=>e?.currency).filter(Boolean).map(e=>String(e).toUpperCase()))]}var Se={hidden:{opacity:0,y:8},visible:{opacity:1,y:0,transition:{duration:.3,ease:`easeOut`}}},Ce={hidden:{opacity:0,y:5},visible:{opacity:1,y:0,transition:{duration:.18,ease:`easeOut`}}};function G({icon:e,label:t,onClick:n,disabled:r=!1,danger:i=!1,primary:a=!1}){return(0,j.jsxs)(v.button,{type:`button`,whileHover:{y:-1},whileTap:{scale:.97},onClick:n,disabled:r,className:`
        inline-flex
        h-10
        items-center
        justify-center
        gap-2
        rounded-xl
        px-4
        text-sm
        font-medium
        transition-all
        duration-200
        disabled:cursor-not-allowed
        disabled:opacity-50
        ${a?`
              bg-emerald-800
              text-white
              shadow-sm
              shadow-emerald-900/10
              hover:bg-emerald-900
            `:i?`
                text-gray-400
                hover:bg-red-50
                hover:text-red-600
              `:`
                border
                border-gray-200
                bg-white
                text-gray-600
                shadow-sm
                hover:border-gray-300
                hover:bg-gray-50
                hover:text-gray-800
              `}
      `,children:[(0,j.jsx)(e,{size:16}),t&&(0,j.jsx)(`span`,{children:t})]})}function we({currency:e,multi:t=!1}){return!e&&!t?(0,j.jsxs)(`span`,{className:`inline-flex items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-1.5 text-[10px] font-bold text-gray-400`,children:[(0,j.jsx)(g,{size:12}),`-`]}):t?(0,j.jsxs)(`span`,{title:r(`القيد يحتوي على أكثر من عملة`),className:`
          inline-flex
          items-center
          gap-1.5
          rounded-lg
          border
          border-amber-200
          bg-amber-50
          px-2.5
          py-1.5
          text-[10px]
          font-bold
          text-amber-700
        `,children:[(0,j.jsx)(S,{size:12}),r(`متعدد`)]}):(0,j.jsxs)(`span`,{title:r(`عملة القيد: {0}`,{0:e}),className:`
        inline-flex
        min-w-[48px]
        items-center
        justify-center
        gap-1.5
        rounded-lg
        border
        border-emerald-100
        bg-emerald-50
        px-2.5
        py-1.5
        text-[10px]
        font-extrabold
        tracking-wide
        text-emerald-700
      `,children:[(0,j.jsx)(g,{size:12}),e]})}function K(){let e=ne(),a=o(c),{isReadOnly:l,fiscalYear:_}=w(),[S,O]=(0,A.useState)({search:``,fiscalYearId:null,entryType:null,status:null,fromDate:``,toDate:``}),[M,N]=(0,A.useState)(1);t(e=>{O(t=>t.fiscalYearId?t:n(t,[`fromDate`,`toDate`],e)),N(1)});let[P,F]=(0,A.useState)(he),{data:I}=re(),L=(I??[]).map(e=>({value:e.id,label:e.name})),R=L.find(e=>String(e.value)===String(S.fiscalYearId)),z={PageNumber:M,PageSize:P,Search:S.search||void 0,FiscalYearId:S.fiscalYearId||void 0,EntryType:S.entryType||void 0,Status:S.status||void 0,FromDate:S.fromDate||void 0,ToDate:S.toDate||void 0},{data:B,isLoading:V,isFetching:H,refetch:K}=E(z),[Te,{isLoading:q}]=D(),J=B?.items??[],{printList:Ee,printRef:Y}=de({title:r(`تقرير قيود اليومية`)}),X=(0,A.useMemo)(()=>{let e=J.reduce((e,t)=>e+Number(t.totalDebit??0),0),t=J.reduce((e,t)=>e+Number(t.totalCredit??0),0),n=[...new Set(J.flatMap(e=>W(e)).filter(Boolean))];return{totalDebit:e,totalCredit:t,difference:e-t,count:J.length,currencies:n}},[J]),Z=(e,t)=>{N(1),O(n=>({...n,[e]:t}))},Q=()=>{N(1),O({search:``,fiscalYearId:null,entryType:null,status:null,fromDate:``,toDate:``})},$=!!S.search||!!S.fiscalYearId||!!S.entryType||!!S.status||!!S.fromDate||!!S.toDate,De=async e=>{try{await Te({id:e.id,rowVersion:e.rowVersion}).unwrap()}catch(e){console.error(r(`فشل حذف القيد`),e)}};return(0,j.jsxs)(j.Fragment,{children:[(0,j.jsxs)(v.div,{dir:i(),variants:Se,initial:`hidden`,animate:`visible`,className:`
          min-h-screen
          w-full
          overflow-x-hidden
          bg-gray-50
          px-3
          py-4
          sm:px-5
          sm:py-5
          lg:px-7
          lg:py-6
        `,children:[(0,j.jsxs)(`div`,{className:`mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between`,children:[(0,j.jsxs)(`div`,{className:`flex min-w-0 items-center gap-3`,children:[(0,j.jsx)(`div`,{className:`
                flex
                h-12
                w-12
                shrink-0
                items-center
                justify-center
                rounded-2xl
                bg-emerald-100
                text-emerald-700
                shadow-sm
              `,children:(0,j.jsx)(te,{size:22})}),(0,j.jsxs)(`div`,{className:`min-w-0`,children:[(0,j.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,j.jsx)(`h1`,{className:`truncate text-xl font-bold tracking-tight text-gray-900 sm:text-2xl`,children:r(`قيود اليومية`)}),B?.totalCount!=null&&(0,j.jsxs)(`span`,{className:`
                      hidden
                      rounded-full
                      bg-gray-100
                      px-2.5
                      py-1
                      text-[11px]
                      font-semibold
                      text-gray-500
                      sm:inline-flex
                    `,children:[B.totalCount.toLocaleString(s(),{maximumFractionDigits:2}),` `,r(`قيد`)]})]}),(0,j.jsx)(`p`,{className:`mt-0.5 text-xs text-gray-400 sm:text-sm`,children:r(`إدارة ومراجعة القيود المحاسبية اليومية`)})]})]}),(0,j.jsxs)(`div`,{className:`flex flex-wrap items-center gap-2`,children:[(0,j.jsx)(G,{icon:b,label:r(`تحديث`),onClick:K,disabled:H}),(0,j.jsx)(G,{icon:oe,label:r(`طباعة`),onClick:Ee,disabled:V||J.length===0}),!l&&(0,j.jsx)(G,{icon:ae,label:r(`قيد جديد`),primary:!0,onClick:()=>e(`/dashboard/journal-entries/new`)})]})]}),l&&(0,j.jsx)(T,{fiscalYear:_}),(0,j.jsxs)(`div`,{className:`mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4`,children:[(0,j.jsx)(`div`,{className:`
              rounded-2xl
              border
              border-gray-200
              bg-white
              px-4
              py-3.5
              shadow-sm
            `,children:(0,j.jsxs)(`div`,{className:`flex items-center justify-between`,children:[(0,j.jsxs)(`div`,{children:[(0,j.jsx)(`p`,{className:`text-[11px] font-medium text-gray-400`,children:r(`إجمالي المدين`)}),(0,j.jsx)(`p`,{className:`mt-1 text-lg font-bold tabular-nums text-gray-800`,children:U(X.totalDebit)})]}),(0,j.jsx)(`div`,{className:`flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600`,children:(0,j.jsx)(ce,{size:17})})]})}),(0,j.jsx)(`div`,{className:`
              rounded-2xl
              border
              border-gray-200
              bg-white
              px-4
              py-3.5
              shadow-sm
            `,children:(0,j.jsxs)(`div`,{className:`flex items-center justify-between`,children:[(0,j.jsxs)(`div`,{children:[(0,j.jsx)(`p`,{className:`text-[11px] font-medium text-gray-400`,children:r(`إجمالي الدائن`)}),(0,j.jsx)(`p`,{className:`mt-1 text-lg font-bold tabular-nums text-gray-800`,children:U(X.totalCredit)})]}),(0,j.jsx)(`div`,{className:`flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600`,children:(0,j.jsx)(le,{size:17})})]})}),(0,j.jsx)(`div`,{className:`
              rounded-2xl
              border
              border-gray-200
              bg-white
              px-4
              py-3.5
              shadow-sm
            `,children:(0,j.jsxs)(`div`,{className:`flex items-center justify-between gap-3`,children:[(0,j.jsxs)(`div`,{className:`min-w-0`,children:[(0,j.jsx)(`p`,{className:`text-[11px] font-medium text-gray-400`,children:r(`العملات المستخدمة`)}),(0,j.jsx)(`div`,{className:`mt-1.5 flex flex-wrap gap-1.5`,children:X.currencies.length>0?X.currencies.map(e=>(0,j.jsx)(`span`,{className:`
                          rounded-md
                          bg-emerald-50
                          px-2
                          py-0.5
                          text-[10px]
                          font-bold
                          text-emerald-700
                        `,children:e},e)):(0,j.jsx)(`span`,{className:`text-sm font-semibold text-gray-400`,children:`-`})})]}),(0,j.jsx)(`div`,{className:`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600`,children:(0,j.jsx)(g,{size:17})})]})}),(0,j.jsx)(`div`,{className:`
              rounded-2xl
              border
              border-gray-200
              bg-white
              px-4
              py-3.5
              shadow-sm
            `,children:(0,j.jsxs)(`div`,{className:`flex items-center justify-between`,children:[(0,j.jsxs)(`div`,{children:[(0,j.jsx)(`p`,{className:`text-[11px] font-medium text-gray-400`,children:r(`الفرق`)}),(0,j.jsx)(`p`,{className:`
                    mt-1
                    text-lg
                    font-bold
                    tabular-nums
                    ${Math.abs(X.difference)<.01?`text-emerald-700`:`text-red-600`}
                  `,children:U(Math.abs(X.difference))})]}),(0,j.jsx)(`div`,{className:`
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-xl
                  ${Math.abs(X.difference)<.01?`bg-emerald-50 text-emerald-600`:`bg-red-50 text-red-600`}
                `,children:Math.abs(X.difference)<.01?`✓`:`!`})]})})]}),(0,j.jsxs)(`div`,{className:`
            mb-5
            overflow-hidden
            rounded-2xl
            border
            border-gray-200
            bg-white
            shadow-sm
          `,children:[(0,j.jsxs)(`div`,{className:`
              flex
              flex-col
              gap-3
              border-b
              border-gray-100
              px-4
              py-3.5
              sm:flex-row
              sm:items-center
              sm:justify-between
              sm:px-5
            `,children:[(0,j.jsxs)(`div`,{className:`flex items-center gap-2.5`,children:[(0,j.jsx)(`div`,{className:`
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-xl
                  bg-emerald-50
                  text-emerald-700
                `,children:(0,j.jsx)(d,{size:16})}),(0,j.jsxs)(`div`,{children:[(0,j.jsx)(`h2`,{className:`text-sm font-semibold text-gray-800`,children:r(`تصفية القيود`)}),(0,j.jsx)(`p`,{className:`text-[11px] text-gray-400`,children:r(`البحث والتصفية حسب بيانات القيد`)})]})]}),$&&(0,j.jsxs)(v.button,{type:`button`,whileTap:{scale:.97},onClick:Q,className:`
                  inline-flex
                  items-center
                  justify-center
                  gap-1.5
                  self-start
                  rounded-lg
                  px-2.5
                  py-1.5
                  text-xs
                  font-medium
                  text-gray-500
                  transition
                  hover:bg-red-50
                  hover:text-red-600
                  sm:self-auto
                `,children:[(0,j.jsx)(x,{size:13}),r(`إعادة ضبط`)]})]}),(0,j.jsx)(`div`,{className:`p-4 sm:p-5`,children:(0,j.jsxs)(`div`,{className:`
                grid
                grid-cols-1
                gap-3.5
                sm:grid-cols-2
                lg:grid-cols-3
                xl:grid-cols-6
              `,children:[(0,j.jsxs)(`div`,{className:`min-w-0 xl:col-span-2`,children:[(0,j.jsx)(`label`,{className:`mb-1.5 block text-xs font-medium text-gray-500`,children:r(`البحث`)}),(0,j.jsxs)(`div`,{className:`relative`,children:[(0,j.jsx)(h,{size:16,className:`
                      pointer-events-none
                      absolute
                      right-3
                      top-1/2
                      -translate-y-1/2
                      text-gray-400
                    `}),(0,j.jsx)(`input`,{type:`text`,value:S.search,onChange:e=>Z(`search`,e.target.value),placeholder:r(`رقم القيد، البيان، المصدر...`),className:`
                      h-10
                      w-full
                      rounded-xl
                      border
                      border-gray-200
                      bg-gray-50/60
                      py-2.5
                      pl-9
                      pr-9
                      text-sm
                      text-gray-800
                      outline-none
                      transition-all
                      placeholder:text-gray-400
                      hover:border-gray-300
                      focus:border-emerald-500
                      focus:bg-white
                      focus:ring-4
                      focus:ring-emerald-500/10
                    `}),S.search&&(0,j.jsx)(`button`,{type:`button`,onClick:()=>Z(`search`,``),className:`
                        absolute
                        left-2.5
                        top-1/2
                        flex
                        h-6
                        w-6
                        -translate-y-1/2
                        items-center
                        justify-center
                        rounded-md
                        text-gray-400
                        transition
                        hover:bg-gray-100
                        hover:text-gray-700
                      `,children:(0,j.jsx)(p,{size:14})})]})]}),(0,j.jsxs)(`div`,{className:`min-w-0`,children:[(0,j.jsx)(`label`,{className:`mb-1.5 block text-xs font-medium text-gray-500`,children:r(`السنة المالية`)}),(0,j.jsx)(C,{value:S.fiscalYearId,onChange:e=>Z(`fiscalYearId`,e),options:L,placeholder:r(`كل السنوات`)})]}),(0,j.jsxs)(`div`,{className:`min-w-0`,children:[(0,j.jsx)(`label`,{className:`mb-1.5 block text-xs font-medium text-gray-500`,children:r(`نوع القيد`)}),(0,j.jsx)(C,{value:S.entryType,onChange:e=>Z(`entryType`,e),options:pe,placeholder:r(`كل الأنواع`)})]}),(0,j.jsxs)(`div`,{className:`min-w-0`,children:[(0,j.jsx)(`label`,{className:`mb-1.5 block text-xs font-medium text-gray-500`,children:r(`الحالة`)}),(0,j.jsx)(C,{value:S.status,onChange:e=>Z(`status`,e),options:me,placeholder:r(`كل الحالات`)})]}),(0,j.jsxs)(`div`,{className:`min-w-0`,children:[(0,j.jsx)(`label`,{className:`mb-1.5 block text-xs font-medium text-gray-500`,children:r(`من تاريخ`)}),(0,j.jsxs)(`div`,{className:`relative`,children:[(0,j.jsx)(y,{size:15,className:`
                      pointer-events-none
                      absolute
                      right-3
                      top-1/2
                      -translate-y-1/2
                      text-gray-400
                    `}),(0,j.jsx)(k,{type:`date`,value:S.fromDate,onChange:e=>Z(`fromDate`,e.target.value),className:`
                      h-10
                      w-full
                      rounded-xl
                      border
                      border-gray-200
                      bg-gray-50/60
                      px-3
                      py-2.5
                      pr-9
                      text-sm
                      text-gray-700
                      outline-none
                      transition
                      hover:border-gray-300
                      focus:border-emerald-500
                      focus:bg-white
                      focus:ring-4
                      focus:ring-emerald-500/10
                    `})]})]}),(0,j.jsxs)(`div`,{className:`min-w-0`,children:[(0,j.jsx)(`label`,{className:`mb-1.5 block text-xs font-medium text-gray-500`,children:r(`إلى تاريخ`)}),(0,j.jsxs)(`div`,{className:`relative`,children:[(0,j.jsx)(y,{size:15,className:`
                      pointer-events-none
                      absolute
                      right-3
                      top-1/2
                      -translate-y-1/2
                      text-gray-400
                    `}),(0,j.jsx)(k,{type:`date`,value:S.toDate,onChange:e=>Z(`toDate`,e.target.value),className:`
                      h-10
                      w-full
                      rounded-xl
                      border
                      border-gray-200
                      bg-gray-50/60
                      px-3
                      py-2.5
                      pr-9
                      text-sm
                      text-gray-700
                      outline-none
                      transition
                      hover:border-gray-300
                      focus:border-emerald-500
                      focus:bg-white
                      focus:ring-4
                      focus:ring-emerald-500/10
                    `})]})]})]})})]}),(0,j.jsxs)(`div`,{className:`mb-3 flex items-center justify-between px-1`,children:[(0,j.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,j.jsx)(`div`,{className:`flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-500`,children:(0,j.jsx)(m,{size:15})}),(0,j.jsx)(`div`,{children:(0,j.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,j.jsx)(`span`,{className:`text-sm font-semibold text-gray-700`,children:r(`القيود اليومية`)}),B?.totalCount!=null&&(0,j.jsx)(`span`,{className:`
                      rounded-full
                      bg-emerald-50
                      px-2
                      py-0.5
                      text-[10px]
                      font-semibold
                      text-emerald-700
                    `,children:B.totalCount.toLocaleString(s(),{maximumFractionDigits:2})})]})})]}),H&&!V&&(0,j.jsxs)(`div`,{className:`flex items-center gap-1.5 text-[11px] text-gray-400`,children:[(0,j.jsx)(b,{size:12,className:`animate-spin`}),r(`جاري التحديث...`)]})]}),(0,j.jsx)(`div`,{className:`
            w-full
            overflow-hidden
            rounded-2xl
            border
            border-gray-200
            bg-white
            shadow-sm
          `,children:(0,j.jsx)(`div`,{className:`w-full overflow-x-auto`,children:(0,j.jsxs)(`div`,{className:`min-w-[1250px]`,children:[(0,j.jsxs)(`div`,{className:`
                  grid
                  grid-cols-[100px_105px_minmax(250px,1fr)_95px_100px_125px_125px_95px_105px]
                  gap-2
                  border-b
                  border-gray-100
                  bg-gray-50
                  px-4
                  py-3
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-wide
                  text-gray-400
                  sm:px-6
                `,children:[(0,j.jsx)(`span`,{children:r(`رقم القيد`)}),(0,j.jsx)(`span`,{children:r(`التاريخ`)}),(0,j.jsx)(`span`,{children:r(`البيان / المصدر`)}),(0,j.jsx)(`span`,{children:r(`النوع`)}),(0,j.jsx)(`span`,{children:r(`العملة`)}),(0,j.jsx)(`span`,{className:`text-left`,children:r(`مدين`)}),(0,j.jsx)(`span`,{className:`text-left`,children:r(`دائن`)}),(0,j.jsx)(`span`,{children:r(`الحالة`)}),(0,j.jsx)(`span`,{className:`text-left`,children:r(`الإجراءات`)})]}),V&&(0,j.jsx)(`div`,{className:`divide-y divide-gray-50`,children:Array.from({length:7}).map((e,t)=>(0,j.jsxs)(`div`,{className:`
                        grid
                        grid-cols-[100px_105px_minmax(250px,1fr)_95px_100px_125px_125px_95px_105px]
                        items-center
                        gap-2
                        px-4
                        py-4
                        sm:px-6
                      `,children:[(0,j.jsx)(`div`,{className:`h-4 w-20 animate-pulse rounded-md bg-gray-100`}),(0,j.jsx)(`div`,{className:`h-3.5 w-20 animate-pulse rounded-md bg-gray-100`}),(0,j.jsx)(`div`,{className:`h-4 w-52 animate-pulse rounded-md bg-gray-100`}),(0,j.jsx)(`div`,{className:`h-6 w-16 animate-pulse rounded-full bg-gray-100`}),(0,j.jsx)(`div`,{className:`h-6 w-14 animate-pulse rounded-lg bg-gray-100`}),(0,j.jsx)(`div`,{className:`ml-auto h-4 w-20 animate-pulse rounded-md bg-gray-100`}),(0,j.jsx)(`div`,{className:`ml-auto h-4 w-20 animate-pulse rounded-md bg-gray-100`}),(0,j.jsx)(`div`,{className:`h-6 w-16 animate-pulse rounded-full bg-gray-100`}),(0,j.jsx)(`div`,{className:`ml-auto h-8 w-16 animate-pulse rounded-lg bg-gray-100`})]},t))}),!V&&(0,j.jsx)(ie,{mode:`popLayout`,children:J.map((t,n)=>{let i=be(t),o=xe(t),s=a&&!i&&!l,c=W(t),d=c.length>1,p=c.length===1?c[0]:t.baseCurrency||`EGP`,h=ye(t.sourceType);return(0,j.jsxs)(v.div,{variants:Ce,initial:`hidden`,animate:`visible`,exit:{opacity:0,x:-8},transition:{delay:Math.min(n*.02,.18)},className:`
                          group
                          grid
                          grid-cols-[100px_105px_minmax(250px,1fr)_95px_100px_125px_125px_95px_105px]
                          items-center
                          gap-2
                          border-b
                          border-gray-50
                          px-4
                          py-3
                          text-sm
                          transition-all
                          duration-200
                          last:border-b-0
                          hover:bg-emerald-50/30
                          sm:px-6
                          ${H?`opacity-60`:``}
                        `,children:[(0,j.jsx)(`button`,{type:`button`,onClick:()=>e(`/dashboard/journal-entries/${t.id}`),className:`
                            w-fit
                            rounded-lg
                            px-2
                            py-1
                            text-xs
                            font-bold
                            tabular-nums
                            text-emerald-700
                            transition
                            hover:bg-emerald-50
                          `,title:r(`عرض القيد`),children:t.entryNumber??`-`}),(0,j.jsx)(`span`,{className:`truncate text-xs tabular-nums text-gray-400`,children:ge(t.entryDate)}),(0,j.jsxs)(`button`,{type:`button`,onClick:()=>e(`/dashboard/journal-entries/${t.id}`),className:`
                            flex
                            min-w-0
                            flex-col
                            items-start
                            gap-1
                            text-right
                          `,title:t.description,children:[(0,j.jsxs)(`span`,{className:`
                              flex
                              w-full
                              min-w-0
                              items-center
                              gap-2
                            `,children:[(0,j.jsx)(`span`,{className:`
                                min-w-0
                                truncate
                                font-medium
                                text-gray-800
                                transition
                                group-hover:text-emerald-700
                              `,children:t.description||r(`بدون بيان`)}),(0,j.jsx)(ee,{size:13,className:`
                                shrink-0
                                text-gray-300
                                opacity-0
                                transition
                                group-hover:opacity-100
                              `})]}),h&&(0,j.jsxs)(`span`,{className:`
                                inline-flex
                                max-w-full
                                items-center
                                gap-1.5
                                rounded-md
                                bg-gray-50
                                px-2
                                py-0.5
                                text-[9px]
                                font-medium
                                text-gray-400
                              `,children:[(0,j.jsx)(m,{size:10}),h,t.sourceNumber&&(0,j.jsx)(`span`,{className:`font-bold text-gray-500`,children:t.sourceNumber})]})]}),(0,j.jsx)(`span`,{className:`
                            w-fit
                            whitespace-nowrap
                            rounded-lg
                            px-2.5
                            py-1
                            text-[10px]
                            font-semibold
                            ${i?`bg-blue-50 text-blue-700`:`bg-gray-100 text-gray-600`}
                          `,children:_e(t.entryType)}),(0,j.jsx)(`div`,{className:`flex items-center`,children:(0,j.jsx)(we,{currency:p,multi:d})}),(0,j.jsxs)(`div`,{className:`flex min-w-0 items-center justify-end gap-1.5`,children:[(0,j.jsx)(`span`,{className:`
                              truncate
                              text-left
                              text-sm
                              font-semibold
                              tabular-nums
                              text-gray-800
                            `,children:U(t.totalDebit)}),p&&!d&&(0,j.jsx)(`span`,{className:`text-[9px] font-semibold text-gray-400`,children:p})]}),(0,j.jsxs)(`div`,{className:`flex min-w-0 items-center justify-end gap-1.5`,children:[(0,j.jsx)(`span`,{className:`
                              truncate
                              text-left
                              text-sm
                              font-semibold
                              tabular-nums
                              text-gray-800
                            `,children:U(t.totalCredit)}),p&&!d&&(0,j.jsx)(`span`,{className:`text-[9px] font-semibold text-gray-400`,children:p})]}),(0,j.jsx)(`span`,{className:`
                            w-fit
                            whitespace-nowrap
                            rounded-lg
                            px-2.5
                            py-1
                            text-[10px]
                            font-semibold
                            ${o?`bg-red-50 text-red-600`:`bg-emerald-50 text-emerald-700`}
                          `,children:ve(t.status)}),(0,j.jsx)(`div`,{className:`flex justify-end gap-1`,children:s?(0,j.jsxs)(j.Fragment,{children:[(0,j.jsx)(v.button,{type:`button`,whileTap:{scale:.9},onClick:()=>e(`/dashboard/journal-entries/${t.id}/edit`),title:r(`تعديل`),className:`
                                  flex
                                  h-8
                                  w-8
                                  items-center
                                  justify-center
                                  rounded-lg
                                  text-gray-400
                                  transition-all
                                  hover:bg-emerald-50
                                  hover:text-emerald-700
                                `,children:(0,j.jsx)(f,{size:15})}),(0,j.jsx)(v.button,{type:`button`,whileTap:{scale:.9},disabled:q,onClick:()=>De(t),title:r(`حذف`),className:`
                                  flex
                                  h-8
                                  w-8
                                  items-center
                                  justify-center
                                  rounded-lg
                                  text-gray-400
                                  transition-all
                                  hover:bg-red-50
                                  hover:text-red-600
                                  disabled:opacity-40
                                `,children:q?(0,j.jsx)(b,{size:14,className:`animate-spin`}):(0,j.jsx)(se,{size:15})})]}):(0,j.jsx)(v.button,{type:`button`,whileTap:{scale:.9},onClick:()=>e(`/dashboard/journal-entries/${t.id}`),title:r(`عرض`),className:`
                                flex
                                h-8
                                w-8
                                items-center
                                justify-center
                                rounded-lg
                                text-gray-400
                                transition-all
                                hover:bg-gray-100
                                hover:text-gray-800
                              `,children:(0,j.jsx)(u,{size:16})})})]},t.id)})}),!V&&J.length===0&&(0,j.jsxs)(v.div,{initial:{opacity:0,y:8},animate:{opacity:1,y:0},className:`
                    flex
                    min-h-[330px]
                    flex-col
                    items-center
                    justify-center
                    px-6
                    py-14
                    text-center
                  `,children:[(0,j.jsx)(`div`,{className:`
                      mb-4
                      flex
                      h-16
                      w-16
                      items-center
                      justify-center
                      rounded-2xl
                      bg-gray-100
                      text-gray-400
                    `,children:(0,j.jsx)(m,{size:26})}),(0,j.jsx)(`h3`,{className:`mb-1 text-sm font-semibold text-gray-700`,children:r(`لا توجد قيود مطابقة`)}),(0,j.jsx)(`p`,{className:`max-w-sm text-xs leading-5 text-gray-400`,children:r(`لم يتم العثور على قيود تطابق معايير البحث والتصفية الحالية.`)}),$&&(0,j.jsxs)(v.button,{type:`button`,whileTap:{scale:.97},onClick:Q,className:`
                        mt-5
                        inline-flex
                        items-center
                        gap-1.5
                        rounded-xl
                        border
                        border-gray-200
                        bg-white
                        px-3.5
                        py-2
                        text-xs
                        font-medium
                        text-gray-600
                        shadow-sm
                        transition
                        hover:bg-gray-50
                      `,children:[(0,j.jsx)(x,{size:13}),r(`إعادة ضبط الفلاتر`)]})]})]})})}),B?.totalCount>0&&(0,j.jsx)(ue,{page:M,pageSize:P,totalCount:B.totalCount,totalPages:B?.totalPages??1,isFetching:H,onPageChange:N,onPageSizeChange:e=>{F(e),N(1)},label:r(`قيد`)})]}),(0,j.jsx)(`div`,{style:{display:`none`},children:(0,j.jsx)(`div`,{ref:Y,children:(0,j.jsx)(fe,{entries:J,filters:{...S,fiscalYearName:R?.label},summary:X})})})]})}export{K as default};