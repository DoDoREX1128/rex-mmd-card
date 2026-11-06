"""Full skeleton portability, preservation, build and failure regression."""
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import subprocess

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('complete', HERE / 'complete-samelayer.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class CompleteSkeleton(unittest.TestCase):
    def content(self, root):
        content=root/'content';content.mkdir()
        (content/'persona.txt').write_text('作者原文', 'utf-8')
        book={'entries':{'7':dict(uid=23,comment='规则',content='原设定',disable=False,constant=True,key='[]',keysecondary='[]',probability='100.00',order=1100,position=1,depth=4,role=0,customFlag='retain')}}
        (content/'worldbook.json').write_text(json.dumps(book,ensure_ascii=False),'utf-8')
        (content/'opening.txt').write_text('开场', 'utf-8')
        return content

    def test_review_roundtrip_and_conflicts_preserve_metadata_and_sources(self):
        with tempfile.TemporaryDirectory(prefix='rex-review-') as tmp:
            root=Path(tmp);content=self.content(root);project=root/'project'
            module.initialize(project, content, 'review-card', '审阅回归')
            review=project/'交付/03-世界书审阅.md'
            persona=project/'交付/01-人设审阅.txt'
            original=(project/'工程/src/content/persona.txt').read_bytes()
            persona.write_text('作者亲修', 'utf-8')
            clean=review.read_text('utf-8').replace('原设定','作者新设定')
            review.write_text(clean+'\n这里还有待处理意见', 'utf-8')
            with self.assertRaises(subprocess.CalledProcessError): module.review(project, 'sync')
            self.assertEqual((project/'工程/src/content/persona.txt').read_bytes(),original)
            review.write_text(clean,'utf-8');module.review(project,'sync')
            book=json.loads((project/'工程/src/content/worldbook.json').read_text('utf-8'))
            self.assertEqual(book['entries']['7']['uid'],23)
            self.assertEqual(book['entries']['7']['customFlag'],'retain')
            self.assertEqual(book['entries']['7']['content'],'作者新设定')
            self.assertEqual((project/'工程/src/content/persona.txt').read_text('utf-8'),'作者亲修')
            persona.write_text('审阅双改','utf-8');(project/'工程/src/content/persona.txt').write_text('源双改','utf-8')
            with self.assertRaises(subprocess.CalledProcessError): module.review(project,'sync')
            self.assertEqual(persona.read_text('utf-8'),'审阅双改')

    def test_invalid_initialization_leaves_no_partial_project(self):
        with tempfile.TemporaryDirectory(prefix='rex-invalid-') as tmp:
            root=Path(tmp);content=self.content(root)
            (content/'worldbook.json').write_text('{"entries":[]}', 'utf-8')
            with self.assertRaises(subprocess.CalledProcessError): module.initialize(root/'project',content,'test','test')
            self.assertFalse((root/'project').exists())

    def test_frozen_runtime_and_action_inventory(self):
        manifest = json.loads((module.ASSET / 'source-integrity.json').read_text('utf-8'))
        for name, digest in manifest['files'].items():
            self.assertEqual(hashlib.sha256((module.ASSET / name).read_bytes()).hexdigest(), digest, name)
        actions = json.loads((module.ASSET / 'native-actions.json').read_text('utf-8'))['uniqueActions']
        self.assertEqual(len(actions), 70)
        self.assertTrue({'openEditMessage', 'submitEditMessage', 'activateMoreMenuItem', 'submitImageGen', 'submitPersona'}.issubset(actions))
        catalog=json.loads((module.ASSET/'native-actions.json').read_text('utf-8'))
        self.assertEqual(len(catalog['allActions']),81)
        self.assertEqual(len(catalog['modelActions']),8)
        self.assertTrue({'tapNative','fillNative','sendMessage'}.issubset(catalog['allActions']))
        self.assertIn('snapshot.now',catalog['hostMethods'])

    def test_portable_full_build_and_failed_build_retains_delivery(self):
        with tempfile.TemporaryDirectory(prefix='rex-complete-') as tmp:
            root = Path(tmp)
            content = root / 'content'; content.mkdir()
            (content / 'persona.txt').write_bytes('保留作者稿\r\n自定义结构。'.encode())
            book = {'entries': {}}
            (content / 'worldbook.json').write_text(json.dumps(book), 'utf-8')
            (content / 'opening.txt').write_text('测试开场。', 'utf-8')
            project = root / 'project'
            module.initialize(project, content, 'portable-card', '测试卡')
            self.assertEqual((project / '交付/persona.txt').read_bytes(), (content / 'persona.txt').read_bytes())
            self.assertEqual(len(list((project / '交付').iterdir())), 6)  # regex 仅构建成功后生成
            module.build(project)
            first = (project / '交付/regex.json').read_bytes()
            module.build(project)
            self.assertEqual(first, (project / '交付/regex.json').read_bytes())
            (project / '工程/src/frame/frame.html').write_text('注入点缺失', 'utf-8')
            with self.assertRaises(ValueError): module.build(project)
            self.assertEqual(first, (project / '交付/regex.json').read_bytes())
            with self.assertRaises(ValueError): module.initialize(project, content, 'x', 'x')

if __name__ == '__main__':
    unittest.main()
