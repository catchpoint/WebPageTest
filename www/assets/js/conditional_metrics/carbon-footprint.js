// co2js version 0.16
// prettier-ignore
var co2=(()=>{var ae=Object.create;var P=Object.defineProperty;var ie=Object.getOwnPropertyDescriptor;var oe=Object.getOwnPropertyNames;var se=Object.getPrototypeOf,ce=Object.prototype.hasOwnProperty;var le=(t,e)=>()=>(e||t((e={exports:{}}).exports,e),e.exports),Ee=(t,e)=>{for(var r in e)P(t,r,{get:e[r],enumerable:!0})},j=(t,e,r,a)=>{if(e&&typeof e=="object"||typeof e=="function")for(let n of oe(e))!ce.call(t,n)&&n!==r&&P(t,n,{get:()=>e[n],enumerable:!(a=ie(e,n))||a.enumerable});return t};var ue=(t,e,r)=>(r=t!=null?ae(se(t)):{},j(e||!t||!t.__esModule?P(r,"default",{value:t,enumerable:!0}):r,t)),de=t=>j(P({},"__esModule",{value:!0}),t);var te=le((ct,ee)=>{"use strict";async function me(t,e){return typeof t=="string"?Oe(t,e):Pe(t,e)}function Oe(t,e){return e.indexOf(t)>-1}function ye(t){return Object.entries(t).filter(([a,n])=>n.green).map(([a,n])=>n.url)}function Pe(t,e){let r=[];for(let a of t)e.indexOf(a)>-1&&r.push(a);return r}function Ge(t,e){return typeof t=="string"?z(t,e):Se(t,e)}function z(t,e){return e.indexOf(t)>-1?t:{url:t,green:!1}}function Se(t,e){let r={};for(let a of t)r[a]=z(a,e);return r}ee.exports={check:me,greenDomainsFromResults:ye,find:Ge}});var we={};Ee(we,{averageIntensity:()=>R,co2:()=>U,default:()=>Me,hosting:()=>K,marginalIntensity:()=>k});var B=4883333333333333e-25;var D=class{constructor(e){this.allowRatings=!1,this.options=e,this.KWH_PER_BYTE_FOR_NETWORK=B}perByte(e,r){if(e<1)return 0;if(r){let n=e*72e-12*0,i=e*B*475;return n+i}let a=72e-12+B;return e*a*519}};var x=D;var N={GIGABYTE:1e9};var Re={AFG:132.53,AFRICA:545.15,ALB:24.29,DZA:634.61,ASM:611.11,AGO:174.73,ATG:611.11,ARG:354.1,ARM:264.54,ABW:561.22,ASEAN:569.86,ASIA:589.78,AUS:548.69,AUT:110.81,AZE:671.39,BHS:660.1,BHR:904.62,BGD:691.41,BRB:605.51,BLR:441.74,BEL:138.11,BLZ:225.81,BEN:584.07,BTN:23.33,BOL:531.69,BIH:601.29,BWA:847.91,BRA:98.32,BRN:893.91,BGR:335.33,BFA:467.53,BDI:250,CPV:558.14,KHM:417.71,CMR:305.42,CAN:171.12,CYM:642.86,CAF:0,TCD:628.57,CHL:291.11,CHN:582.29,COL:259.51,COM:642.86,COG:700,COD:24.46,COK:250,CRI:53.38,CIV:393.89,HRV:204.96,CUB:637.61,CYP:534.32,CZE:449.72,DNK:151.65,DJI:692.31,DMA:529.41,DOM:580.78,ECU:166.91,EGY:570.31,SLV:224.76,GNQ:591.84,ERI:631.58,EST:416.67,SWZ:172.41,ETH:24.64,EU:243.83,EUROPE:300.24,FLK:500,FRO:404.76,FJI:288.46,FIN:79.16,FRA:56.02,GUF:217.82,PYF:442.86,G20:477.08,G7:341.01,GAB:491.6,GMB:666.67,GEO:167.59,DEU:380.95,GHA:484,GRC:336.57,GRL:178.57,GRD:640,GLP:500,GUM:622.86,GTM:328.27,GIN:236.84,GNB:625,GUY:640.35,HTI:567.31,HND:282.27,HKG:699.5,HUN:204.19,ISL:27.68,IND:713.44,IDN:675.93,IRN:655.13,IRQ:688.81,IRL:290.81,ISR:582.93,ITA:330.72,JAM:555.56,JPN:485.39,JOR:540.92,KAZ:821.39,KEN:70.49,KIR:666.67,XKX:894.65,KWT:649.16,KGZ:147.29,LAO:265.51,"LATIN AMERICA AND CARIBBEAN":258.18,LVA:123.2,LBN:599.01,LSO:20,LBR:227.85,LBY:818.69,LTU:160.07,LUX:105.26,MAC:448.98,MDG:436.44,MWI:66.67,MYS:605.32,MDV:611.77,MLI:408,MLT:459.14,MTQ:523.18,MRT:464.71,MUS:632.48,MEX:507.25,"MIDDLE EAST":657.56,MDA:643.46,MNG:775.31,MNE:418.09,MSR:1e3,MAR:630.01,MOZ:135.65,MMR:398.9,NAM:59.26,NRU:750,NPL:24.44,NLD:267.62,NCL:660.58,NZL:112.76,NIC:265.12,NER:670.89,NGA:523.25,"NORTH AMERICA":343.66,PRK:389.59,MKD:556.19,NOR:30.08,OCEANIA:489.62,OECD:341.16,OMN:564.64,PAK:440.61,PSE:516.13,PAN:161.68,PNG:507.25,PRY:23.76,PER:266.48,POL:661.93,PRT:165.55,PRI:676.19,QAT:602.5,REU:572.82,ROU:240.58,RUS:441.04,RWA:316.33,KNA:636.36,LCA:666.67,SPM:600,VCT:529.41,WSM:473.68,STP:642.86,SAU:706.79,SEN:511.6,SRB:647.52,SYC:564.52,SLE:50,SGP:470.78,SVK:116.77,SVN:231.28,SLB:700,SOM:578.95,ZAF:707.69,KOR:430.57,SSD:629.03,ESP:174.05,LKA:509.78,SDN:263.16,SUR:349.28,SWE:40.7,CHE:34.68,SYR:701.66,TWN:642.38,TJK:116.86,TZA:339.25,THA:549.61,PHL:610.74,TGO:443.18,TON:625,TTO:681.53,TUN:563.96,TUR:464.59,TKM:1306.03,TCA:653.85,UGA:44.53,UKR:259.69,ARE:561.14,GBR:237.59,USA:369.47,URY:128.79,UZB:1167.6,VUT:571.43,VEN:185.8,VNM:475.45,VGB:647.06,VIR:632.35,WORLD:480.79,YEM:566.1,ZMB:111.97,ZWE:297.87},ge="average";var R={data:Re,type:ge};var Z=.81,p=.52,b=.14,L=.15,V=.19,g=R.data.WORLD,$=50,_=.75,C=.25,A=.02,G={OPERATIONAL_KWH_PER_GB_DATACENTER:.055,OPERATIONAL_KWH_PER_GB_NETWORK:.059,OPERATIONAL_KWH_PER_GB_DEVICE:.08,EMBODIED_KWH_PER_GB_DATACENTER:.012,EMBODIED_KWH_PER_GB_NETWORK:.013,EMBODIED_KWH_PER_GB_DEVICE:.081,GLOBAL_GRID_INTENSITY:494},J={FIFTH_PERCENTILE:.095,TENTH_PERCENTILE:.186,TWENTIETH_PERCENTILE:.341,THIRTIETH_PERCENTILE:.493,FORTIETH_PERCENTILE:.656,FIFTIETH_PERCENTILE:.846},T={FIFTH_PERCENTILE:.04,TENTH_PERCENTILE:.079,TWENTIETH_PERCENTILE:.145,THIRTIETH_PERCENTILE:.209,FORTIETH_PERCENTILE:.278,FIFTIETH_PERCENTILE:.359};var fe=G.GLOBAL_GRID_INTENSITY,O=t=>parseFloat(t.toFixed(2)),m=(t,e)=>t<=e;function v(t={},e=3,r=!1){let a=e===4?fe:g;if(typeof t!="object")throw new Error("Options must be an object");let n={};if(t?.gridIntensity){n.gridIntensity={};let{device:i,dataCenter:o,network:s}=t.gridIntensity;(i||i===0)&&(typeof i=="object"?(R.data[i.country?.toUpperCase()]||(console.warn(`"${i.country}" is not a valid country. Please use a valid 3 digit ISO 3166 country code. 
  See https://developers.thegreenwebfoundation.org/co2js/data/ for more information. 
  Falling back to global average grid intensity.`),n.gridIntensity.device={value:a}),n.gridIntensity.device={country:i.country,value:parseFloat(R.data[i.country?.toUpperCase()])}):typeof i=="number"?n.gridIntensity.device={value:i}:(n.gridIntensity.device={value:a},console.warn(`The device grid intensity must be a number or an object. You passed in a ${typeof i}. 
  Falling back to global average grid intensity.`))),(o||o===0)&&(typeof o=="object"?(R.data[o.country?.toUpperCase()]||(console.warn(`"${o.country}" is not a valid country. Please use a valid 3 digit ISO 3166 country code. 
  See https://developers.thegreenwebfoundation.org/co2js/data/ for more information.  
  Falling back to global average grid intensity.`),n.gridIntensity.dataCenter={value:g}),n.gridIntensity.dataCenter={country:o.country,value:parseFloat(R.data[o.country?.toUpperCase()])}):typeof o=="number"?n.gridIntensity.dataCenter={value:o}:(n.gridIntensity.dataCenter={value:a},console.warn(`The data center grid intensity must be a number or an object. You passed in a ${typeof o}. 
  Falling back to global average grid intensity.`))),(s||s===0)&&(typeof s=="object"?(R.data[s.country?.toUpperCase()]||(console.warn(`"${s.country}" is not a valid country. Please use a valid 3 digit ISO 3166 country code. 
  See https://developers.thegreenwebfoundation.org/co2js/data/ for more information.  Falling back to global average grid intensity. 
  Falling back to global average grid intensity.`),n.gridIntensity.network={value:a}),n.gridIntensity.network={country:s.country,value:parseFloat(R.data[s.country?.toUpperCase()])}):typeof s=="number"?n.gridIntensity.network={value:s}:(n.gridIntensity.network={value:a},console.warn(`The network grid intensity must be a number or an object. You passed in a ${typeof s}. 
  Falling back to global average grid intensity.`)))}else n.gridIntensity={device:{value:a},dataCenter:{value:a},network:{value:a}};return t?.dataReloadRatio||t.dataReloadRatio===0?typeof t.dataReloadRatio=="number"?t.dataReloadRatio>=0&&t.dataReloadRatio<=1?n.dataReloadRatio=t.dataReloadRatio:(n.dataReloadRatio=e===3?A:0,console.warn(`The dataReloadRatio option must be a number between 0 and 1. You passed in ${t.dataReloadRatio}. 
  Falling back to default value.`)):(n.dataReloadRatio=e===3?A:0,console.warn(`The dataReloadRatio option must be a number. You passed in a ${typeof t.dataReloadRatio}. 
  Falling back to default value.`)):(n.dataReloadRatio=e===3?A:0,console.warn(`The dataReloadRatio option must be a number. You passed in a ${typeof t.dataReloadRatio}. 
  Falling back to default value.`)),t?.firstVisitPercentage||t.firstVisitPercentage===0?typeof t.firstVisitPercentage=="number"?t.firstVisitPercentage>=0&&t.firstVisitPercentage<=1?n.firstVisitPercentage=t.firstVisitPercentage:(n.firstVisitPercentage=e===3?_:1,console.warn(`The firstVisitPercentage option must be a number between 0 and 1. You passed in ${t.firstVisitPercentage}. 
  Falling back to default value.`)):(n.firstVisitPercentage=e===3?_:1,console.warn(`The firstVisitPercentage option must be a number. You passed in a ${typeof t.firstVisitPercentage}. 
  Falling back to default value.`)):(n.firstVisitPercentage=e===3?_:1,console.warn(`The firstVisitPercentage option must be a number. You passed in a ${typeof t.firstVisitPercentage}. 
  Falling back to default value.`)),t?.returnVisitPercentage||t.returnVisitPercentage===0?typeof t.returnVisitPercentage=="number"?t.returnVisitPercentage>=0&&t.returnVisitPercentage<=1?n.returnVisitPercentage=t.returnVisitPercentage:(n.returnVisitPercentage=e===3?C:0,console.warn(`The returnVisitPercentage option must be a number between 0 and 1. You passed in ${t.returnVisitPercentage}. 
  Falling back to default value.`)):(n.returnVisitPercentage=e===3?C:0,console.warn(`The returnVisitPercentage option must be a number. You passed in a ${typeof t.returnVisitPercentage}. 
  Falling back to default value.`)):(n.returnVisitPercentage=e===3?C:0,console.warn(`The returnVisitPercentage option must be a number. You passed in a ${typeof t.returnVisitPercentage}. 
  Falling back to default value.`)),t?.greenHostingFactor||t.greenHostingFactor===0&&e===4?typeof t.greenHostingFactor=="number"?t.greenHostingFactor>=0&&t.greenHostingFactor<=1?n.greenHostingFactor=t.greenHostingFactor:(n.greenHostingFactor=0,console.warn(`The returnVisitPercentage option must be a number between 0 and 1. You passed in ${t.returnVisitPercentage}. 
  Falling back to default value.`)):(n.greenHostingFactor=0,console.warn(`The returnVisitPercentage option must be a number. You passed in a ${typeof t.returnVisitPercentage}. 
  Falling back to default value.`)):e===4&&(n.greenHostingFactor=0),r&&(n.greenHostingFactor=1),n}function M(t=""){return{"User-Agent":`co2js/0.15.0 ${t}`}}function S(t,e){let{FIFTH_PERCENTILE:r,TENTH_PERCENTILE:a,TWENTIETH_PERCENTILE:n,THIRTIETH_PERCENTILE:i,FORTIETH_PERCENTILE:o,FIFTIETH_PERCENTILE:s}=J;return e===4&&(r=T.FIFTH_PERCENTILE,a=T.TENTH_PERCENTILE,n=T.TWENTIETH_PERCENTILE,i=T.THIRTIETH_PERCENTILE,o=T.FORTIETH_PERCENTILE,s=T.FIFTIETH_PERCENTILE),m(t,r)?"A+":m(t,a)?"A":m(t,n)?"B":m(t,i)?"C":m(t,o)?"D":m(t,s)?"E":"F"}var w=class{constructor(e){this.allowRatings=!0,this.options=e,this.version=3}energyPerByteByComponent(e){let a=e/N.GIGABYTE*Z;return{consumerDeviceEnergy:a*p,networkEnergy:a*b,productionEnergy:a*V,dataCenterEnergy:a*L}}co2byComponent(e,r=g,a={}){let n=g,i=g,o=g,s=g;if(a?.gridIntensity){let{device:l,network:c,dataCenter:E}=a.gridIntensity;(l?.value||l?.value===0)&&(n=l.value),(c?.value||c?.value===0)&&(i=c.value),(E?.value||E?.value===0)&&(o=E.value)}r===!0&&(o=$);let u={};for(let[l,c]of Object.entries(e))l.startsWith("dataCenterEnergy")?u[l.replace("Energy","CO2")]=c*o:l.startsWith("consumerDeviceEnergy")?u[l.replace("Energy","CO2")]=c*n:l.startsWith("networkEnergy")?u[l.replace("Energy","CO2")]=c*i:u[l.replace("Energy","CO2")]=c*s;return u}perByte(e,r=!1,a=!1,n=!1,i={}){e<1&&(e=0);let o=this.energyPerByteByComponent(e,i);if(typeof r!="boolean")throw new Error(`perByte expects a boolean for the carbon intensity value. Received: ${r}`);let s=this.co2byComponent(o,r,i),l=Object.values(s).reduce((E,d)=>E+d),c=null;return n&&(c=this.ratingScale(l)),a?n?{...s,total:l,rating:c}:{...s,total:l}:n?{total:l,rating:c}:l}perVisit(e,r=!1,a=!1,n=!1,i={}){let o=this.energyPerVisitByComponent(e,i);if(typeof r!="boolean")throw new Error(`perVisit expects a boolean for the carbon intensity value. Received: ${r}`);let s=this.co2byComponent(o,r,i),l=Object.values(s).reduce((E,d)=>E+d),c=null;return n&&(c=this.ratingScale(l)),a?n?{...s,total:l,rating:c}:{...s,total:l}:n?{total:l,rating:c}:l}energyPerByte(e){let r=this.energyPerByteByComponent(e);return Object.values(r).reduce((n,i)=>n+i)}energyPerVisitByComponent(e,r={},a=_,n=C,i=A){(r.dataReloadRatio||r.dataReloadRatio===0)&&(i=r.dataReloadRatio),(r.firstVisitPercentage||r.firstVisitPercentage===0)&&(a=r.firstVisitPercentage),(r.returnVisitPercentage||r.returnVisitPercentage===0)&&(n=r.returnVisitPercentage);let o=this.energyPerByteByComponent(e),s={},u=Object.values(o);for(let[l,c]of Object.entries(o))s[`${l} - first`]=c*a,s[`${l} - subsequent`]=c*n*i;return s}energyPerVisit(e){let r=0,a=0,n=Object.entries(this.energyPerVisitByComponent(e));for(let[i,o]of n)i.indexOf("first")>0&&(r+=o);for(let[i,o]of n)i.indexOf("subsequent")>0&&(a+=o);return r+a}emissionsPerVisitInGrams(e,r=g){return O(e*r)}annualEnergyInKwh(e,r=1e3){return e*r*12}annualEmissionsInGrams(e,r=1e3){return e*r*12}annualSegmentEnergy(e){return{consumerDeviceEnergy:O(e*p),networkEnergy:O(e*b),dataCenterEnergy:O(e*L),productionEnergy:O(e*V)}}ratingScale(e){return S(e,this.version)}};var H=w;var{OPERATIONAL_KWH_PER_GB_DATACENTER:Te,OPERATIONAL_KWH_PER_GB_NETWORK:Ie,OPERATIONAL_KWH_PER_GB_DEVICE:Ne,EMBODIED_KWH_PER_GB_DATACENTER:_e,EMBODIED_KWH_PER_GB_NETWORK:Ce,EMBODIED_KWH_PER_GB_DEVICE:Ae,GLOBAL_GRID_INTENSITY:y}=G;function X(t,e){let r=t.dataCenter+t.network+t.device,a=e.dataCenter+e.network+e.device,n=t.dataCenter+e.dataCenter,i=t.network+e.network,o=t.device+e.device;return{dataCenterOperationalCO2e:t.dataCenter,networkOperationalCO2e:t.network,consumerDeviceOperationalCO2e:t.device,dataCenterEmbodiedCO2e:e.dataCenter,networkEmbodiedCO2e:e.network,consumerDeviceEmbodiedCO2e:e.device,totalEmbodiedCO2e:a,totalOperationalCO2e:r,dataCenterCO2e:n,networkCO2e:i,consumerDeviceCO2e:o}}function Q(t,e){return t?1:e?.greenHostingFactor||e?.greenHostingFactor===0?e.greenHostingFactor:0}var F=class{constructor(e){this.allowRatings=!0,this.options=e,this.version=4}operationalEnergyPerSegment(e){let r=e/N.GIGABYTE,a=r*Te,n=r*Ie,i=r*Ne;return{dataCenter:a,network:n,device:i}}operationalEmissions(e,r={}){let{dataCenter:a,network:n,device:i}=this.operationalEnergyPerSegment(e),o=y,s=y,u=y;if(r?.gridIntensity){let{device:d,network:I,dataCenter:f}=r.gridIntensity;(d?.value||d?.value===0)&&(u=d.value),(I?.value||I?.value===0)&&(s=I.value),(f?.value||f?.value===0)&&(o=f.value)}let l=a*o,c=n*s,E=i*u;return{dataCenter:l,network:c,device:E}}embodiedEnergyPerSegment(e){let r=e/N.GIGABYTE,a=r*_e,n=r*Ce,i=r*Ae;return{dataCenter:a,network:n,device:i}}embodiedEmissions(e){let{dataCenter:r,network:a,device:n}=this.embodiedEnergyPerSegment(e),i=y,o=y,s=y,u=r*i,l=a*o,c=n*s;return{dataCenter:u,network:l,device:c}}perByte(e,r=!1,a=!1,n=!1,i={}){if(e<1)return 0;let o=this.operationalEmissions(e,i),s=this.embodiedEmissions(e),u=Q(r,i),l={dataCenter:o.dataCenter*(1-u)+s.dataCenter,network:o.network+s.network,device:o.device+s.device},c=l.dataCenter+l.network+l.device,E=null;if(n&&(E=this.ratingScale(c)),a){let d={...X(o,s)};return n?{...d,total:c,rating:E}:{...d,total:c}}return n?{total:c,rating:E}:c}perVisit(e,r=!1,a=!1,n=!1,i={}){let o=1,s=0,u=0,l=Q(r,i),c=this.operationalEmissions(e,i),E=this.embodiedEmissions(e);if(e<1)return 0;(i.firstVisitPercentage||i.firstVisitPercentage===0)&&(o=i.firstVisitPercentage),(i.returnVisitPercentage||i.returnVisitPercentage===0)&&(s=i.returnVisitPercentage),(i.dataReloadRatio||i.dataReloadRatio===0)&&(u=i.dataReloadRatio);let d=c.dataCenter*(1-l)+E.dataCenter+c.network+E.network+c.device+E.device,I=(c.dataCenter*(1-l)+E.dataCenter+c.network+E.network+c.device+E.device)*(1-u),f=d*o+I*s,h=null;if(n&&(h=this.ratingScale(f)),a){let Y={...X(c,E),firstVisitCO2e:d,returnVisitCO2e:I};return n?{...Y,total:f,rating:h}:{...Y,total:f}}return n?{total:f,rating:h}:f}ratingScale(e){return S(e,this.version)}};var q=F;var W=class{constructor(e){if(this.model=new H,e?.model==="1byte")this.model=new x;else if(e?.model==="swd")this.model=new H,e?.version===4&&(this.model=new q);else if(e?.model)throw new Error(`"${e.model}" is not a valid model. Please use "1byte" for the OneByte model, and "swd" for the Sustainable Web Design model.
  See https://developers.thegreenwebfoundation.org/co2js/models/ to learn more about the models available in CO2.js.`);if(e?.rating&&typeof e.rating!="boolean")throw new Error(`The rating option must be a boolean. Please use true or false.
  See https://developers.thegreenwebfoundation.org/co2js/options/ to learn more about the options available in CO2.js.`);let r=!!this.model.allowRatings;if(this._segment=e?.results==="segment",this._rating=e?.rating===!0,!r&&this._rating)throw new Error(`The rating system is not supported in the model you are using. Try using the Sustainable Web Design model instead.
  See https://developers.thegreenwebfoundation.org/co2js/models/ to learn more about the models available in CO2.js.`)}perByte(e,r=!1){return this.model.perByte(e,r,this._segment,this._rating)}perVisit(e,r=!1){if(this.model?.perVisit)return this.model.perVisit(e,r,this._segment,this._rating);throw new Error(`The perVisit() method is not supported in the model you are using. Try using perByte() instead.
  See https://developers.thegreenwebfoundation.org/co2js/methods/ to learn more about the methods available in CO2.js.`)}perByteTrace(e,r=!1,a={}){let n=v(a,this.model.version,r),{gridIntensity:i,...o}=n,{dataReloadRatio:s,firstVisitPercentage:u,returnVisitPercentage:l,...c}=o;return{co2:this.model.perByte(e,r,this._segment,this._rating,n),green:r,variables:{description:"Below are the variables used to calculate this CO2 estimate.",bytes:e,gridIntensity:{description:"The grid intensity (grams per kilowatt-hour) used to calculate this CO2 estimate.",...n.gridIntensity},...c}}}perVisitTrace(e,r=!1,a={}){if(this.model?.perVisit){let n=v(a,this.model.version,r),{gridIntensity:i,...o}=n;return{co2:this.model.perVisit(e,r,this._segment,this._rating,n),green:r,variables:{description:"Below are the variables used to calculate this CO2 estimate.",bytes:e,gridIntensity:{description:"The grid intensity (grams per kilowatt-hour) used to calculate this CO2 estimate.",...n.gridIntensity},...o}}}else throw new Error(`The perVisitTrace() method is not supported in the model you are using. Try using perByte() instead.
  See https://developers.thegreenwebfoundation.org/co2js/methods/ to learn more about the methods available in CO2.js.`)}};var U=W;var re=ue(te());function he(t,e){let r=typeof e=="string"?{userAgentIdentifier:e}:e;if(r?.db&&r.verbose)throw new Error("verbose mode cannot be used with a local lookup database");return typeof t=="string"?Be(t,r):De(t,r)}async function Be(t,e={}){let r=await fetch(`https://api.thegreenwebfoundation.org/greencheck/${t}`,{headers:M(e.userAgentIdentifier)});if(e?.db)return re.default.check(t,e.db);let a=await r.json();return e.verbose?a:a.green}async function De(t,e={}){try{let r="https://api.thegreenwebfoundation.org/v2/greencheckmulti",a=JSON.stringify(t),i=await(await fetch(`${r}/${a}`,{headers:M(e.userAgentIdentifier)})).json();return e.verbose?i:pe(i)}catch{return e.verbose?{}:[]}}function pe(t){return Object.entries(t).filter(([a,n])=>n.green).map(([a,n])=>n.url)}var ne={check:he};function be(t,e){return ne.check(t,e)}var K={check:be};var Le={AFG:"414",ALB:"0",DZA:"528",ASM:"753",AND:"188",AGO:"1476",AIA:"753",ATG:"753",ARG:"478",ARM:"390",ABW:"753",AUS:"808",AUT:"242",AZE:"534","AZORES (PORTUGAL)":"753",BHS:"753",BHR:"726",BGD:"528",BRB:"749",BLR:"400",BEL:"252",BLZ:"403",BEN:"745",BMU:"753",BTN:"0",BOL:"604",BES:"753",BIH:"1197",BWA:"1486",BRA:"284",VGB:"753",BRN:"681",BGR:"911",BFA:"753",BDI:"414",KHM:"1046",CMR:"659",CAN:"372",CYM:"753",CPV:"753",CAF:"188",TCD:"753","CHANNEL ISLANDS (U.K)":"753",CHL:"657",CHN:"899",COL:"410",COM:"753",COD:"0",COG:"659",COK:"753",CRI:"108",CIV:"466",HRV:"294",CUB:"559",CUW:"876",CYP:"751",CZE:"902",DNK:"362",DJI:"753",DMA:"753",DOM:"601",ECU:"560",EGY:"554",SLV:"547",GNQ:"632",ERI:"915",EST:"1057",SWZ:"0",ETH:"0",FLK:"753",FRO:"753",FJI:"640",FIN:"267",FRA:"158",GUF:"423",PYF:"753",GAB:"946",GMB:"753",GEO:"289",DEU:"650",GHA:"495",GIB:"779",GRC:"507",GRL:"264",GRD:"753",GLP:"753",GUM:"753",GTM:"798",GIN:"753",GNB:"753",GUY:"847",HTI:"1048",HND:"662",HUN:"296",ISL:"0",IND:"951",IDN:"783",IRN:"592",IRQ:"1080",IRL:"380",IMN:"436",ISR:"394",ITA:"414",JAM:"711",JPN:"471",JOR:"529",KAZ:"797",KEN:"574",KIR:"753",PRK:"754",KOR:"555",XKX:"1145",KWT:"675",KGZ:"217",LAO:"1069",LVA:"240",LBN:"794",LSO:"0",LBR:"677",LBY:"668",LIE:"151",LTU:"211",LUX:"220",MDG:"876","MADEIRA (PORTUGAL)":"663",MWI:"489",MYS:"551",MDV:"753",MLI:"1076",MLT:"520",MHL:"753",MTQ:"753",MRT:"753",MUS:"700",MYT:"753",MEX:"531",FSM:"753",MDA:"541",MCO:"158",MNG:"1366",MNE:"899",MSR:"753",MAR:"729",MOZ:"234",MMR:"719",NAM:"355",NRU:"753",NPL:"0",NLD:"326",NCL:"779",NZL:"246",NIC:"675",NER:"772",NGA:"526",NIU:"753",MKD:"851",MNP:"753",NOR:"47",OMN:"479",PAK:"592",PLW:"753",PSE:"719",PAN:"477",PNG:"597",PRY:"0",PER:"473",PHL:"672",POL:"828",PRT:"389",PRI:"596",QAT:"503",REU:"772",ROU:"489",RUS:"476",RWA:"712",SHN:"753",KNA:"753",LCA:"753",MAF:"753",SPM:"753",VCT:"753",WSM:"753",SMR:"414",STP:"753",SAU:"592",SEN:"870",SRB:"1086",SYC:"753",SLE:"489",SGP:"379",SXM:"753",SVK:"332",SVN:"620",SLB:"753",SOM:"753",ZAF:"1070",SSD:"890",ESP:"402",LKA:"731",SDN:"736",SUR:"1029",SWE:"68",CHE:"48",SYR:"713",TWN:"484",TJK:"255",TZA:"531",THA:"450",TLS:"753",TGO:"859",TON:"753",TTO:"559",TUN:"468",TUR:"376",TKM:"927",TCA:"753",TUV:"753",UGA:"279",UKR:"768",ARE:"556",GBR:"380",USA:"416",URY:"174",UZB:"612",VUT:"753",VEN:"711",VNM:"560",VIR:"650",YEM:"807",ZMB:"416",ZWE:"1575","MEMO:  EU 27":"409"},Ve="marginal",ve="2021";var k={data:Le,type:Ve,year:ve};var Me={co2:U,hosting:K,averageIntensity:R,marginalIntensity:k};return de(we);})();
