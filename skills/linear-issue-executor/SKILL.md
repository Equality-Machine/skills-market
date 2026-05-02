---
name: linear-issue-executor
description: Execute an Efflora Linear issue end to end through the `linear` CLI and the local repo workflow after the user explicitly instructs work on a specific issue such as AS-123. Use when Codex needs to autonomously carry an issue from readiness check through implementation, verification, PR creation, independent review, acceptance evaluation, and handoff to `inreview`. Do not use for backlog planning, issue creation without execution intent, or unattended polling.
---

# Dev: Issue Execution Skill

基于 Symphony 模式，自主完成 Linear issue 从实现到进入 `inreview` 的完整闭环。

Read [references/efflora-linear-execution.md](references/efflora-linear-execution.md) when you need the detailed phase rules, comment templates, proof format, commit template, review handoff rules, or rework limits.

直接使用已安装的 Linear 插件和其相关能力处理 Linear 侧的读取、分析、更新和评论写入。本 skill 负责从 Ready 检查开始直到创建 PR、完成独立 review、完成验收评估、同步到 `inreview` 的全流程执行。

默认把自己当作 orchestration skill 使用：主会话负责状态推进、事实重建、工件落盘、Linear 更新，并在执行本 issue 的整个生命周期内自动用 `spawn_agent` 为 review、evaluation 启动独立 agent。若用户明确要求自动委派实现阶段，也自动为实现阶段启动独立 agent。

## Linear Comment Formatting Rules

所有写入 Linear 的评论都必须使用原生多行 Markdown，不能把评论正文当作单行字符串拼接。

硬性要求：

- 禁止在最终评论正文中出现字面量转义换行符，例如 `\n`、`\t`。
- 必须写真实换行，不要把整段 Markdown 序列化成 JSON 风格字符串。
- 标题、段落、列表、表格之间都要保留空行。
- Markdown 表格前后都必须有空行。
- 表格分隔线必须单独成行，不能和上一行或下一行粘连。
- 如果某个字段内容过长，不要塞进表格单元格；改成表格外的 bullets。
- 命令列表、长输出、长 diff 摘要使用 bullets，不要塞进单个表格单元格。

推荐做法：

- 先在本地构造完整的多行评论块，再一次性写入 Linear。
- 优先使用 here-doc 或等价的多行正文构造方式。
- 写完后先自检：表格是否每行独立、是否存在字面量 `\n`、是否有空行分隔。

失败示例：

- `结论: PASS\\n\\nValidation Summary\\n| 维度 | 状态 | ...`
- 在同一行里混入标题、正文、表格分隔线

正确示例：

```text
结论: PASS

Validation Summary

| 维度 | 状态 | 证据 | 说明 |
|------|------|------|------|
| AC 覆盖度 | PASS | ... | ... |
```

## Orchestration Rules

当用户显式使用本 skill 执行某个 issue 时，视为已经授权本次 issue 生命周期内的自动委派：

- `review` 自动委派
- `evaluation` 自动委派
- `rework` 后的后续 `review` / `evaluation` 自动委派

如果用户还明确要求“自动委派实现”或同义表达，则实现阶段也自动委派给独立 agent。

不需要在每个 phase 进入前再次征求确认。只有遇到阻断、需求冲突、高风险决策、新增外部依赖、超过 3 轮 rework、或 evaluate FAIL 需要人工判断时，才停下来询问 `ykn`。

主会话永远负责：

- 识别当前 phase
- 读取 Linear 和仓库事实
- 写入 Workpad、Progress Update、Completion Proof、`[CODE-REVIEW]`、`[EVALUATION]`
- 推进 issue 状态
- 决定下一步启动哪个 agent

不要把整个端到端流程一次性交给单个子 agent。子 agent 必须只负责一个 phase 的封闭任务。

推荐 agent 分工：

- 实现阶段：`worker`
- review 阶段：`default`
- evaluation 阶段：`default`

除非用户明确要求并行，否则实现、review、evaluation 按 phase 串行。

不要把主路径上“马上就要用到结果”的关键事实发现委派出去再空等。主会话应先完成 Ready Check、REQ Review、Workpad、PR / diff 上下文准备，再启动 review 或 evaluation agent。

