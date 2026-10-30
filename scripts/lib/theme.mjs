import {F} from './facts.mjs';
const palettes={dark:{bg:'#10161c',surface:'#1a242e',surface2:'#25333e',text:'#e8edf2',muted:'#bcc9d2',dim:'#a0b3c0',accent:'#8dd7c4',accent2:'#ef9b91',line:'#587181'},light:{bg:'#f5f7f6',surface:'#ffffff',surface2:'#e3ece8',text:'#182b25',muted:'#344f45',dim:'#456257',accent:'#155e4e',accent2:'#963f35',line:'#769489'}};
export function compileTheme(theme={}){
  const map={'--chat-bg':'bg','--chat-surface':'surface','--chat-text':'text','--chat-text-muted':'muted','--chat-border':'line','--chat-accent':'accent','--chat-share-pick-bg':'surface2','--chat-composer-bg':'surface','--chat-composer-text':'text','--chat-shortcut-bg':'surface2','--chat-shortcut-text':'text','--chat-input-bg':'surface','--chat-input-text':'text','--chat-input-placeholder':'dim','--chat-input-border':'line','--chat-modal-bg':'bg','--chat-modal-surface':'surface','--chat-modal-text':'text','--chat-modal-muted':'muted','--chat-modal-accent':'accent','--chat-modal-input-bg':'surface','--chat-modal-input-text':'text','--chat-modal-cancel-bg':'surface2','--chat-modal-btn-bg':'surface2','--chat-modal-btn-border':'line'};
  return ['light','dark'].map(mode=>{
    const palette={...palettes[mode],...(theme[mode]||{})},values=[];
    for(const [key,value]of Object.entries(palette)){
      if(!Object.hasOwn(palettes[mode],key))continue;
      if(typeof value!=='string'||/[;{}<>]/.test(value))throw Error('主题值只能是单个CSS颜色/变量值');
      values.push(`--rex-${key}:${value};`);
    }
    for(const [name,key]of Object.entries(map))values.push(`${name}:var(--rex-${key});`);
    for(const [name,value]of Object.entries(F.chatVars.aliases))values.push(`${name}:${value};`);
    return `[data-chat="root"][data-theme="${mode}"]{${values.join('')}}`;
  }).join('\n');
}
