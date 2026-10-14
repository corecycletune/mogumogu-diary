import {dayBefore,localDay} from './quest-core.js';

export function jointProgress(members,activity,startDay,day=localDay()){
  if(members.length<2)return {days:null,today:members.map(uid=>({uid,done:activity[uid]?.has(day)||false}))};
  const done=value=>members.every(uid=>activity[uid]?.has(value));
  let cursor=done(day)?day:dayBefore(day),days=0;
  while(cursor>=startDay&&done(cursor)&&days<400){days++;cursor=dayBefore(cursor);}
  return {days,today:members.map(uid=>({uid,done:activity[uid]?.has(day)||false}))};
}
export function joinedDay(timestamp){
  return timestamp?.toDate?localDay(timestamp.toDate()):localDay();
}