## Trigger Model

仅在用户有明确执行意图时触发，例如：

- `执行 AS-123`
- `执行 AS-123，自动委派`
- `执行 AS-123，自动委派 review 和 evaluation`
- `执行 AS-123，自动委派 implement review evaluation`
- `把 AS-123 做了`
- `做一下 AS-123`
- `继续处理 AS-123`
- `继续 AS-123 的 rework`
- `开发 AS-123`
- `实现 AS-123`

以下场景不触发：

- `看看 AS-123`
- `AS-123 是什么`
- 仅提及 issue ID，但没有明确执行/开发意图
- 创建 issue、整理 backlog、澄清需求等非执行工作

## Preconditions

执行前必须确认：

1. 目标 issue ID 明确。
2. 本地仓库映射明确，优先读取 `/Users/ykn/.dorabot/workspace/MEMORY.md`。
3. 依赖、需求缺口、评论上下文已经通过 Linear 插件和 Linear 当前内容分析清楚。

当前已知仓库映射：

- `Web Agent Core Engine` -> `/Users/ykn/Documents/code/web_lumina`

如果项目属于其他仓库，先从 `/Users/ykn/.dorabot/workspace/MEMORY.md` 查找；仍不明确时停止并询问 `ykn`，不要猜。

## Git And Workspace Rules

- 分支名：`as-xxx-<短描述>`，全小写，单词用 `-` 连接。
- worktree 路径：`<repo_root>/.worktrees/AS-xxx`
- 默认基线：`origin/main`
- PR 合并方式：squash merge
- Rework 使用同一个 worktree、同一个分支，新增 commit，不 amend 已推送 commit。

## Commit Standard

所有 commit 文案使用中文，只有类型前缀保留英文：

```text
<type>: <简短标题，<70 字符>

<正文: what + why>

文件清单:
- path/to/file: 说明

Refs: AS-xxx
Co-Authored-By: zhoykn <zhoykn@efflora.ai>
```

允许的类型：

- `feat`
- `fix`
- `refactor`
- `test`
- `docs`
- `chore`
- `perf`

## Execution Phases

### Phase 0: Ready Check

先执行：

```bash
linear i get AS-xxx --format full
linear deps AS-xxx
```

并检查 6 项门禁：

1. Goal: 目标能否一句话说清。
2. Scope: 包含和不包含边界是否明确。
3. Acceptance: 验收标准是否可测试。
4. Deps: 前置依赖是否全部 `Done`。
5. Repo: 仓库映射是否明确。
6. Risk: 权限、环境、服务是否可访问。

全部通过后，先向用户发送开工 check in：

```text
AS-xxx 准备开工
- 目标: <一句话>
- 依赖: 已完成 / 未完成
- 验收标准: <N> 条，明确
- 风险: <无 / 简述>
- 建议: 可开工
```

存在阻断时，先向用户发送阻断 check in，等待用户决策：

```text
AS-xxx 当前阻断
- 卡点: <现象>
- 原因: <为什么不能自行决定>
- 需要你决定: <一个问题>
```

以下情况必须阻断：

- 依赖未完成
- issue 中有 `[待补充]`、`[待确认]`、`[Need sync with ykn: ...]`
- 验收标准缺失、冲突或不可验证
- 仓库映射不明确
- 所需服务、权限、凭证不可用
- 发现 issue 描述错误且无法自行收敛

### Phase 0.5: REQ Review

Ready Check 通过后，在建立 Workpad 前，对需求本身做一次轻量审查，避免带着模糊需求进入实现。

检查四项：

1. AC 可测试：每条验收标准都能用具体命令、断言、测试名或可观察结果验证。
2. 边界清晰：包含和不包含划分明确，不会在实现时产生歧义。
3. 依赖接口已知：前置依赖的输出格式、接口、契约已确认，不需要猜。
4. 验证方式可执行：issue 中给出的验证命令在当前环境可以运行，或至少能明确替换为当前仓库真实命令。

全部通过后，继续 Phase 1。

发现歧义时：

1. 在 Linear 留评论说明问题。
2. 向用户发送阻断 check in。
3. 等待 `ykn` 澄清后再继续。

