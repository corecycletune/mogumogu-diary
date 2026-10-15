import {emptyQuests} from './quest-core.js';
export function freshGame(profile){return {profile,version:1,coins:0,tickets:0,pendingCoins:0,pendingTickets:0,freezeTickets:0,drawCount:0,lastFreeDay:'',lastLoginDay:'',loginDays:0,inventory:{},history:[],mealRewardDays:{},streakRewardKeys:[],updatedAt:new Date().toISOString()};}
