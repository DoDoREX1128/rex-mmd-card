import io, os
base = os.path.dirname(os.path.abspath(__file__))
def rd(f):
    return open(os.path.join(base, f), encoding='utf-8').read()

# 平台侧 Frame 模块（原生功能面板 / 模型控件 / 配置）——必须在主逻辑之前
head = ''
for f in ['frame-ui-config.js', 'frame-models.js', 'frame-panels.js', 'frame-features.js']:
    head += rd(f) + '\n'

# 地图 / 人体等大块数据与渲染，注入主逻辑的 IIFE 内
pre = ''
for f in ['map-data.js', 'frame-mapsvg.js', 'frame-map.js', 'frame-body-data.js', 'frame-body.js']:
    pre += rd(f) + '\n'

main = rd('frame-main.js')
assert '/*__MAP_PRE__*/' in main
out = head + main.replace('/*__MAP_PRE__*/', pre, 1)
# 封面与捏人（Shadow DOM 隔离，放最后，不影响主逻辑时序）
out += '\n' + rd('frame-creation.js')
open(os.path.join(base, 'frame.js'), 'w', encoding='utf-8', newline='\n').write(out)
print('merged frame.js', len(out), 'chars')