评论格式：

```text
[REQ-REVIEW] 发现歧义，需要澄清

- 问题 1: <具体歧义>
- 问题 2: <具体歧义>

建议补充到 issue description 后继续实现。
```

### Phase 1: Workpad Setup

用户授权开工后执行：

1. 创建 worktree 和分支：

```bash
cd <repo_root>
git fetch origin main
git worktree add .worktrees/AS-xxx -b as-xxx-<short-desc> origin/main
cd .worktrees/AS-xxx
```

2. 更新 issue 到 `In Progress`：

```bash
linear i update AS-xxx --state "In Progress"
```

3. 发布 `Workpad` 评论，内容必须包含：

- `hostname:worktree_path@base_commit_short`
- 具体的 Plan 步骤，不能写成笼统描述
- 从 issue description 原样搬入的 Acceptance Criteria
- Validation 清单，写明预期执行的 build/test/lint 命令
- Notes，记录开始执行的时间点

Workpad 结构：

```text
Workpad
<hostname>:<worktree_path>@<base_commit_short>

Plan
- [ ] 1. <阅读现有代码，理解接口和风格>
- [ ] 2. <实现功能 A>
- [ ] 3. <实现功能 B>
- [ ] 4. <编写测试>
- [ ] 5. <运行验证 (build + test + lint)>

Acceptance Criteria
- [ ] <验收标准 1>
- [ ] <验收标准 2>

Validation
- [ ] `<build cmd>` passes
- [ ] `<test cmd>` passes
- [ ] `<lint cmd>` passes

Notes
- <日期时间>: ticket 切换到 In Progress，开始执行。
```

### Phase 2: Research And Implementation

#### 2.1 调研

先读代码再改代码。必须理解：

- 项目结构
- 相关模块和接口
- 代码风格
- 测试组织方式
- 与 issue 相关的上下游边界

#### 2.2 Progress Update

调研完成后发布 `Progress Update 1` 评论，包含：

- 已完成的调研和分析
- 关键结论及其对方案的影响
- 细化后的具体执行步骤

格式：

```text
Progress Update 1
- 已完成: <调研和分析内容>
- 结论: <关键发现，对方案的影响>
- 细化计划:
  - [ ] <具体步骤 1>
  - [ ] <具体步骤 2>
```

如果调研发现 issue 描述有误、范围不稳、验收标准与代码现实冲突，立刻在 Progress Update 中说明并进入阻断 check in，不继续编码。

#### 2.3 编码

编码规则：

- 严格按验收标准实现
- 不越界修改无关问题
- 测试与代码同步编写
- 增量验证，写一部分跑一部分

默认可自行决策的内容：

- 验收标准范围内的实现细节
- 常规测试修复
- 小范围重构
- 沿用现有模式的技术选择

必须升级给用户的内容：

- 需求冲突或范围变化
- 高风险架构决策
- 需要引入新的外部依赖
- issue 描述错误

### Phase 3: Verification, Commit, Push, And PR

先做本地验证。根据技术栈选择真实命令，例如：

```bash
# Python
python3 -m pytest tests/ -v
python3 -c "import <package>"

# Node.js
pnpm build && pnpm test && pnpm lint
```

要求：

- 所有验收标准逐条验证
- 记录实际执行的命令和退出码
- 不允许没有证据就声称完成

验证通过后：

1. `git add` 具体文件。
2. 按规范创建中文 commit。
3. `git push -u origin as-xxx-<short-desc>`。
4. 创建 PR，目标分支为 `main`，标题使用 `<type>: <标题>`，正文至少包含 `Summary`、`Refs: AS-xxx`、`Test plan`。
5. 发布 `Completion Proof` 评论，必须包含：
   - Local Validation 表格
   - PR 链接和编号
   - 分支名
   - 变更文件数、增删统计
   - HEAD commit
   - working tree 是否 clean
   - Acceptance Criteria Status，逐条标记 `[x]`

### Phase 4: Independent Review

Completion Proof 写完后，必须进行一次独立代码审核。目标是模拟一个不知道实现细节的 reviewer，而不是作者自查。

