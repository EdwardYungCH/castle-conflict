// GameScene(Ai), v1.85. Inputs are the integer powers used by the native methods.
function airAttackScore({gold,difficulty,opposingCount,opposingPower,ourPower,opponentShotCannon}){
 if(gold<=19||opponentShotCannon)return 0;
 let score=opposingCount?.3:ourPower?.35:.7;
 if(ourPower>opposingPower)score*=1.5;
 if(difficulty===0)score*=.3;else if(difficulty===1)score*=.7;
 if(difficulty!==0&&gold>20&&gold<=59)score*=.15;
 return score;
}
function airDefenseScore({gold,hp,opposingCount,opposingPower,ourPower,opponentShotCannon}){
 if(gold<=19||opponentShotCannon||ourPower>opposingPower||!opposingCount)return 0;
 let score=ourPower<opposingPower?.2816:.088;
 if(ourPower*10>hp)score*=3;
 return score*(1+opposingCount*.19);
}
function stopResourcesScore({gold,opponentGold,difficulty,carriers,thieves,opposingGroundPower,ourGroundPower}){
 if(gold<=19||ourGroundPower<opposingGroundPower||carriers-thieves<0)return 0;
 const difference=carriers-thieves;
 let score=difference===0?(thieves===0?.15:0):difference===1?.15:.2;
 if(opponentGold<=19&&(opponentGold>8||gold>50))score*=difficulty===2?3:2;
 return score;
}

Object.assign(exports,{airAttackScore,airDefenseScore,stopResourcesScore});
