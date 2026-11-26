import{A as e,t}from"./jsx-runtime-CwlwA8cZ.js";var n=t(),r={primary:`bg-primary-500 text-white shadow-sm hover:bg-primary-600 hover:shadow-card focus-visible:ring-primary-500/30`,gold:`bg-gold-500 text-white shadow-sm hover:bg-gold-600 hover:shadow-card focus-visible:ring-gold-500/30`,outline:`border border-ink-400/20 bg-white text-ink-900 shadow-sm hover:bg-ink-400/5 hover:border-ink-400/30 focus-visible:ring-ink-400/20 dark:border-dark-border dark:bg-transparent dark:text-ink-100 dark:hover:bg-white/[0.06] dark:hover:border-white/[0.12] dark:hover:text-white`,ghost:`bg-transparent text-ink-500 hover:bg-ink-400/5 hover:text-ink-900 focus-visible:ring-ink-400/20 dark:text-ink-300 dark:hover:bg-white/[0.06] dark:hover:text-white`,danger:`bg-negative text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-500/30`};function i({variant:t=`primary`,className:i=``,children:a,loading:o=!1,loadingText:s,disabled:c=!1,type:l=`button`,...u}){let d=r[t]||r.primary;return(0,n.jsx)(`button`,{type:l,disabled:c||o,"aria-busy":o,className:`
        inline-flex
        min-h-10
        items-center
        justify-center
        gap-2
        rounded-xl
        px-4
        py-2.5
        text-sm
        font-semibold
        leading-none
        whitespace-nowrap

        transition-[background-color,color,border-color,box-shadow,transform]
        duration-200
        ease-out

        focus:outline-none
        focus-visible:ring-4

        active:scale-[0.97]
        hover:-translate-y-[1px]

        disabled:pointer-events-none
        disabled:cursor-not-allowed
        disabled:opacity-50
        disabled:transform-none

        ${d}
        ${i}
      `,...u,children:o?(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(`span`,{className:`
              h-4
              w-4
              shrink-0
              animate-spin
              rounded-full
              border-2
              border-current
              border-t-transparent
            `,"aria-hidden":`true`}),(0,n.jsx)(`span`,{children:s||e(`جاري التنفيذ...`)})]}):a})}export{i as t};