Independent Review 必须使用独立 subagent。执行本 skill 时，review 默认自动委派。若当前环境不支持 subagent，流程在此阻断，等待 `ykn` 决定是否切换到支持委派的环境继续执行。

review agent 必须：

- 实际读取 issue 描述、评论、PR diff、关键代码和测试
- Finding 精确到 `文件:行号`
- 给出实际值、风险和期望值
- 结论只能是 `APPROVED` 或 `REWORK REQUIRED`
- 多轮时逐条追踪上轮 findings 的修复状态

Review 只回答“这份实现从工程和代码质量角度是否可进入人工 review / merge 决策”，不替代验收测试，不负责给 AC 判定 PASS。

Review 不应重复输出：

- “所有 AC 已通过”这类验收结论
- 逐条 AC 的 PASS / FAIL
- 只基于代码阅读推断出的运行结果

#### Review 维度架构

Review 必须按下面 6 个维度给出结构化结果，并且每个维度都要有证据来源：

1. 正确性：实现是否与 issue 目标、接口契约、关键业务逻辑一致。
2. 范围控制：是否越界修改、是否遗漏必须改动、是否把不该做的事混进来。
3. 架构与可维护性：是否符合项目既有模式，是否引入未来难以维护的结构。
4. 测试充分性：测试是否覆盖主要路径、边界条件、失败路径，是否存在“实现变了但测试没兜住”的风险。
5. 安全与鲁棒性：权限、输入校验、错误处理、敏感信息、失败模式是否合理。
6. 性能与依赖：是否引入不必要的开销、同步阻塞、额外依赖、脆弱外部耦合。

#### Review 证据要求

每个维度都必须引用至少一种具体证据，证据只能来自：

- `git diff` / PR diff
- 具体文件与行号
- 测试文件与测试名
- issue description / Workpad / Completion Proof 中的事实
- 实际命令输出摘要

禁止只写“看起来没问题”“符合预期”这类无证据结论。

建议给 review pass 的任务：

```text
对 AS-xxx 进行代码审核，这是第 <N> 轮。
PR 号: #<N>，仓库: <repo_path>。

所有上下文已记录在 Linear issue 评论中，自行读取：
- linear i get AS-xxx --format full
- linear i comments AS-xxx

审核完成后输出 [CODE-REVIEW] 结论。
```

调用建议：

- 使用 `spawn_agent(agent_type="default", model="gpt-5.4", reasoning_effort="high", fork_context=false)`
- 不要把作者推理过程一并传给 review agent
- 只传 issue ID、仓库路径、PR 编号、必要的原始入口
- review agent 完成后，由主会话读取其结果并负责把最终评论写回 Linear

#### Review 输出

`[CODE-REVIEW]` 评论必须包含：

- Round 编号
- 结论：`APPROVED` 或 `REWORK REQUIRED`
- `Review Scope`：本轮实际审查了哪些 diff、文件、测试、命令输出
- `Dimension Scorecard`
- Findings 列表，区分严重级别
- `Merge Risk Summary`

推荐格式：

```text
[CODE-REVIEW]
代码审核: AS-xxx（Round <N>）

结论: APPROVED | REWORK REQUIRED

Review Scope
- Diff: <base>...<head>
- Files reviewed: <N>
- Tests inspected: <list>
- Validation evidence used: <commands / outputs>

Dimension Scorecard

| 维度 | 权重 | 分数 | 证据 | 结论 |
|------|------|------|------|------|
| 正确性 | 25% | x/10 | <文件:行号 / 测试名> | <一句话> |
| 范围控制 | 15% | x/10 | <diff / issue AC> | <一句话> |
| 架构与可维护性 | 15% | x/10 | <文件:行号> | <一句话> |
| 测试充分性 | 20% | x/10 | <测试名 / 缺口> | <一句话> |
| 安全与鲁棒性 | 15% | x/10 | <代码路径 / error path> | <一句话> |
| 性能与依赖 | 10% | x/10 | <调用路径 / dependency> | <一句话> |

Findings
- [HIGH] <文件:行号> <问题> | 风险: <...> | 建议: <...>
- [MEDIUM] <文件:行号> <问题> | 风险: <...> | 建议: <...>
- [LOW] <文件:行号> <问题> | 风险: <...> | 建议: <...>

Merge Risk Summary
- Blocking findings: <count>
- Non-blocking findings: <count>
- Main reason for conclusion: <一句话>
```

