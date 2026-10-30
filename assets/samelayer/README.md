# 旧版同层最小基座

host.js是旧版DOM适配与Host-only存储；frame.html是sandbox=allow-scripts隔离页面。首次向特定Frame发送MessagePort，Frame核验parent来源，后续通过专用port和session通信。Frame没有父DOM与父存储权限。

已实现基础动作：snapshot、setInput、send、openPersona、openMore、fillDialog、confirmDialog、capabilities、storage.get、storage.set、returnNative。编辑/删除/回溯明确未实现。参考上游61项不是本基座数量；capabilities返回当前可用性，真实MMD均需项目验收。

返回MMD让同层隐藏，独立返回同层按钮保留；打开原生人设/更多时让位。离开hash路由与pagehide销毁。不同原生草稿不覆盖，发送不自动重试；“已触发”不表示回复完成或服务器保存。

存档需Host提供经验证的window.REXHUDSCOPE()或配置scope，accountKey/roleId/conversationKey必须齐全；缺失返回verified-scope-required。不要复制固定示例scope到生产。Frame只接公开结果，不接凭据。

选择器可通过REXHUDCONFIG.selectors按目标覆盖，allowedActions可缩小作品动作集。新增功能实现处理器、能力投影、UI与验收，再宣称支持。

运行pack-samelayer --host assets/samelayer/host.js --frame assets/samelayer/frame.html --out work/out --name demo，生成旧版四键/id=-1与manifest。preview-samelayer本地壳与正式包行为都要验证；本地通过不代表平台兼容。


## 文件与启动顺序

Host在旧版页面内适配消息、输入与原生面板；Frame是独立界面。默认打包器把所有独立标记放进beginning，执行顺序为载荷初始化/Host片/Frame片/launcher；Host创建隔离iframe，定向传MessagePort，Frame核验parent后握手，后续通过专用port与session请求，不再按旧稿使用全局任意来源invoke。

## 扩展一个动作

1. 先在目标旧页观察按钮、弹层和完成信号，记录可靠选择器；没有第二个可靠候选就只用一个。
2. 在Host动作处理器实现，并纳入allowedActions/capabilities；未实现与当前找不到分开返回。
3. Frame增加入口、忙锁、超时和失败文案；原生面板需要让位与返回。
4. 涉及账号数据/提交/删除时按实际任务授权操作，结果未确认不自动重试。
5. 在本地壳点击，核对宿主实际变化；再用正式包重放，并在目标站复验。

## 可重复的本地链路

```bash
node scripts/pack-samelayer.mjs --host assets/samelayer/host.js --frame assets/samelayer/frame.html --out work/same-check --name demo
node scripts/validate.mjs work/same-check/demo-regex.json --platform legacy
node scripts/replay.mjs work/same-check/demo-regex.json --from auto
node scripts/preview-samelayer.mjs --host assets/samelayer/host.js --frame assets/samelayer/frame.html --out work/same-check --name demo
```

浏览器打开本地壳后检查：写草稿不发送、不同草稿受保护、人设/更多面板让位、返回MMD/同层、二次进入、路由退出销毁、无scope不能存、不同scope不串档。生产选择器及scope由Host所在项目配置，不能直接把mock账号标识带进正式卡。详见[同层架构](../../references/22-平台-同层卡架构.md)与[真实目标验收](../../references/54-验收-真实平台测试.md)。
