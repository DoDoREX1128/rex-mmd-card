(function(){
  var R=window.__REX__;if(!R)return;
  R.section('saves',{
    icon:'set',title:'存档',empty:'暂无手动档',
    brief:function(){var e=R.storageEnvelope();return [{key:'auto',head:'自动存档',meta:'最近有效回合'}].concat(e.slots.map(function(s){return {key:s.id,head:s.name,meta:s.summary};}));},
    detail:function(){
      var e=R.storageEnvelope(),esc=R.esc;
      return '<div class="rex-save-ui"><p>'+esc(R.storageStatus&&!R.storageStatus.ok?R.storageStatus.error:'存档就绪')+'</p>'+
        '<button class="rex-btn" data-save="new">新建命名存档</button> <button class="rex-btn" data-save="retry">重试保存</button> <button class="rex-btn" data-save="reset">确认新开</button>'+
        '<p>读档恢复游戏快照，旧聊天消息仍在。</p>'+e.slots.map(function(s){return '<div><b>'+esc(s.name)+'</b><p>'+esc(new Date(s.ts).toLocaleString())+' · '+esc(s.summary)+'</p><button class="rex-btn" data-load="'+esc(s.id)+'">读取</button><button class="rex-btn" data-overwrite="'+esc(s.id)+'">覆盖</button><button class="rex-btn" data-delete="'+esc(s.id)+'">删除</button></div>';}).join('')+
        '<textarea class="rex-input rex-confirm-draft" placeholder="确认行动；续档上下文仅随此次发送"></textarea><button class="rex-btn" data-save="send">确认发送</button></div>';
    },
    after:function(self,box){
      box.addEventListener('click',function(e){
        var b=e.target.closest('button');if(!b)return;
        var action=b.getAttribute('data-save'),id=b.getAttribute('data-load'),overwrite=b.getAttribute('data-overwrite'),del=b.getAttribute('data-delete');
        if(id)R.loadSlot(id);
        else if(del&&window.confirm('删除此手动存档？'))R.deleteSlot(del,true).then(function(){R.refresh();});
        else if(overwrite&&window.confirm('覆盖此手动存档？')){var old=R.storageEnvelope().slots.find(function(s){return s.id===overwrite;});R.saveSlot(old.name,overwrite).then(function(){R.refresh();});}
        else if(action==='new'){var name=window.prompt('存档名称');if(name)R.saveSlot(name).then(function(ok){if(!ok)R.toast('未保存，请检查错误或槽位上限');R.refresh();});}
        else if(action==='retry')R.retrySave().then(function(){R.refresh();});
        else if(action==='reset'&&window.confirm('原档将被替换，确定新开？'))R.reset(true).then(function(){R.refresh();});
        else if(action==='send'){
          var input=box.querySelector('.rex-confirm-draft'),text=input.value;
          b.disabled=true;R.confirmSend(text).then(function(ok){if(ok)input.value='';b.disabled=false;});
        }
      });
    }
  });
})();
