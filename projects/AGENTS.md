# 项目概述
- **名称**: 视频字幕提取工作流
- **功能**: 根据视频链接自动提取字幕文件

## 节点清单
| 节点名 | 文件位置 | 类型 | 功能描述 | 分支逻辑 | 配置文件 |
|-------|---------|------|---------|---------|---------|
| extract_subtitle | `nodes/extract_subtitle_node.py` | task | 从视频中提取字幕文件 | - | - |

**类型说明**: task(任务节点) / agent(大模型节点) / condition(条件分支) / looparray(列表循环) / loopcond(条件循环)

## 工作流流程
```
视频URL输入 → 字幕提取 → 输出结果
```

## 子图清单
无

## 技能使用
- 节点 `extract_subtitle` 使用 video-edit 技能

## 输入输出说明
### 输入
- `video_url`: 视频链接（支持常见视频格式）

### 输出
- `subtitle_url`: 字幕文件下载URL
- `subtitle_text`: 字幕文本内容

## 使用示例
```python
from graphs.graph import main_graph

# 执行工作流
result = main_graph.invoke({
    "video_url": "https://example.com/video.mp4"
})

print(f"字幕文件: {result['subtitle_url']}")
print(f"字幕内容: {result['subtitle_text']}")
```
