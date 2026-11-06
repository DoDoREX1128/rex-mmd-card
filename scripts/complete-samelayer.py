"""Instantiate and build the complete old-MMD skeleton. Python standard library only."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile

ASSET = Path(__file__).resolve().parents[1] / 'assets' / 'samelayer-complete'

def initialize_staged(root, content, app_id, title):
    if root.exists():
        raise ValueError('目标目录已存在；完整骨架只初始化新目录，不覆盖已有工程')
    files = {n: (content / n).read_bytes() for n in ['persona.txt', 'worldbook.json']}
    json.loads(files['worldbook.json'])
    opening = ((content / 'opening.txt').read_text('utf-8-sig') if (content / 'opening.txt').exists()
               else json.loads((content / 'regex.json').read_text('utf-8-sig'))['beginning'])
    if len(opening.encode('utf-16-le')) // 2 > 4000:
        raise ValueError('开场白超过 4000 UTF-16 单元')
    for part in ['kit', 'frame']:
        shutil.copytree(ASSET / part, root / '工程' / 'src' / part)
    (root / '工程/src/content').mkdir()
    (root / '工程/src/content/opening.txt').write_text(opening, 'utf-8')
    (root / '交付').mkdir()
    for name, data in files.items():
        (root / '工程/src/content' / name).write_bytes(data)
        (root / '交付' / name).write_bytes(data)
    cfg = dict(appId=app_id, buildId=app_id + '-001', title=title)
    (root / '工程/template.json').write_text(json.dumps(cfg, ensure_ascii=False, indent=2), 'utf-8')
    shutil.copyfile(ASSET / 'source-integrity.json', root / '工程/source-integrity.json')
    (root / '工程/任务记录.md').write_text(
        '# 任务与验收记录\n\n## 错题预检与字段契约\n\n'
        '开始或继续时，读取 rex-mmd-card 的 references/errors/README.md，按旧版同层和本次模块查完整错题；'
        '字段设计读取 references/fields/blueprints.md。实施与交付前回查，不把索引摘要当完整解法。\n\n'
        '| 适用编号 | 本次采用的做法 | 复测结果/未验证项 |\n|---|---|---|\n\n'
        '## 已确定\n\n## 待完成\n\n## 关键决策\n\n## 已验证与未验证\n\n'
        '- 已复制完整骨架与内容；未构建，未进行目标站或实体设备测试。\n', 'utf-8')
    subprocess.run(['node', str(Path(__file__).with_name('complete-samelayer-review.mjs')), str(root)], check=True)

def review(root, mode):
    subprocess.run(['node', str(Path(__file__).with_name('complete-samelayer-review.mjs')), str(root), mode], check=True)

def initialize(root, content, app_id, title):
    if root.exists():
        raise ValueError('目标目录已存在；不会覆盖已有工程')
    subprocess.run(['node', str(Path(__file__).with_name('check-complete-actions.mjs'))], check=True)
    root.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='rex-init-', dir=root.parent) as tmp:
        candidate = Path(tmp) / 'project'
        initialize_staged(candidate, content, app_id, title)
        candidate.rename(root)

def build_staged(root):
    frame = root / '工程/src/frame'
    subprocess.run([sys.executable, str(frame / 'merge.py')], check=True)
    text = (frame / 'frame.html').read_text('utf-8')
    for marker, name in [('/*__FRAME_CSS__*/', 'frame.css'), ('/*__FRAME_JS__*/', 'frame.js')]:
        if text.count(marker) != 1:
            raise ValueError('模板注入点数量异常：' + marker)
        text = text.replace(marker, (frame / name).read_text('utf-8'), 1)
    out = root / '工程/builds'
    out.mkdir(exist_ok=True)
    (out / 'frame.html').write_text(text, 'utf-8', newline='\n')
    kit_names = ['core.js', 'actions.js', 'actions-dom.js', 'actions-handlers.js', 'provided-actions.js',
                 'models.js', 'provided-models.js', 'native.js', 'host.js']
    host = '\n'.join((root / '工程/src/kit' / n).read_text('utf-8-sig') for n in kit_names)
    config = json.loads((root / '工程/template.json').read_text('utf-8'))
    config.update(mode='mock', engine=False, models=True)
    preview_js = host + '\nMmdSameLayerHost.boot(' + json.dumps(config, ensure_ascii=False) + ',' + json.dumps(text, ensure_ascii=False) + ');'
    preview_js = re.sub('</script', r'<\\/script', preview_js, flags=re.I)
    (out / 'preview.html').write_text('<!doctype html><meta charset="utf-8"><title>本地模拟预览</title><body><p>本地模拟，未连接真实 MMD。</p><script>' + preview_js + '</script></body>', 'utf-8')
    shutil.copyfile(frame / 'preview-harness.html', out / '预览.html')
    # 内容源是唯一编辑入口；输出不反向覆盖源。
    for name in ['persona.txt', 'worldbook.json']:
        shutil.copyfile(root / '工程/src/content' / name, root / '交付' / name)
    subprocess.run([sys.executable, str(frame / 'pack.py')], check=True)
    verify(root)

def build(root):
    review(root, 'sync')
    # 完整验证暂存结果后才发布，构建失败不会覆盖上一份交付。
    with tempfile.TemporaryDirectory(prefix='build-', dir=root / '工程') as tmp:
        stage = Path(tmp)
        shutil.copytree(root / '工程/src', stage / '工程/src')
        shutil.copyfile(root / '工程/template.json', stage / '工程/template.json')
        (stage / '交付').mkdir()
        build_staged(stage)
        review(root, 'check')
        for area in ['交付', '工程/builds']:
            target = root / area
            target.mkdir(exist_ok=True)
            for source in (stage / area).iterdir():
                shutil.copyfile(source, target / source.name)
    review(root, 'record')

def verify(root):
    import base64
    import importlib.util
    p = root / '工程/src/frame/lz77.py'
    spec = importlib.util.spec_from_file_location('template_lz', p)
    codec = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(codec)
    card = json.loads((root / '交付/regex.json').read_text('utf-8'))
    assert set(card) == {'pageDepth', 'statusbar', 'beginning', 'regex_scripts'}
    assert len(card['statusbar'].encode('utf-16-le')) // 2 <= 200
    assert len(card['beginning'].encode('utf-16-le')) // 2 <= 4000
    assert len((root / '交付/persona.txt').read_text('utf-8-sig').encode('utf-16-le')) // 2 <= 10000
    rules = card['regex_scripts']
    assert len(rules) <= 130 and all(r['id'] == -1 and set(r) == {'id', 'scriptName', 'findRegex', 'replaceString'} for r in rules)
    assert all(len(r['replaceString'].encode('utf-16-le')) // 2 <= 18000 for r in rules)
    text = card['statusbar']
    for r in rules:
        # 只展开明确的分片令牌，不执行任何载荷或原生动作。
        token = r['findRegex'][1:-2]
        if re.fullmatch(r'【SL\d+】', token):
            text = text.replace(token, r['replaceString'])
    assert not re.search(r'【SL\d+】', text), '链尾令牌未消耗'
    parts = [json.loads(x) for x in re.findall(r'globalThis\.__MMD_SL_PARTS__\["[^"]+"\]\[\d+\]=(\{.*?\});</script>', text, re.S)]
    assert parts and [p['index'] for p in parts] == list(range(len(parts)))
    assert all(hashlib.sha256(p['text'].encode()).hexdigest() == p['hash'] for p in parts)
    payload = codec.decompress(base64.b64decode(''.join(p['text'] for p in parts)))
    man = json.loads((root / '工程/builds/release-manifest.json').read_text('utf-8'))
    assert len(payload) == man['payloadBytes'] and len(parts) == man['chunks']
    for name, digest in man['files'].items():
        assert hashlib.sha256((root / '交付' / name).read_bytes()).hexdigest() == digest
    assert hashlib.sha256(payload).hexdigest() == man['payloadSha256']
    frame = json.loads(re.search(r'window\.SLHTML=(".*?");\n', payload.decode('utf-8'), re.S)[1])
    assert frame == (root / '工程/builds/frame.html').read_text('utf-8')
    print('PASS 四键/限长/分片连续/逐片SHA/完整SHA/Frame逐字节/令牌收敛')

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['init', 'status', 'sync', 'build', 'verify'])
    parser.add_argument('project', type=Path)
    parser.add_argument('--content-dir', type=Path)
    parser.add_argument('--name', default='complete-card')
    parser.add_argument('--title', default='同层角色卡')
    args = parser.parse_args()
    root = args.project.resolve()
    if args.command == 'init':
        if not args.content_dir or not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,39}', args.name):
            parser.error('init 需要 --content-dir 和合法的 --name')
        initialize(root, args.content_dir.resolve(), args.name, args.title)
    elif args.command == 'build':
        build(root)
    elif args.command in ['status', 'sync']:
        review(root, args.command)
    else:
        verify(root)

if __name__ == '__main__':
    main()
