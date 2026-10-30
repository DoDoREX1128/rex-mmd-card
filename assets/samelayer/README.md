# 旧版同层最小基座

host.js是旧版DOM适配与Host-only存储；frame.html是sandbox=allow-scripts隔离页面。首次向特定Frame发送MessagePort，Frame核验parent来源，后续通过专用port和session通信。Frame没有父DOM与父存储权限。

已实现基础动作：snapshot、setInput、send、openPersona、openMore、fillDialog、confirmDialog、capabilities、storage.get、storage.set、returnNative。编辑/删除/回溯明确未实现。参考上游61项不是本基座数量；capabilities返回当前可用性，真实MMD均需项目验收。

返回MMD让同层隐藏，独立返回同层按钮保留；打开原生人设/更多时让位。离开hash路由与pagehide销毁。不同原生草稿不覆盖，发送不自动重试；“已触发”不表示回复完成或服务器保存。

存档需Host提供经验证的window.REXHUDSCOPE()或配置scope，accountKey/roleId/conversationKey必须齐全；缺失返回verified-scope-required。不要复制固定示例scope到生产。Frame只接公开结果，不接凭据。

选择器可通过REXHUDCONFIG.selectors按目标覆盖，allowedActions可缩小作品动作集。新增功能实现处理器、能力投影、UI与验收，再宣称支持。

运行pack-samelayer --host assets/samelayer/host.js --frame assets/samelayer/frame.html --out work/out --name demo，生成旧版四键/id=-1与manifest。preview-samelayer本地壳与正式包行为都要验证；本地通过不代表平台兼容。
