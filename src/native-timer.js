// Timer.fire: (MC 1.85, 0x4b8b4). First tick primes; excess time is discarded.
const nativeTimer=interval=>({interval:Math.fround(interval),elapsed:-1});
function fireNativeTimer(timer,dt){
  timer.elapsed=timer.elapsed===-1?0:Math.fround(timer.elapsed+Math.fround(dt));
  if(timer.elapsed<timer.interval)return false;
  timer.elapsed=0;
  return true;
}

Object.assign(exports,{nativeTimer,fireNativeTimer});
