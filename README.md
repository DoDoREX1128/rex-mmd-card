# rex-mmd-card

MMD角色卡制作技能，版本2.0.0。区分新版沙盒卡、旧版同层卡、旧版原生卡；不处理酒馆。

人设默认自由结构与文风，不强制六块、行长或禁令清单。状态协议统一[status]。Node.js 18+，基础脚本无第三方依赖；本地浏览器回归需Chrome或Edge。

从SKILL.md开始；详细路由见references/00-总览与阅读路径.md。init --route sandbox/native/same选择起点；build --route sandbox/native构建；同层使用pack-samelayer。

验证命令：node scripts/test.mjs；node --test scripts/test-contracts.mjs；node scripts/gen-facts.mjs --check。e2e读取正式--card，未找到浏览器明确NOT RUN。真实MMD与实体设备验证另记，不以本地通过代替。

默认新版包含白名单状态解析、版本化自动/手动槽、可见保存失败与重试、续档和生命周期清理。身体档案是可选kit。同层基座是少量基础动作起点，并未实现参考上游全部61项。

安装可使用scripts/install.mjs；分发使用scripts/pack-skill.mjs。已有稿件与用户自定义格式优先，生成文件与线上导入/保存/公开发布按各自授权和证据区分。
