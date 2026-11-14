import {memo} from 'react';

function AimTarget({aim,shotType}){
 const x=220+aim.x*560,y=145+aim.y*235;
 const color=shotType==='panenka'?'#f4d497':'#a5e5ff';
 return <g className="pen-aim-target" aria-hidden="true" pointerEvents="none" style={{'--aim-color':color}}>
  <g transform={`translate(${x} ${y})`}>
   <circle r="30" fill="#061522" fillOpacity=".38" stroke="#04111d" strokeWidth="4"/>
   <circle r="30" fill="none" stroke={color} strokeOpacity=".35" strokeWidth="1"/>
   <circle r="21" fill={color} fillOpacity=".07" stroke={color} strokeWidth="1.5" strokeDasharray="20 13" transform="rotate(-28)"/>
   <path className="pen-aim-brackets" d="M-35-17V-27Q-35-35-27-35H-17M17-35H27Q35-35 35-27V-17M35 17V27Q35 35 27 35H17M-17 35H-27Q-35 35-35 27V17" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
   <path d="M-12 0H-6M6 0H12M0-12V-6M0 6V12" stroke="#f1fbff" strokeWidth="1.5" strokeLinecap="round"/>
   <circle r="3" fill="#fff" stroke="#082232" strokeWidth="1"/>
  </g>
 </g>;
}
export default memo(AimTarget);