渲染约束：

- `Validation evidence used` 如果命令较长，改成多条 bullets，不要塞进单行。
- `Dimension Scorecard` 前必须保留一个空行。
- 表格中的“证据”列只放短引用，例如 `src/foo.py:12`、`test_xxx`；长解释移到表格后的 bullets。

评分不是为了给出“好不好看”的总分，而是为了强制 reviewer 按维度举证。若某维度无法给出证据，必须标记为 `Insufficient Evidence`，不得硬打分。

`APPROVED` 后进入 Phase 6。

`REWORK REQUIRED` 后进入 Phase 5。

### Phase 5: Rework

每一轮 rework 都需要：

1. 发布 `Rework Round <N>` 评论，包含：
   - `hostname:worktree_path@current_commit_short`
   - 本轮修改项 checklist
   - 验证项
   - Notes，记录已读取 review comment
2. 从最新 `[CODE-REVIEW]` 评论提取所有 HIGH 和未降级的 MEDIUM findings，逐条修复。
3. 在同一 worktree、同一分支上修改。
4. 重跑受影响的验证。
5. 新建 commit，不能 amend。
6. push 到同一分支。
7. 发布 `Completion Proof (Rework Round <N>)` 评论。
8. 回到 Phase 4，重新执行独立 review。

Rework 评论格式：

```text
Rework Round <N>
<hostname>:<worktree_path>@<current_commit_short>

- [ ] <修改项 1>（来自 [CODE-REVIEW] HIGH finding）
- [ ] <修改项 2>（来自 [CODE-REVIEW] MEDIUM finding）
- [ ] 验证: <build/test/lint>

Notes
- <日期时间>: 已读取 Round <N> [CODE-REVIEW]，确认本轮 rework 目标。
```

最多允许 3 轮 rework。超过 3 轮必须向用户发送阻断 check in，请求决策。

### Phase 6: Independent Evaluation

Review `APPROVED` 后，必须进行一次独立验收测试。目标是验证验收标准，而不是重复代码审查。

Independent Evaluation 必须使用独立 subagent。执行本 skill 时，evaluation 默认自动委派。若当前环境不支持 subagent，流程在此阻断，等待 `ykn` 决定是否切换到支持委派的环境继续执行。

evaluate pass 必须：

- 实际运行 issue description 或当前仓库定义的验证命令
- 实际执行测试套件
- 对每条 AC 标注验证方法、命令输出、测试名或代码路径
- 复用 `[CODE-REVIEW]` 结论作为代码质量输入，不重复做一轮代码审查

Evaluation 只回答“这份实现是否满足 issue 的验收标准，并且证据是否足以支持上线前的人类判断”，不重复输出代码风格或架构意见。

Evaluation 不应重复输出：

- 大段代码风格评论
- 与 merge 风险无关的架构偏好
- 没有运行证据支撑的实现正确性结论

#### Evaluation 维度架构

Evaluation 必须按下面 5 个维度给出结构化结果：

1. AC 覆盖度：每条验收标准是否都有明确验证路径。
2. 证据质量：每条 AC 的证据是否来自真实命令、真实输出、真实测试，而不是推断。
3. 环境与数据可信度：验证环境、测试数据、mock 条件是否足以支持结论。
4. 回归信心：全量或受影响测试、构建、lint、关键 smoke path 是否提供了足够回归信心。
5. 剩余风险：仍未验证的边界、异步行为、外部依赖、人工验证项是否被显式记录。

#### Evaluation 证据要求

每条 AC 必须至少绑定一条可审计证据：

- 命令
- 退出码
- 关键输出摘要
- 测试名
- 如无自动化证据，则必须记录为人工验证或证据缺失，不能判 PASS

禁止出现“代码里实现了所以算 PASS”这种推断式结论。

建议给 evaluate pass 的任务：

