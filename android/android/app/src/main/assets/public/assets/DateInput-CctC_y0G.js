import{a as e}from"./rolldown-runtime-BWaJ3C7D.js";import{A as t,J as n,t as r}from"./jsx-runtime-CwlwA8cZ.js";import{t as i}from"./calendar-days-CaxoOGw8.js";import{i as a,n as o}from"./index-BeUNrxgE.js";var s=e(n(),1),c=r(),l=/^\d{4}-\d{2}-\d{2}/;function u({value:e,onChange:n,name:r,id:u,className:d=``,placeholder:f=t(`يوم/شهر/سنة`),disabled:p=!1,required:m=!1,readOnly:h=!1,min:g,max:_,autoFocus:v=!1,onFocus:y,onBlur:b,onClick:x,dark:S=!1,ref:C,type:w,...T}){let E=e!==void 0,[D,O]=(0,s.useState)(()=>o(e)),[k,A]=(0,s.useState)(!1),j=(0,s.useRef)(null);(0,s.useEffect)(()=>{E&&!k&&O(o(e))},[e,k,E]);let M=e=>{j.current=e,typeof C==`function`?C(e):C&&(C.current=e)};(0,s.useLayoutEffect)(()=>{let e=j.current;if(!e||E)return;O(o(e.value));let t=Object.getOwnPropertyDescriptor(e,`value`),n=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(e),`value`),r=t||n;if(r)return Object.defineProperty(e,"value",{configurable:!0,get(){return r.get.call(this)},set(e){r.set.call(this,e),O(l.test(String(e))?o(e):String(e))}}),()=>{try{delete e.value}catch{}}},[E]);let N=e=>{n?.({target:{name:r,id:u,value:e}})},P=e=>{let t=e.target.value.replace(/\D/g,``).slice(0,8),n=t;if(t.length>4?n=`${t.slice(0,2)}/${t.slice(2,4)}/${t.slice(4)}`:t.length>2&&(n=`${t.slice(0,2)}/${t.slice(2)}`),O(n),t.length===8){let e=a(n);e&&(N(e),j.current&&(j.current.value=e))}else t.length===0&&(N(``),j.current&&(j.current.value=``))},F=e=>{let t=e.target.value;O(o(t)),N(t)},I=e=>{A(!0),y?.(e)},L=t=>{A(!1),E?O(o(e)):j.current&&O(o(j.current.value)),b?.(t)},R=e=>{e?.preventDefault?.(),e?.stopPropagation?.();let t=j.current;if(!(!t||p||h)){if(typeof t.showPicker==`function`)try{t.showPicker();return}catch{}t.focus(),t.click()}};return(0,c.jsxs)(`div`,{className:`relative w-full`,children:[(0,c.jsx)(`input`,{type:`text`,inputMode:`numeric`,autoComplete:`off`,id:u,value:D,onChange:P,onFocus:I,onBlur:L,onClick:x,placeholder:f,disabled:p,readOnly:h,required:m,autoFocus:v,className:`${d} pe-9 num`,...T}),(0,c.jsx)(`button`,{type:`button`,tabIndex:-1,disabled:p||h,onClick:R,"aria-label":t(`اختيار التاريخ`),className:`
          absolute
          inset-y-0
          end-0
          flex
          w-9
          items-center
          justify-center
          opacity-60
          transition
          hover:opacity-100
          disabled:cursor-not-allowed
          ${S?`text-white`:`text-ink-500`}
        `,children:(0,c.jsx)(i,{className:`h-4 w-4`})}),(0,c.jsx)(`input`,{ref:M,type:`date`,name:r,min:g,max:_,disabled:p,readOnly:h,tabIndex:-1,"aria-hidden":`true`,onChange:F,...E?{value:e||``}:{},className:`
          absolute
          inset-y-0
          end-0
          h-full
          w-9
          opacity-0
          pointer-events-none
        `})]})}export{u as t};