//# sourceMappingURL=index.js.map

let hasCSPblock = false;
if ($WPT_REQUESTS) {
  let req1csp = $WPT_REQUESTS[0].response_headers["content-security-policy"];
  hasCSPblock = req1csp && req1csp.indexOf("connect-src 'self'") > -1;
}

// note: this section is borrowed from green-hosting js.
let collectHostStatuses = async function () {
  if (!$WPT_REQUESTS) {
    return Promise.all([{ error: "Carbon calculation requires Chromium." }]);
  }
  if (hasCSPblock) {
    return Promise.all([{ error: "Unable to check green hosting." }]);
  }
  const hosts = [location.host];
  $WPT_REQUESTS.forEach((req) => {
    var url = new URL(req.url);
    var host = url.host;
    if (hosts.indexOf(host) === -1 && host !== "") {
      hosts.push(host);
    }
  });

  const options = {
    verbose: false,
    userAgentIdentifier: "WebPageTest",
  };

  // This uses hosting.check to go out to the Green Web Foundation API with one bulk lookup for hosts
  let dependenciesCheck = co2.hosting.check(hosts, options).then((result) => {
    let greenResults = result.map((host) => {
      return { url: host, green: true };
    });

    let grayResults = hosts
      .filter((host) => {
        return result.indexOf(host) == -1;
      })
      .map((host) => {
        return { url: host, green: false };
      });

    let fullResults = greenResults.concat(grayResults);
    fullResults = fullResults.sort((a, b) => {
      if (a.url == hosts[0]) {
        return -1;
      } else {
        return 1;
      }
    });
    return fullResults;
  });

  return dependenciesCheck;
};

let calculate_carbon = async function () {
  let totalCarbon = 0;
  const emissionsSWD = new co2.co2({ model: "swd", version: 4 });
  let greenstatuses = await collectHostStatuses();

  $WPT_REQUESTS.forEach((req) => {
    if (req.transfer_size) {
      // try to determine request green status
      let green = false;
      if (!hasCSPblock) {
        if (req.url) {
          let url = new URL(req.url);
          let host = url.host;
          if (greenstatuses[0] !== undefined) {
            green = greenstatuses.find(
              (element) => element.url === host && element.green
            )
              ? true
              : false;
          }
        }
      }
      totalCarbon += emissionsSWD.perByte(req.transfer_size, green);
    }
  });

  return Promise.resolve({
    "sustainable-web-design": totalCarbon.toFixed(2),
    scale: "per new visit",
    "green-hosting": greenstatuses,
  }); // We use toFixed(2) here to set the result to 2 decimal places.
};

// without wpt requests, this isn't able to calculate. no metric unless chromium browsers
if ($WPT_REQUESTS) {
  return calculate_carbon();
}
