import{a as e}from"./rolldown-runtime-BWaJ3C7D.js";import{A as t,E as n,J as r,O as i,t as a}from"./jsx-runtime-CwlwA8cZ.js";import{t as o}from"./createLucideIcon-CuxSvYvq.js";import{at as s,rt as c}from"./index-BeUNrxgE.js";var l=o(`chevrons-left`,[[`path`,{d:`m11 17-5-5 5-5`,key:`13zhaf`}],[`path`,{d:`m18 17-5-5 5-5`,key:`h8a8et`}]]),u=o(`chevrons-right`,[[`path`,{d:`m6 17 5-5-5-5`,key:`xnjwq`}],[`path`,{d:`m13 17 5-5-5-5`,key:`17xmmf`}]]),d=e(r(),1),f=a(),p=[25,50,75,100];function m({page:e,pageSize:r,totalCount:a,onPageChange:o,onPageSizeChange:m,label:g=t(`عنصر`)}){let _=Math.max(1,Number(r)||25),v=Math.max(0,Number(a)||0),y=Math.max(1,Math.ceil(v/_)),b=Math.min(Math.max(1,Number(e)||1),y),x=v===0?0:(b-1)*_+1,S=Math.min(b*_,v),C=(0,d.useMemo)(()=>{let e=[],t=Math.max(2,b-1),n=Math.min(y-1,b+1);e.push(1),t>2&&e.push(`left-dots`);for(let r=t;r<=n;r++)e.push(r);return n<y-1&&e.push(`right-dots`),y>1&&e.push(y),e},[b,y]),w=e=>{let t=Math.min(Math.max(1,e),y);t!==b&&o(t)},T=e=>{let t=Number(e.target.value);!Number.isFinite(t)||t<=0||(m(t),b!==1&&o(1))},E=b===1,D=b===y;return(0,f.jsxs)(`nav`,{"aria-label":t(`التنقل بين الصفحات`),dir:n(),className:`
        mt-4
        rounded-2xl
        border
        border-ink-400/10
        bg-white
        p-3
        shadow-sm
        dark:border-dark-border
        dark:bg-dark-surface
        dark:shadow-dark-card
        sm:p-4
      `,children:[(0,f.jsxs)(`div`,{className:`
          flex
          flex-col
          gap-4
          sm:flex-row
          sm:items-center
          sm:justify-between
        `,children:[(0,f.jsxs)(`div`,{className:`
            flex
            flex-wrap
            items-center
            justify-center
            gap-x-3
            gap-y-2
            text-xs
            text-ink-500
            sm:justify-start
          `,children:[(0,f.jsxs)(`span`,{className:`whitespace-nowrap`,children:[t(`عرض`),` `,(0,f.jsx)(`strong`,{className:`font-semibold text-ink-800`,children:x.toLocaleString(i(),{maximumFractionDigits:2})}),` `,`-`,` `,(0,f.jsx)(`strong`,{className:`font-semibold text-ink-800`,children:S.toLocaleString(i(),{maximumFractionDigits:2})}),` `,t(`من أصل`),` `,(0,f.jsx)(`strong`,{className:`font-semibold text-ink-800`,children:v.toLocaleString(i(),{maximumFractionDigits:2})}),` `,g]}),(0,f.jsx)(`span`,{className:`hidden h-4 w-px bg-ink-400/15 sm:block`}),(0,f.jsxs)(`label`,{className:`
              flex
              items-center
              gap-2
              whitespace-nowrap
              text-ink-500
            `,children:[(0,f.jsx)(`span`,{children:t(`عرض`)}),(0,f.jsxs)(`span`,{className:`relative`,children:[(0,f.jsx)(`select`,{value:_,onChange:T,"aria-label":t(`عدد العناصر في الصفحة`),className:`
                  h-9
                  cursor-pointer
                  appearance-none
                  rounded-xl
                  border
                  border-ink-400/15
                  bg-ink-400/[0.025]
                  px-3
                  pe-8
                  text-xs
                  font-semibold
                  text-ink-800
                  outline-none
                  transition-all
                  duration-200

                  hover:border-ink-400/25
                  hover:bg-ink-400/[0.05]

                  focus:border-primary-500
                  focus:bg-white
                  focus:ring-4
                  focus:ring-primary-500/10

                  dark:border-dark-border
                  dark:bg-white/[0.05]
                  dark:text-ink-200
                  dark:hover:border-white/[0.15]
                  dark:hover:bg-white/[0.08]
                  dark:focus:bg-dark-surface
                `,children:p.map(e=>(0,f.jsx)(`option`,{value:e,children:e},e))}),(0,f.jsx)(s,{size:14,"aria-hidden":`true`,className:`
                  pointer-events-none
                  absolute
                  end-2
                  top-1/2
                  -translate-y-1/2
                  text-ink-400
                `})]}),(0,f.jsx)(`span`,{children:t(`لكل صفحة`)})]})]}),(0,f.jsxs)(`div`,{className:`
            flex
            items-center
            justify-center
            gap-1
          `,children:[(0,f.jsx)(h,{label:t(`الصفحة الأولى`),disabled:E,onClick:()=>w(1),children:(0,f.jsx)(u,{size:17,strokeWidth:1.8})}),(0,f.jsx)(h,{label:t(`الصفحة السابقة`),disabled:E,onClick:()=>w(b-1),children:(0,f.jsx)(c,{size:17,strokeWidth:1.8})}),(0,f.jsx)(`div`,{className:`mx-1 flex items-center gap-1`,children:C.map((e,n)=>{if(typeof e!=`number`)return(0,f.jsx)(`span`,{"aria-hidden":`true`,className:`
                      flex
                      h-9
                      w-6
                      items-center
                      justify-center
                      text-xs
                      font-semibold
                      text-ink-400
                    `,children:`•••`},`${e}-${n}`);let r=e===b;return(0,f.jsx)(`button`,{type:`button`,onClick:()=>w(e),"aria-label":t(`الانتقال إلى الصفحة {0}`,{0:e}),"aria-current":r?`page`:void 0,className:`
                    flex
                    h-9
                    min-w-9
                    items-center
                    justify-center
                    rounded-xl
                    px-2
                    text-xs
                    font-semibold
                    transition-all
                    duration-200
                    active:scale-95
                    focus:outline-none
                    focus-visible:ring-4
                    focus-visible:ring-primary-500/15

                    ${r?`
                          bg-primary-500
                          text-white
                          shadow-sm
                          shadow-primary-500/20
                        `:`
                          text-ink-600
                          hover:bg-ink-400/[0.06]
                          hover:text-ink-900
                          dark:text-ink-300
                          dark:hover:bg-white/[0.07]
                          dark:hover:text-white
                        `}
                  `,children:e.toLocaleString(i(),{maximumFractionDigits:2})},e)})}),(0,f.jsx)(h,{label:t(`الصفحة التالية`),disabled:D,onClick:()=>w(b+1),children:(0,f.jsx)(s,{size:17,strokeWidth:1.8})}),(0,f.jsx)(h,{label:t(`الصفحة الأخيرة`),disabled:D,onClick:()=>w(y),children:(0,f.jsx)(l,{size:17,strokeWidth:1.8})})]})]}),y>1&&(0,f.jsxs)(`div`,{className:`
            mt-3
            flex
            items-center
            justify-center
            border-t
            border-ink-400/10
            pt-3
            text-[11px]
            text-ink-400
            sm:hidden
          `,children:[t(`صفحة`),` `,(0,f.jsx)(`strong`,{className:`mx-1 font-bold text-ink-700`,children:b.toLocaleString(i(),{maximumFractionDigits:2})}),` `,t(`من`),` `,(0,f.jsx)(`strong`,{className:`mx-1 font-bold text-ink-700`,children:y.toLocaleString(i(),{maximumFractionDigits:2})})]})]})}function h({children:e,disabled:t,onClick:n,label:r}){return(0,f.jsx)(`button`,{type:`button`,onClick:n,disabled:t,"aria-label":r,title:r,className:`
        flex
        h-9
        w-9
        shrink-0
        items-center
        justify-center
        rounded-xl
        border
        border-ink-400/10
        bg-white
        text-ink-500

        transition-all
        duration-200

        hover:border-ink-400/20
        hover:bg-ink-400/[0.05]
        hover:text-ink-900

        active:scale-95

        focus:outline-none
        focus-visible:ring-4
        focus-visible:ring-primary-500/10

        disabled:pointer-events-none
        disabled:cursor-not-allowed
        disabled:opacity-30

        dark:border-dark-border
        dark:bg-dark-elevated
        dark:text-ink-300
        dark:hover:border-white/[0.15]
        dark:hover:bg-white/[0.07]
        dark:hover:text-white
      `,children:e})}export{m as t};