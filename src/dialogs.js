// Shared dialog layers (YesNoLayer, MessageLayer, ShouldQuitLayer, TutorialLayer, Arrow).
const {Node,Img,Label,Menu,btn,fadeLayer,helpBanner,sfx}=require("core");
// YesNoLayer: fade + banner(240,155) + header y130 + message y160; YES (180,200) NO (300,200)
function yesNo(parent,header,message,onYes,onNo,z=5){
  const L=new Node();L.add(fadeLayer());L.add(helpBanner(155));
  if(header)L.add(new Label('white',header,240,130));if(message)L.add(new Label('tiny',message,240,160));
  const close=()=>L.remove();
  L.add(new Menu([btn('yes',180,200,()=>{sfx('select.wav');close();onYes?.();}),btn('no',300,200,()=>{sfx('select.wav');close();onNo?.();})]));
  parent.add(L,z);return L;
}
// MessageLayer: single Back at (240,200)
function message(parent,header,msg,onBack,z=5){
  const L=new Node();L.add(fadeLayer());L.add(helpBanner(155));
  if(header)L.add(new Label('white',header,240,130));if(msg)L.add(new Label('tiny',msg,240,160));
  L.add(new Menu([btn('back',240,200,()=>{sfx('select.wav');L.remove();onBack?.();})]));
  parent.add(L,z);return L;
}
// ShouldQuitLayer: fade + banner at (240,190) + "Really Quit?" y170 + message y200; YES(165,235) NO(315,235)
function shouldQuit(parent,msg,onQuit,onCancel,z=6){
  const L=new Node();L.add(fadeLayer());L.add(helpBanner(190));
  const m=new Menu([btn('no',315,235,()=>{sfx('select.wav');L.remove();onCancel?.();}),btn('yes',165,235,()=>{sfx('select.wav');L.remove();onQuit?.();})]);
  L.add(new Label('white','Really Quit?',240,170));L.add(new Label('tiny',msg,240,200));L.add(m);
  parent.add(L,z);return L;
}
// TutorialLayer: fade + banner(240,160) + lines + Continue at (240,220)
function tutorial(parent,lines,onDone,{z=100,sound=true}={}){
  const L=new Node();L.add(fadeLayer(),0);L.add(helpBanner(160),1);
  for(const [font,str,y] of lines)L.add(new Label(font,str,240,y),2);
  L.add(new Menu([btn('continue_',240,220,()=>{if(sound)sfx('select.wav');L.remove();onDone?.();})]),2);
  parent.add(L,z);return L;
}
Object.assign(exports,{yesNo,message,shouldQuit,tutorial});