```text
对 AS-xxx 进行验收测试。
PR 号: #<N>，仓库: <repo_path>。

所有上下文已记录在 Linear issue 评论中，自行读取：
- linear i get AS-xxx --format full
- linear i comments AS-xxx

验收完成后输出 [EVALUATION] 结论。
```

调用建议：

- 使用 `spawn_agent(agent_type="default", model="gpt-5.4", reasoning_effort="high", fork_context=false)`
- 只传 issue ID、仓库路径、PR 编号、验证入口，不传作者结论摘要
- evaluate agent 完成后，由主会话读取结果并负责写回 Linear

#### Evaluation 输出

`[EVALUATION]` 评论必须包含：

- PASS 或 FAIL
- `Evaluation Scope`
- `Validation Summary`
- `AC Verification Matrix`
- `Residual Risks`
- 建议下一步

推荐格式：

```text
[EVALUATION]
验收测试: AS-xxx（Round <N>）

结论: PASS | FAIL

Evaluation Scope
- Environment: <local / CI / staging>
- Commit / Branch: <sha / branch>
- Commands run: <list>

Validation Summary

| 维度 | 状态 | 证据 | 说明 |
|------|------|------|------|
| AC 覆盖度 | PASS/FAIL | <AC 数量与覆盖情况> | <一句话> |
| 证据质量 | PASS/FAIL | <命令 / 输出 / 测试> | <一句话> |
| 环境与数据可信度 | PASS/FAIL | <env / fixtures / mocks> | <一句话> |
| 回归信心 | PASS/FAIL | <build / test / lint / smoke> | <一句话> |
| 剩余风险 | PASS/FAIL | <未覆盖项> | <一句话> |

AC Verification Matrix

| AC | 方法 | 证据 | 结果 | 备注 |
|----|------|------|------|------|
| AC-1 <摘要> | <test / curl / manual / log> | <测试名 / 输出摘要> | PASS/FAIL | <一句话> |
| AC-2 <摘要> | <...> | <...> | PASS/FAIL | <...> |

Residual Risks
- <未覆盖边界 1>
- <异步 / 外部依赖 / 需人工确认项>

Next Step
- <是否可进入 inreview，或需要人工介入什么>
```

渲染约束：

- `Commands run` 必须写成 bullets，不要写成一个超长逗号拼接行。
- `Validation Summary` 和 `AC Verification Matrix` 前都必须有空行。
- `AC Verification Matrix` 的“证据”列只放短证据名；命令全文和输出摘要放到表格后的 `Evidence Notes` bullets。
- 如果 AC 很长，表格里的 `AC` 列只写短摘要，完整原文放到表格外引用或 bullets。

推荐补充段落：

```text
Evidence Notes
- `conda run -n web_lumina python -m pytest tests/test_agent.py -q -k '...'` -> exit 0
- `conda run -n web_lumina python -m compileall src tests` -> exit 0
```

如果某条 AC 没有可审计证据，结果必须是 `FAIL` 或 `BLOCKED`，不得为了整体结论好看而记为 PASS。

无论 PASS 还是 FAIL，流水线都进入 Phase 7，不自动 rework。

### Phase 7: Sync Status And Notify

无论 evaluate 结论是 PASS 还是 FAIL，流水线都在此结束。执行两步：

1. 更新 Linear 状态为 `inreview`
2. 通知 `ykn`

PASS 通知格式：

```text
AS-xxx 流水线完成，状态已切到 inreview，等待你确认合并

- PR: #<N> <url>
- Review: APPROVED（Round <N>）
- Evaluate: PASS，<M>/<M> AC 通过
- 可以合并
```

FAIL 通知格式：

```text
AS-xxx Evaluate FAIL，状态已切到 inreview，需要你介入

- PR: #<N> <url>
- Review: APPROVED（Round <N>）
- Evaluate: FAIL，失败 AC: <列出>
- 建议: <evaluate 评论中的说明>
- 请决定下一步
```

不自动 rework，不合并 PR，不更新 issue 状态为 `Done`。合并和 `Done` 由 `ykn` 手动操作。

## Quality Gates

通知 `ykn` 前必须全部满足：

