import{t as e}from"./DateInput-CctC_y0G.js";import{t}from"./jsx-runtime-CwlwA8cZ.js";var n=t(),r=`
  w-full
  min-h-10
  rounded-xl
  border
  bg-white
  px-3.5
  py-2.5
  text-sm
  font-medium
  text-ink-900
  placeholder:text-ink-400

  dark:bg-dark-surface
  dark:text-ink-100
  dark:placeholder:text-ink-300/60

  outline-none

  transition-[border-color,box-shadow,background-color]
  duration-200
  ease-out

  hover:border-ink-400/25

  focus:bg-white
  focus:ring-4

  disabled:cursor-not-allowed
  disabled:bg-ink-400/[0.04]
  disabled:text-ink-400
  disabled:opacity-70

  dark:hover:border-white/[0.15]
  dark:focus:bg-dark-surface
  dark:disabled:bg-white/[0.04]
  dark:disabled:text-ink-300/60
`;function i({label:t,error:i,className:a=``,id:o,required:s=!1,disabled:c=!1,type:l,...u}){let d=o||u.name,f=l===`date`,p=`${r} ${i?`
      border-negative/60
      focus:border-negative
      focus:ring-negative/10
    `:`
      border-ink-400/15
      focus:border-primary-500
      focus:ring-primary-500/10
    `} ${a}`;return(0,n.jsxs)(`div`,{className:`w-full`,children:[t&&(0,n.jsxs)(`label`,{htmlFor:d,className:`
            mb-1.5
            block
            text-sm
            font-semibold
            text-ink-800
          `,children:[t,s&&(0,n.jsx)(`span`,{className:`ms-1 text-negative`,"aria-hidden":`true`,children:`*`})]}),f?(0,n.jsx)(e,{id:d,disabled:c,required:s,"aria-invalid":!!i,"aria-describedby":i?`${d}-error`:void 0,className:p,...u}):(0,n.jsx)(`input`,{id:d,type:l,disabled:c,required:s,"aria-invalid":!!i,"aria-describedby":i?`${d}-error`:void 0,className:p,...u}),i&&(0,n.jsxs)(`p`,{id:`${d}-error`,role:`alert`,className:`
            mt-1.5
            flex
            items-center
            gap-1
            text-xs
            font-medium
            text-negative
          `,children:[(0,n.jsx)(`span`,{"aria-hidden":`true`,className:`
              inline-flex
              h-1.5
              w-1.5
              shrink-0
              rounded-full
              bg-negative
            `}),i]})]})}export{i as t};