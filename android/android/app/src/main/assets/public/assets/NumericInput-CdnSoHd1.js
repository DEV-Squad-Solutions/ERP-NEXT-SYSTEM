import{a as e}from"./rolldown-runtime-BWaJ3C7D.js";import{J as t,t as n}from"./jsx-runtime-CwlwA8cZ.js";var r=e(t(),1),i=n(),a=(0,r.forwardRef)(({value:e,onChange:t,placeholder:n=``,className:r=``,decimals:a=!0,maxDecimals:o=2,...s},c)=>(0,i.jsx)(`input`,{ref:c,type:`text`,inputMode:a?`decimal`:`numeric`,value:e??``,onChange:e=>{let n=e.target.value;if(n===``){t?.(``);return}if(!a){if(!/^\d*$/.test(n))return;t?.(n);return}if(n=n.replace(`,`,`.`),!/^\d*\.?\d*$/.test(n))return;let r=n.indexOf(`.`);r!==-1&&n.indexOf(`.`,r+1)!==-1||r!==-1&&n.slice(r+1).length>o||t?.(n)},placeholder:n,className:`
          w-full
          min-w-0
          rounded-lg
          border
          border-ink-400/15
          bg-white
          px-2.5
          py-2
          text-sm
          text-center
          num
          outline-none
          transition
          focus:border-primary-500
          focus:ring-2
          focus:ring-primary-500/10
          ${r}
        `,...s}));a.displayName=`NumericInput`;export{a as t};