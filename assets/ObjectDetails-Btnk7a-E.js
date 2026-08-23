var bt=r=>{throw TypeError(r)};var ot=(r,t,e)=>t.has(r)||bt("Cannot "+e);var O=(r,t,e)=>(ot(r,t,"read from private field"),e?e.call(r):t.get(r)),M=(r,t,e)=>t.has(r)?bt("Cannot add the same private member more than once"):t instanceof WeakSet?t.add(r):t.set(r,e),G=(r,t,e,s)=>(ot(r,t,"write to private field"),s?s.call(r,e):t.set(r,e),e),Q=(r,t,e)=>(ot(r,t,"access private method"),e);import{_ as Zt,k as X,c as Gt,l as Qt,a as at,o as Y,d as _,w as b,r as R,U as Xt,M as D,b as A,F as Yt,q as te,t as At,g as ee,h as se,i as wt,a5 as St,e as ie}from"./index-9C4SOe2A.js";/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const et=globalThis,gt=et.ShadowRoot&&(et.ShadyCSS===void 0||et.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,vt=Symbol(),Et=new WeakMap;let Ht=class{constructor(t,e,s){if(this._$cssResult$=!0,s!==vt)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o;const e=this.t;if(gt&&t===void 0){const s=e!==void 0&&e.length===1;s&&(t=Et.get(e)),t===void 0&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),s&&Et.set(e,t))}return t}toString(){return this.cssText}};const re=r=>new Ht(typeof r=="string"?r:r+"",void 0,vt),ne=(r,...t)=>{const e=r.length===1?r[0]:t.reduce((s,i,n)=>s+(o=>{if(o._$cssResult$===!0)return o.cssText;if(typeof o=="number")return o;throw Error("Value passed to 'css' function must be a 'css' function result: "+o+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+r[n+1],r[0]);return new Ht(e,r,vt)},oe=(r,t)=>{if(gt)r.adoptedStyleSheets=t.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(const e of t){const s=document.createElement("style"),i=et.litNonce;i!==void 0&&s.setAttribute("nonce",i),s.textContent=e.cssText,r.appendChild(s)}},xt=gt?r=>r:r=>r instanceof CSSStyleSheet?(t=>{let e="";for(const s of t.cssRules)e+=s.cssText;return re(e)})(r):r;/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const{is:ae,defineProperty:le,getOwnPropertyDescriptor:ce,getOwnPropertyNames:he,getOwnPropertySymbols:de,getPrototypeOf:ue}=Object,y=globalThis,Pt=y.trustedTypes,pe=Pt?Pt.emptyScript:"",lt=y.reactiveElementPolyfillSupport,L=(r,t)=>r,st={toAttribute(r,t){switch(t){case Boolean:r=r?pe:null;break;case Object:case Array:r=r==null?r:JSON.stringify(r)}return r},fromAttribute(r,t){let e=r;switch(t){case Boolean:e=r!==null;break;case Number:e=r===null?null:Number(r);break;case Object:case Array:try{e=JSON.parse(r)}catch{e=null}}return e}},_t=(r,t)=>!ae(r,t),Ct={attribute:!0,type:String,converter:st,reflect:!1,useDefault:!1,hasChanged:_t};Symbol.metadata??(Symbol.metadata=Symbol("metadata")),y.litPropertyMetadata??(y.litPropertyMetadata=new WeakMap);let k=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??(this.l=[])).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=Ct){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){const s=Symbol(),i=this.getPropertyDescriptor(t,s,e);i!==void 0&&le(this.prototype,t,i)}}static getPropertyDescriptor(t,e,s){const{get:i,set:n}=ce(this.prototype,t)??{get(){return this[e]},set(o){this[e]=o}};return{get:i,set(o){const l=i==null?void 0:i.call(this);n==null||n.call(this,o),this.requestUpdate(t,l,s)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??Ct}static _$Ei(){if(this.hasOwnProperty(L("elementProperties")))return;const t=ue(this);t.finalize(),t.l!==void 0&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(L("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(L("properties"))){const e=this.properties,s=[...he(e),...de(e)];for(const i of s)this.createProperty(i,e[i])}const t=this[Symbol.metadata];if(t!==null){const e=litPropertyMetadata.get(t);if(e!==void 0)for(const[s,i]of e)this.elementProperties.set(s,i)}this._$Eh=new Map;for(const[e,s]of this.elementProperties){const i=this._$Eu(e,s);i!==void 0&&this._$Eh.set(i,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const e=[];if(Array.isArray(t)){const s=new Set(t.flat(1/0).reverse());for(const i of s)e.unshift(xt(i))}else t!==void 0&&e.push(xt(t));return e}static _$Eu(t,e){const s=e.attribute;return s===!1?void 0:typeof s=="string"?s:typeof t=="string"?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){var t;this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),(t=this.constructor.l)==null||t.forEach(e=>e(this))}addController(t){var e;(this._$EO??(this._$EO=new Set)).add(t),this.renderRoot!==void 0&&this.isConnected&&((e=t.hostConnected)==null||e.call(t))}removeController(t){var e;(e=this._$EO)==null||e.delete(t)}_$E_(){const t=new Map,e=this.constructor.elementProperties;for(const s of e.keys())this.hasOwnProperty(s)&&(t.set(s,this[s]),delete this[s]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return oe(t,this.constructor.elementStyles),t}connectedCallback(){var t;this.renderRoot??(this.renderRoot=this.createRenderRoot()),this.enableUpdating(!0),(t=this._$EO)==null||t.forEach(e=>{var s;return(s=e.hostConnected)==null?void 0:s.call(e)})}enableUpdating(t){}disconnectedCallback(){var t;(t=this._$EO)==null||t.forEach(e=>{var s;return(s=e.hostDisconnected)==null?void 0:s.call(e)})}attributeChangedCallback(t,e,s){this._$AK(t,s)}_$ET(t,e){var n;const s=this.constructor.elementProperties.get(t),i=this.constructor._$Eu(t,s);if(i!==void 0&&s.reflect===!0){const o=(((n=s.converter)==null?void 0:n.toAttribute)!==void 0?s.converter:st).toAttribute(e,s.type);this._$Em=t,o==null?this.removeAttribute(i):this.setAttribute(i,o),this._$Em=null}}_$AK(t,e){var n,o;const s=this.constructor,i=s._$Eh.get(t);if(i!==void 0&&this._$Em!==i){const l=s.getPropertyOptions(i),a=typeof l.converter=="function"?{fromAttribute:l.converter}:((n=l.converter)==null?void 0:n.fromAttribute)!==void 0?l.converter:st;this._$Em=i;const u=a.fromAttribute(e,l.type);this[i]=u??((o=this._$Ej)==null?void 0:o.get(i))??u,this._$Em=null}}requestUpdate(t,e,s,i=!1,n){var o;if(t!==void 0){const l=this.constructor;if(i===!1&&(n=this[t]),s??(s=l.getPropertyOptions(t)),!((s.hasChanged??_t)(n,e)||s.useDefault&&s.reflect&&n===((o=this._$Ej)==null?void 0:o.get(t))&&!this.hasAttribute(l._$Eu(t,s))))return;this.C(t,e,s)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(t,e,{useDefault:s,reflect:i,wrapped:n},o){s&&!(this._$Ej??(this._$Ej=new Map)).has(t)&&(this._$Ej.set(t,o??e??this[t]),n!==!0||o!==void 0)||(this._$AL.has(t)||(this.hasUpdated||s||(e=void 0),this._$AL.set(t,e)),i===!0&&this._$Em!==t&&(this._$Eq??(this._$Eq=new Set)).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}const t=this.scheduleUpdate();return t!=null&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){var s;if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??(this.renderRoot=this.createRenderRoot()),this._$Ep){for(const[n,o]of this._$Ep)this[n]=o;this._$Ep=void 0}const i=this.constructor.elementProperties;if(i.size>0)for(const[n,o]of i){const{wrapped:l}=o,a=this[n];l!==!0||this._$AL.has(n)||a===void 0||this.C(n,void 0,o,a)}}let t=!1;const e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),(s=this._$EO)==null||s.forEach(i=>{var n;return(n=i.hostUpdate)==null?void 0:n.call(i)}),this.update(e)):this._$EM()}catch(i){throw t=!1,this._$EM(),i}t&&this._$AE(e)}willUpdate(t){}_$AE(t){var e;(e=this._$EO)==null||e.forEach(s=>{var i;return(i=s.hostUpdated)==null?void 0:i.call(s)}),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&(this._$Eq=this._$Eq.forEach(e=>this._$ET(e,this[e]))),this._$EM()}updated(t){}firstUpdated(t){}};k.elementStyles=[],k.shadowRootOptions={mode:"open"},k[L("elementProperties")]=new Map,k[L("finalized")]=new Map,lt==null||lt({ReactiveElement:k}),(y.reactiveElementVersions??(y.reactiveElementVersions=[])).push("2.1.2");/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const B=globalThis,Ot=r=>r,it=B.trustedTypes,Nt=it?it.createPolicy("lit-html",{createHTML:r=>r}):void 0,zt="$lit$",m=`lit$${Math.random().toFixed(9).slice(2)}$`,Lt="?"+m,fe=`<${Lt}>`,x=document,F=()=>x.createComment(""),q=r=>r===null||typeof r!="object"&&typeof r!="function",mt=Array.isArray,$e=r=>mt(r)||typeof(r==null?void 0:r[Symbol.iterator])=="function",ct=`[ 	
\f\r]`,H=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,kt=/-->/g,jt=/>/g,w=RegExp(`>|${ct}(?:([^\\s"'>=/]+)(${ct}*=${ct}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),It=/'/g,Tt=/"/g,Bt=/^(?:script|style|textarea|title)$/i,ge=r=>(t,...e)=>({_$litType$:r,strings:t,values:e}),N=ge(1),P=Symbol.for("lit-noChange"),f=Symbol.for("lit-nothing"),Ut=new WeakMap,S=x.createTreeWalker(x,129);function Vt(r,t){if(!mt(r)||!r.hasOwnProperty("raw"))throw Error("invalid template strings array");return Nt!==void 0?Nt.createHTML(t):t}const ve=(r,t)=>{const e=r.length-1,s=[];let i,n=t===2?"<svg>":t===3?"<math>":"",o=H;for(let l=0;l<e;l++){const a=r[l];let u,h,c=-1,d=0;for(;d<a.length&&(o.lastIndex=d,h=o.exec(a),h!==null);)d=o.lastIndex,o===H?h[1]==="!--"?o=kt:h[1]!==void 0?o=jt:h[2]!==void 0?(Bt.test(h[2])&&(i=RegExp("</"+h[2],"g")),o=w):h[3]!==void 0&&(o=w):o===w?h[0]===">"?(o=i??H,c=-1):h[1]===void 0?c=-2:(c=o.lastIndex-h[2].length,u=h[1],o=h[3]===void 0?w:h[3]==='"'?Tt:It):o===Tt||o===It?o=w:o===kt||o===jt?o=H:(o=w,i=void 0);const p=o===w&&r[l+1].startsWith("/>")?" ":"";n+=o===H?a+fe:c>=0?(s.push(u),a.slice(0,c)+zt+a.slice(c)+m+p):a+m+(c===-2?l:p)}return[Vt(r,n+(r[e]||"<?>")+(t===2?"</svg>":t===3?"</math>":"")),s]};class J{constructor({strings:t,_$litType$:e},s){let i;this.parts=[];let n=0,o=0;const l=t.length-1,a=this.parts,[u,h]=ve(t,e);if(this.el=J.createElement(u,s),S.currentNode=this.el.content,e===2||e===3){const c=this.el.content.firstChild;c.replaceWith(...c.childNodes)}for(;(i=S.nextNode())!==null&&a.length<l;){if(i.nodeType===1){if(i.hasAttributes())for(const c of i.getAttributeNames())if(c.endsWith(zt)){const d=h[o++],p=i.getAttribute(c).split(m),$=/([.?@])?(.*)/.exec(d);a.push({type:1,index:n,name:$[2],strings:p,ctor:$[1]==="."?me:$[1]==="?"?ye:$[1]==="@"?be:rt}),i.removeAttribute(c)}else c.startsWith(m)&&(a.push({type:6,index:n}),i.removeAttribute(c));if(Bt.test(i.tagName)){const c=i.textContent.split(m),d=c.length-1;if(d>0){i.textContent=it?it.emptyScript:"";for(let p=0;p<d;p++)i.append(c[p],F()),S.nextNode(),a.push({type:2,index:++n});i.append(c[d],F())}}}else if(i.nodeType===8)if(i.data===Lt)a.push({type:2,index:n});else{let c=-1;for(;(c=i.data.indexOf(m,c+1))!==-1;)a.push({type:7,index:n}),c+=m.length-1}n++}}static createElement(t,e){const s=x.createElement("template");return s.innerHTML=t,s}}function U(r,t,e=r,s){var o,l;if(t===P)return t;let i=s!==void 0?(o=e._$Co)==null?void 0:o[s]:e._$Cl;const n=q(t)?void 0:t._$litDirective$;return(i==null?void 0:i.constructor)!==n&&((l=i==null?void 0:i._$AO)==null||l.call(i,!1),n===void 0?i=void 0:(i=new n(r),i._$AT(r,e,s)),s!==void 0?(e._$Co??(e._$Co=[]))[s]=i:e._$Cl=i),i!==void 0&&(t=U(r,i._$AS(r,t.values),i,s)),t}class _e{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:e},parts:s}=this._$AD,i=((t==null?void 0:t.creationScope)??x).importNode(e,!0);S.currentNode=i;let n=S.nextNode(),o=0,l=0,a=s[0];for(;a!==void 0;){if(o===a.index){let u;a.type===2?u=new K(n,n.nextSibling,this,t):a.type===1?u=new a.ctor(n,a.name,a.strings,this,t):a.type===6&&(u=new Ae(n,this,t)),this._$AV.push(u),a=s[++l]}o!==(a==null?void 0:a.index)&&(n=S.nextNode(),o++)}return S.currentNode=x,i}p(t){let e=0;for(const s of this._$AV)s!==void 0&&(s.strings!==void 0?(s._$AI(t,s,e),e+=s.strings.length-2):s._$AI(t[e])),e++}}class K{get _$AU(){var t;return((t=this._$AM)==null?void 0:t._$AU)??this._$Cv}constructor(t,e,s,i){this.type=2,this._$AH=f,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=s,this.options=i,this._$Cv=(i==null?void 0:i.isConnected)??!0}get parentNode(){let t=this._$AA.parentNode;const e=this._$AM;return e!==void 0&&(t==null?void 0:t.nodeType)===11&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=U(this,t,e),q(t)?t===f||t==null||t===""?(this._$AH!==f&&this._$AR(),this._$AH=f):t!==this._$AH&&t!==P&&this._(t):t._$litType$!==void 0?this.$(t):t.nodeType!==void 0?this.T(t):$e(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==f&&q(this._$AH)?this._$AA.nextSibling.data=t:this.T(x.createTextNode(t)),this._$AH=t}$(t){var n;const{values:e,_$litType$:s}=t,i=typeof s=="number"?this._$AC(t):(s.el===void 0&&(s.el=J.createElement(Vt(s.h,s.h[0]),this.options)),s);if(((n=this._$AH)==null?void 0:n._$AD)===i)this._$AH.p(e);else{const o=new _e(i,this),l=o.u(this.options);o.p(e),this.T(l),this._$AH=o}}_$AC(t){let e=Ut.get(t.strings);return e===void 0&&Ut.set(t.strings,e=new J(t)),e}k(t){mt(this._$AH)||(this._$AH=[],this._$AR());const e=this._$AH;let s,i=0;for(const n of t)i===e.length?e.push(s=new K(this.O(F()),this.O(F()),this,this.options)):s=e[i],s._$AI(n),i++;i<e.length&&(this._$AR(s&&s._$AB.nextSibling,i),e.length=i)}_$AR(t=this._$AA.nextSibling,e){var s;for((s=this._$AP)==null?void 0:s.call(this,!1,!0,e);t!==this._$AB;){const i=Ot(t).nextSibling;Ot(t).remove(),t=i}}setConnected(t){var e;this._$AM===void 0&&(this._$Cv=t,(e=this._$AP)==null||e.call(this,t))}}class rt{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,s,i,n){this.type=1,this._$AH=f,this._$AN=void 0,this.element=t,this.name=e,this._$AM=i,this.options=n,s.length>2||s[0]!==""||s[1]!==""?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=f}_$AI(t,e=this,s,i){const n=this.strings;let o=!1;if(n===void 0)t=U(this,t,e,0),o=!q(t)||t!==this._$AH&&t!==P,o&&(this._$AH=t);else{const l=t;let a,u;for(t=n[0],a=0;a<n.length-1;a++)u=U(this,l[s+a],e,a),u===P&&(u=this._$AH[a]),o||(o=!q(u)||u!==this._$AH[a]),u===f?t=f:t!==f&&(t+=(u??"")+n[a+1]),this._$AH[a]=u}o&&!i&&this.j(t)}j(t){t===f?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class me extends rt{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===f?void 0:t}}class ye extends rt{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==f)}}class be extends rt{constructor(t,e,s,i,n){super(t,e,s,i,n),this.type=5}_$AI(t,e=this){if((t=U(this,t,e,0)??f)===P)return;const s=this._$AH,i=t===f&&s!==f||t.capture!==s.capture||t.once!==s.once||t.passive!==s.passive,n=t!==f&&(s===f||i);i&&this.element.removeEventListener(this.name,this,s),n&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){var e;typeof this._$AH=="function"?this._$AH.call(((e=this.options)==null?void 0:e.host)??this.element,t):this._$AH.handleEvent(t)}}class Ae{constructor(t,e,s){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=s}get _$AU(){return this._$AM._$AU}_$AI(t){U(this,t)}}const ht=B.litHtmlPolyfillSupport;ht==null||ht(J,K),(B.litHtmlVersions??(B.litHtmlVersions=[])).push("3.3.2");const we=(r,t,e)=>{const s=(e==null?void 0:e.renderBefore)??t;let i=s._$litPart$;if(i===void 0){const n=(e==null?void 0:e.renderBefore)??null;s._$litPart$=i=new K(t.insertBefore(F(),n),n,void 0,e??{})}return i._$AI(r),i};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const E=globalThis;let V=class extends k{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){var e;const t=super.createRenderRoot();return(e=this.renderOptions).renderBefore??(e.renderBefore=t.firstChild),t}update(t){const e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=we(e,this.renderRoot,this.renderOptions)}connectedCallback(){var t;super.connectedCallback(),(t=this._$Do)==null||t.setConnected(!0)}disconnectedCallback(){var t;super.disconnectedCallback(),(t=this._$Do)==null||t.setConnected(!1)}render(){return P}};var Dt;V._$litElement$=!0,V.finalized=!0,(Dt=E.litElementHydrateSupport)==null||Dt.call(E,{LitElement:V});const dt=E.litElementPolyfillSupport;dt==null||dt({LitElement:V});(E.litElementVersions??(E.litElementVersions=[])).push("4.2.2");/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Se={attribute:!0,type:String,converter:st,reflect:!1,hasChanged:_t},Ee=(r=Se,t,e)=>{const{kind:s,metadata:i}=e;let n=globalThis.litPropertyMetadata.get(i);if(n===void 0&&globalThis.litPropertyMetadata.set(i,n=new Map),s==="setter"&&((r=Object.create(r)).wrapped=!0),n.set(e.name,r),s==="accessor"){const{name:o}=e;return{set(l){const a=t.get.call(this);t.set.call(this,l),this.requestUpdate(o,a,r,!0,l)},init(l){return l!==void 0&&this.C(o,void 0,r,l),l}}}if(s==="setter"){const{name:o}=e;return function(l){const a=this[o];t.call(this,l),this.requestUpdate(o,a,r,!0,l)}}throw Error("Unsupported decorator location: "+s)};function Ft(r){return(t,e)=>typeof e=="object"?Ee(r,t,e):((s,i,n)=>{const o=i.hasOwnProperty(n);return i.constructor.createProperty(n,s),o?Object.getOwnPropertyDescriptor(i,n):void 0})(r,t,e)}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function qt(r){return Ft({...r,state:!0,attribute:!1})}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const xe=(r,t,e)=>(e.configurable=!0,e.enumerable=!0,Reflect.decorate&&typeof t!="object"&&Object.defineProperty(r,t,e),e);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let Pe;function Ce(r){return(t,e)=>xe(t,e,{get(){return(this.renderRoot??Pe??(Pe=document.createDocumentFragment())).querySelectorAll(r)}})}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Oe={ATTRIBUTE:1},Ne=r=>(...t)=>({_$litDirective$:r,values:t});class ke{constructor(t){}get _$AU(){return this._$AM._$AU}_$AT(t,e,s){this._$Ct=t,this._$AM=e,this._$Ci=s}_$AS(t,e){return this.update(t,e)}update(t,e){return this.render(...e)}}/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const je=Ne(class extends ke{constructor(r){var t;if(super(r),r.type!==Oe.ATTRIBUTE||r.name!=="class"||((t=r.strings)==null?void 0:t.length)>2)throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.")}render(r){return" "+Object.keys(r).filter(t=>r[t]).join(" ")+" "}update(r,[t]){var s,i;if(this.st===void 0){this.st=new Set,r.strings!==void 0&&(this.nt=new Set(r.strings.join(" ").split(/\s/).filter(n=>n!=="")));for(const n in t)t[n]&&!((s=this.nt)!=null&&s.has(n))&&this.st.add(n);return this.render(t)}const e=r.element.classList;for(const n of this.st)n in t||(e.remove(n),this.st.delete(n));for(const n in t){const o=!!t[n];o===this.st.has(n)||(i=this.nt)!=null&&i.has(n)||(o?(e.add(n),this.st.add(n)):(e.remove(n),this.st.delete(n)))}return P}});/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function*Ie(r,t){if(r!==void 0){let e=0;for(const s of r)yield t(s,e++)}}/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function ut(r,t,e){return r?t(r):e==null?void 0:e(r)}var Te=Object.defineProperty,nt=(r,t,e,s)=>{for(var i=void 0,n=r.length-1,o;n>=0;n--)(o=r[n])&&(i=o(t,e,i)||i);return i&&Te(t,e,i),i};function Ue(r){return r instanceof RegExp}function pt(r){return r===null?"null":Array.isArray(r)?"array":r.constructor.name.toLowerCase()}function z(r){return r!==Object(r)}function Me(r,{nodeCount:t=3,maxLength:e=15}={}){const s=Array.isArray(r),i=Object.keys(r),n=i.slice(0,t),o=[],l=h=>{switch(pt(h)){case"object":return Object.keys(h).length===0?"{ }":"{ ... }";case"array":return h.length===0?"[ ]":"[ ... ]";case"string":return`"${h.substring(0,e)}${h.length>e?"...":""}"`;default:return String(h)}},a=[];for(const h of n){const c=[],d=r[h];s||c.push(`${h}: `),c.push(l(d)),a.push(c.join(""))}i.length>t&&a.push("..."),o.push(a.join(", "));const u=o.join("");return s?`[ ${u} ]`:`{ ${u} }`}function*yt(r){const t=[[r,"",[]]];for(;t.length;){const[e,s,i]=t.shift();if(s&&(yield[e,s,i]),!z(e))for(const[n,o]of Object.entries(e))t.push([o,`${s}${s?".":""}${n}`,[...i,s]])}}function Re(r,t){const e=r.split("."),s=t.split("."),i=a=>a==="*",n=a=>a==="**";let o=0,l=0;for(;o<e.length;){const a=s[l],u=e[o];if(a===u||i(a))l++,o++;else if(n(a))l++,o=e.length-(s.length-l);else return!1}return l===s.length}var De={fromAttribute:r=>r&&r.trim()?JSON.parse(r):void 0,toAttribute:r=>JSON.stringify(r)},ft=r=>r!==void 0,Jt=(r,t)=>Ue(t)?!!r.match(t):Re(r,t),He=(r,t)=>t.split(".").reduce((e,s)=>e[s],r),Mt=(r,t)=>e=>({expanded:{...e.expanded,[r]:ft(t)?!!t:!e.expanded[r]}}),tt=(r,t)=>(e,s)=>{const i={};if(r)for(const[,n,o]of yt(s.data))Jt(n,r)&&(i[n]=t,o.forEach(l=>i[l]=t));return{expanded:i}},ze=r=>(t,e)=>{const s={};if(r)for(const[,i,n]of yt(e.data))Jt(i,r)?(s[i]=!1,n.forEach(o=>s[o]=!1)):s[i]=!0;return{filtered:s}},Le=()=>()=>({filtered:{}}),Rt=r=>()=>({highlight:r}),Be=ne`
    :where(:host) {
        --background-color: #2a2f3a;
        --color: #f8f8f2;
        --string-color: #a3eea0;
        --number-color: #d19a66;
        --boolean-color: #4ba7ef;
        --null-color: #df9cf3;
        --property-color: #6fb3d2;
        --preview-color: rgba(222, 175, 143, 0.9);
        --highlight-color:  #c92a2a;
        --outline-color: #e0e4e5;
        --outline-width: 1px;
        --outline-style: dotted;

        --font-family: Nimbus Mono PS, Courier New, monospace;
        --font-size: 1rem;
        --line-height: 1.2rem;

        --indent-size: 0.5rem;
        --indentguide-size: 1px;
        --indentguide-style: solid;
        --indentguide-color: #495057;
        --indentguide-color-active: #ced4da;
        --indentguide: var(--indentguide-size) var(--indentguide-style) var(--indentguide-color);
        --indentguide-active: var(--indentguide-size) var(--indentguide-style) var(--indentguide-color-active);
    }

    :host {
        display: block;
        background-color: var(--background-color);
        color: var(--color);
        font-family: var(--font-family);
        font-size: var(--font-size);
        line-height: var(--line-height);
    }

    :focus {
        outline-color: var(--outline-color);
        outline-width: var(--outline-width);
        outline-style: var(--outline-style);
    }

    .preview {
        color: var(--preview-color);
    }

    .null {
        color: var(--null-color);
    }

    .key {
        color: var(--property-color);
        display: inline-flex;
        align-items: flex-start;
    }

    .collapsable::before {
        display: inline-flex;
        font-size: 0.8em;
        content: '▶';
        width: var(--line-height);
        height: var(--line-height);
        align-items: center;
        justify-content: center;

        transition: transform 195ms ease-out;
        transform: rotate(90deg);

        color: inherit;
    }

    .collapsable--collapsed::before {
        transform: rotate(0);
    }

    .collapsable {
        cursor: pointer;
        user-select: none;
    }

    .string {
        color: var(--string-color);
    }

    .number {
        color: var(--number-color);
    }

    .boolean {
        color: var(--boolean-color);
    }

    ul {
        padding: 0;
        clear: both;
    }

    ul,
    li {
        list-style: none;
        position: relative;
    }

    li ul > li {
        position: relative;
        margin-left: calc(var(--indent-size) + var(--line-height));
        padding-left: 0px;
    }

    ul ul::before {
        content: '';
        border-left: var(--indentguide);
        position: absolute;
        left: calc(var(--line-height) / 2 - var(--indentguide-size));
        top: 0.2rem;
        bottom: 0.2rem;
    }

    ul ul:hover::before {
        border-left: var(--indentguide-active);
    }

    mark {
        background-color: var(--highlight-color);
    }
`,W,j,I,C,Wt,$t,T,Z=(T=class extends V{constructor(){super();M(this,C);M(this,W);M(this,j);M(this,I);this.state={expanded:{},filtered:{},highlight:null},this.lastFocusedItem=null,G(this,W,e=>s=>{s.preventDefault(),this.setState(Mt(e))}),G(this,j,e=>{const s=e.target;e.target===this&&Q(this,C,$t).call(this,this.lastFocusedItem||this.nodeElements[0]),s.matches('[role="treeitem"]')&&(this.lastFocusedItem&&(this.lastFocusedItem.tabIndex=-1),this.lastFocusedItem=s,this.tabIndex=-1,s.tabIndex=0)}),G(this,I,e=>{const s=e.relatedTarget;(!s||!this.contains(s))&&(this.tabIndex=0)}),this.addEventListener("focusin",O(this,j)),this.addEventListener("focusout",O(this,I))}static customRenderer(e,s){return JSON.stringify(e)}async setState(e){const s=this.state;this.state={...s,...e(s,this)}}connectedCallback(){!this.hasAttribute("data")&&!ft(this.data)&&this.setAttribute("data",this.innerText),this.setAttribute("role","node"),this.setAttribute("tabindex","0"),super.connectedCallback()}expand(e){this.setState(tt(e,!0))}expandAll(){this.setState(tt("**",!0))}collapseAll(){this.setState(tt("**",!1))}collapse(e){this.setState(tt(e,!1))}*search(e){for(const[s,i]of yt(this.data))z(s)&&String(s).match(e)&&(this.expand(i),this.updateComplete.then(()=>{const n=this.shadowRoot.querySelector(`[data-path="${i}"]`);n.scrollIntoView({behavior:"smooth",inline:"center",block:"center"}),n.focus()}),this.setState(Rt(i)),yield{value:s,path:i});this.setState(Rt(null))}filter(e){this.setState(ze(e))}resetFilter(){this.setState(Le())}renderObject(e,s){return N`
            <ul part="object" role="group">
                ${Ie(Object.entries(e),([i,n])=>{const o=s?`${s}.${i}`:i,l=z(n),a=this.state.expanded[o];return this.state.filtered[o]?f:N`
                              <li
                                  part="property"
                                  role="treeitem"
                                  data-path="${o}"
                                  aria-expanded="${a?"true":"false"}"
                                  tabindex="-1"
                                  .hidden="${this.state.filtered[o]}"
                                  aria-hidden="${this.state.filtered[o]}"
                              >
                                  <span
                                      part="key"
                                      class="${je({key:i,collapsable:!l,"collapsable--collapsed":!this.state.expanded[o]})}"
                                      @click="${l?null:O(this,W).call(this,o)}"
                                  >
                                      ${i}:
                                      ${ut(!l&&!a,()=>this.renderNodePreview(n))}
                                  </span>

                                  ${ut(l||a,()=>this.renderValue(n,o))}
                              </li>
                          `})}
            </ul>
        `}renderValue(e,s=""){return z(e)?this.renderPrimitive(e,s):this.renderObject(e,s)}renderNodePreview(e){return N`<span part="preview" class="preview"> ${Me(e)} </span>`}renderPrimitive(e,s){const i=this.state.highlight,n=pt(e),o=this.constructor.customRenderer(e,s),l=N`
            <span part="primitive primitive-${n}" class="${pt(e)}"> ${o} </span>
        `;return s===i?N`<mark part="highlight">${l}</mark>`:l}render(){const e=this.data;return N`
            <div
                part="base"
                @keydown=${Q(this,C,Wt)}
                @focusin="${O(this,j)}"
                @focusout="${O(this,I)}"
            >
                ${ut(ft(e),()=>this.renderValue(e))}
            </div>
        `}},W=new WeakMap,j=new WeakMap,I=new WeakMap,C=new WeakSet,Wt=function(e){if(!["ArrowDown","ArrowUp","ArrowRight","ArrowLeft","Home","End"].includes(e.key))return;const s=[...this.nodeElements],i=this.matches(":dir(ltr)"),n=this.matches(":dir(rtl)");if(s.length>0){e.preventDefault();const o=s.findIndex(d=>d.matches(":focus")),l=s[o],a=this.state.expanded[l.dataset.path],u=z(He(this.data,l.dataset.path)),h=d=>{const p=s[Math.max(Math.min(d,s.length-1),0)];Q(this,C,$t).call(this,p)},c=d=>{this.setState(Mt(l.dataset.path,d))};e.key==="ArrowDown"?h(o+1):e.key==="ArrowUp"?h(o-1):i&&e.key==="ArrowRight"||n&&e.key==="ArrowLeft"?!l||a||u?h(o+1):c(!0):i&&e.key==="ArrowLeft"||n&&e.key==="ArrowRight"?!l||!a||u?h(o-1):c(!1):e.key==="Home"?h(0):e.key==="End"&&h(s.length-1)}},$t=function(e){e.focus()},T.styles=[Be],T);nt([Ft({converter:De,type:Object})],Z.prototype,"data");nt([qt()],Z.prototype,"state");nt([qt()],Z.prototype,"lastFocusedItem");nt([Ce('[role="treeitem"]')],Z.prototype,"nodeElements");customElements.define("json-viewer",Z);const Ve={class:"data-viewer-container"},Fe={class:"content-wrapper"},qe={class:"details-grid"},Je={class:"details-label"},We={class:"details-value-container"},Ke={class:"details-value"},Ze={class:"content-wrapper light-bg"},Ge={class:"json-header"},Qe={__name:"ObjectDetails",props:{assetManagerId:{type:[String,Number],required:!0},objectId:{type:[String,Number],required:!0},pathID:{type:String,default:null}},setup(r){const t=r,e=X("basic"),s=X(!0),i=X(null),n=X(null),o=Gt(()=>i.value?[{label:"名称 (Name)",value:i.value.name||"无"},{label:"类型 (Class Name)",value:i.value.className||"无"},{label:"大小 (Size)",value:i.value.size!==void 0?`${i.value.size} 字节`:"未知"},{label:"文件内偏移 (Offset)",value:i.value.offset!==void 0?`${i.value.offset} 字节`:"未知"},{label:"Path ID",value:i.value.pathID?String(i.value.pathID):"无"},{label:"导出后缀 (Extension)",value:i.value.exportExtension||"无"},{label:"资产包路径 (Asset Path)",value:i.value.path||"无路径"},{label:"管理器 ID",value:String(t.assetManagerId)},{label:"资源 ID",value:String(t.objectId)}]:[]);async function l(){var h;try{s.value=!0;const c=await Xt.assetManagers.get(t.assetManagerId),d=t.pathID?c.getObjectInfoByPathId(BigInt(t.pathID)):(h=c.getObjectInfos())==null?void 0:h[t.objectId];if(d){i.value={name:d.name,className:d.className,size:d.size,offset:d.offset,pathID:d.pathID,exportExtension:d.exportExtension,path:d.path};const p={};for(const $ in d){if($.startsWith("_"))continue;const g=d[$];typeof g=="bigint"?p[$]=String(g):typeof g!="function"&&typeof g!="object"&&(p[$]=g)}if(d.object){p.details={};for(const $ in d.object){if($.startsWith("_"))continue;const g=d.object[$];typeof g=="bigint"?p.details[$]=String(g):typeof g!="function"&&typeof g!="object"&&(p.details[$]=g)}}n.value=p}}catch(c){console.error("加载详情失败",c),D.error("加载资源详情失败")}finally{s.value=!1}}async function a(h,c){try{await navigator.clipboard.writeText(h),D.success(`复制 ${c.split(" ")[0]} 成功`)}catch{D.error("复制失败")}}async function u(){try{if(!n.value)return;await navigator.clipboard.writeText(JSON.stringify(n.value,null,4)),D.success("复制 JSON 成功")}catch{D.error("复制失败")}}return Qt(()=>{l()}),(h,c)=>{const d=R("t-button"),p=R("t-tab-panel"),$=R("json-viewer"),g=R("t-tabs"),Kt=R("t-loading");return Y(),at("div",Ve,[_(Kt,{loading:s.value,"show-overlay":"",size:"small",class:"custom-tabs"},{default:b(()=>[_(g,{modelValue:e.value,"onUpdate:modelValue":c[0]||(c[0]=v=>e.value=v)},{default:b(()=>[_(p,{value:"basic",label:"基本信息","destroy-on-hide":!1},{default:b(()=>[A("div",Fe,[A("div",qe,[(Y(!0),at(Yt,null,te(o.value,v=>(Y(),at("div",{class:"details-row",key:v.label},[A("div",Je,At(v.label),1),A("div",We,[A("span",Ke,At(v.value),1),v.value&&v.value!=="无"&&v.value!=="无路径"?(Y(),ee(d,{key:0,variant:"text",shape:"square",size:"small",onClick:Xe=>a(v.value,v.label)},{icon:b(()=>[_(wt(St))]),_:2},1032,["onClick"])):se("",!0)])]))),128))])])]),_:1}),_(p,{value:"json",label:"JSON 属性","destroy-on-hide":!1},{default:b(()=>[A("div",Ze,[A("div",Ge,[_(d,{variant:"outline",size:"small",onClick:u},{icon:b(()=>[_(wt(St))]),default:b(()=>[c[1]||(c[1]=ie(" 复制 JSON "))]),_:1,__:[1]})]),_($,{data:n.value,class:"light-json"},null,8,["data"])])]),_:1})]),_:1},8,["modelValue"])]),_:1},8,["loading"])])}}},rs=Zt(Qe,[["__scopeId","data-v-e4ce54b8"]]);export{rs as default};
//# sourceMappingURL=ObjectDetails-Btnk7a-E.js.map