- 测试全部通过
- 构建无报错
- 验收标准逐条标注并有验证结果
- Commit 格式合规，且带 `Refs`
- Completion Proof 已写入 Linear
- `[CODE-REVIEW]` 已完成并有明确结论
- `[EVALUATION]` 已完成，PASS 或 FAIL 均可，由 `ykn` 决策
- 改动未超出 issue 范围
- issue 最终状态只能更新为 `inreview`，不得由本 skill 直接推进到 `Done`
- 不得由本 skill 直接执行 PR merge、删除远端分支或清理用于 rework 的 worktree

## Resume Rules

当用户说“继续处理 AS-xxx”时：

1. `linear i get AS-xxx --format full` 读取当前状态和所有评论。
2. 从最后一条评论判断当前处于哪个 Phase：
   - 最新评论是 `[REQ-REVIEW]` 歧义阻断 -> 等 `ykn` 澄清，澄清后进入 Phase 1
   - 最新评论是 `Workpad` -> 进入 Phase 2
   - 最新评论是 `Progress Update` -> 继续 Phase 2
   - 最新评论是 `Completion Proof` -> 进入 Phase 4
   - 最新评论是 `[CODE-REVIEW] REWORK REQUIRED` -> 进入 Phase 5
   - 最新评论是 `[CODE-REVIEW] APPROVED` -> 进入 Phase 6
   - 最新评论是 `[EVALUATION]` 且 issue 状态仍为 `In Progress` -> 进入 Phase 7
   - 最新评论是 `[EVALUATION]` 且 issue 状态已为 `inreview` -> 流水线已完成，等待 `ykn` 手动决策
3. 检查 worktree 是否存在：`ls <repo_root>/.worktrees/AS-xxx`
4. 从中断点继续执行，而不是重复初始化。

## Suggested Spawn Patterns

### Implement Pass

默认由主会话自己实现。只有当用户明确要求“自动委派实现”时，才启动实现 agent。

建议任务：

```text
执行 AS-xxx 的实现阶段。

先读取：
- linear i get AS-xxx --format full
- linear i comments AS-xxx

然后在仓库 <repo_path> 中完成实现、测试、提交、推送、PR 草拟所需的代码工作。
不要写 Linear 评论；把事实结果返回给主会话，由主会话统一写回。
```

调用建议：

- 使用 `spawn_agent(agent_type="worker", model="gpt-5.4", reasoning_effort="high", fork_context=false)`
- 明确仓库路径和 issue ID
- 主会话在 agent 运行期间可以准备 PR 模板、整理 AC 对照、检查 Linear 状态

### Review Pass

建议任务：

```text
对 AS-xxx 做独立代码审核。

只依据以下原始事实重建上下文：
- linear i get AS-xxx --format full
- linear i comments AS-xxx
- 仓库 <repo_path> 当前分支代码
- PR diff / git diff

输出结构化 review findings 和 APPROVED / REWORK REQUIRED 结论，不要直接写 Linear。
```

### Evaluation Pass

建议任务：

```text
对 AS-xxx 做独立验收测试。

只依据以下原始事实重建上下文：
- issue description 中的 AC 和 Validation
- linear i comments AS-xxx
- 仓库 <repo_path> 当前分支代码
- 当前工作树可运行的测试与验证命令

逐条验证 AC，输出 PASS / FAIL 及证据，不要直接写 Linear。
```

## Batch Execution

当用户要求批量执行多个 issue 时：

1. 每个 issue 先做 Ready Check。
2. 用 `linear deps` 分析依赖关系。
3. 按拓扑顺序串行执行。
4. 每个 issue 使用独立 worktree。
5. 每完成一个 issue 的独立 review 后向用户汇报一次。
6. 只有用户明确要求时才并行。

## Operating Boundary

- 一次只围绕一个 issue 执行，除非用户明确要求批量。
- 从 Linear 和当前仓库状态重建事实，不只依赖记忆。
- 发现无关问题时记录并告知用户，不要顺手扩大范围。
- 不允许静默跳过门禁、REQ Review、证明、review、evaluation、状态更新任一步。
- 默认目标是停在 `inreview`，等待人工确认合并和后续决策，不得直接完成到 `Done`。
